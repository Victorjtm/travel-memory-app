// Importar las dependencias
const fs = require('fs');
const ExifParser = require('exif-parser');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const { exiftool } = require('exiftool-vendored');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

// Crear una instancia de la aplicación Express
const app = express();

// ...después de const app = express(); y antes de app.use(express.static(...))
app.use((req, res, next) => {
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self' https://www.gstatic.com https://fonts.googleapis.com https://translate.googleapis.com; " +
  "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://translate.googleapis.com; " +
  "style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com https://translate.googleapis.com; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "connect-src 'self' http://192.168.1.22:3000 https://b7c3-91-250-184-176.ngrok-free.app; " +
  "frame-src 'self'"
);
  next();
});

// ...elección del puerto
const port = process.env.PORT || 3000;


// Habilitar CORS para permitir peticiones desde tu frontend (Angular)
app.use(cors());

// Configurar el middleware para parsear el cuerpo de las solicitudes como JSON
app.use(bodyParser.json());

// ✅ Servir archivos estáticos desde la carpeta "uploads"
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Carpeta uploads creada:', uploadsPath);
}

console.log('📁 Sirviendo archivos estáticos desde:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Configurar la base de datos SQLite
const db = new sqlite3.Database('./viajes.db', (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos SQLite:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Configuración multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);  // Usa la ruta absoluta que ya tienes
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Crear la tabla de "viajes" (si no existe)
// Crear tabla de viajes con campo de imagen
db.run(`
    CREATE TABLE IF NOT EXISTS viajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      destino TEXT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      imagen TEXT,
      descripcion TEXT
    )
`, (err) => {
  if (err) {
    console.error('❌ Error al crear tabla viajes:', err.message);
  } else {
    console.log('✅ Tabla viajes verificada/creada');
  }
});

// Crear la tabla de "ItinerarioGeneral" (si no existe)
db.run(
  `CREATE TABLE IF NOT EXISTS ItinerarioGeneral (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viajePrevistoId INTEGER NOT NULL,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    duracionDias INTEGER NOT NULL,
    destinosPorDia TEXT NOT NULL,
    descripcionGeneral TEXT,
    horaInicio TEXT,
    horaFin TEXT,
    climaGeneral TEXT,
    tipoDeViaje TEXT CHECK(tipoDeViaje IN ('costa', 'naturaleza', 'rural', 'urbana', 'cultural', 'trabajo')),
    FOREIGN KEY (viajePrevistoId) REFERENCES viajes(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla ItinerarioGeneral:", err.message);
    } else {
      console.log("✅ Tabla ItinerarioGeneral creada o ya existe.");
    }
  }
);

// Crear la tabla TiposActividad
db.run(
  `CREATE TABLE IF NOT EXISTS TiposActividad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT
)`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla TiposActividad:", err.message);
    } else {
      console.log("✅ Tabla TiposActividad creada o ya existe.");
    }
  }
);

// Crear la tabla ActividadesDisponibles
db.run(
  `CREATE TABLE IF NOT EXISTS ActividadesDisponibles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipoActividadId INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (tipoActividadId) REFERENCES TiposActividad(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla ActividadesDisponibles:", err.message);
    } else {
      console.log("✅ Tabla ActividadesDisponibles creada o ya existe.");
    }
  }
);

// Crear la tabla actividades
db.run(
  `CREATE TABLE IF NOT EXISTS actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viajePrevistoId INTEGER NOT NULL,
    itinerarioId INTEGER NOT NULL,
    tipoActividadId INTEGER NOT NULL,
    actividadDisponibleId INTEGER,
    nombre TEXT,
    descripcion TEXT,
    horaInicio TEXT NOT NULL,
    horaFin TEXT NOT NULL,
    FOREIGN KEY (viajePrevistoId) REFERENCES viajes(id) ON DELETE CASCADE,
    FOREIGN KEY (itinerarioId) REFERENCES ItinerarioGeneral(id) ON DELETE CASCADE,
    FOREIGN KEY (tipoActividadId) REFERENCES TiposActividad(id),
    FOREIGN KEY (actividadDisponibleId) REFERENCES ActividadesDisponibles(id)
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla actividades:", err.message);
    } else {
      console.log("✅ Tabla actividades creada o ya existe.");
    }
  }
);

// Crear la tabla archivos (archivos subidos por el usuario para cada actividad)
db.run(
  `CREATE TABLE IF NOT EXISTS archivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividadId INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('foto', 'video', 'audio', 'texto', 'imagen')) NOT NULL,
    nombreArchivo TEXT NOT NULL,
    rutaArchivo TEXT NOT NULL,
    descripcion TEXT,
    fechaCreacion TEXT DEFAULT (datetime('now')),
    fechaActualizacion TEXT DEFAULT (datetime('now')),
    horaCaptura TEXT,                                 -- ⬅️ Nuevo campo para guardar la hora (HH:mm)
    version INTEGER DEFAULT 1,
    geolocalizacion TEXT,
    metadatos TEXT,
    FOREIGN KEY (actividadId) REFERENCES actividades(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla archivos:", err.message);
    } else {
      console.log("✅ Tabla archivos creada o ya existe.");
    }
  }
);


// Crear la tabla archivos_asociados (textos y audios asociados a fotos, videos o imágenes)
db.run(
  `CREATE TABLE IF NOT EXISTS archivos_asociados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archivoPrincipalId INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('audio', 'texto')) NOT NULL,
    nombreArchivo TEXT NOT NULL,
    rutaArchivo TEXT NOT NULL,
    descripcion TEXT,
    fechaCreacion TEXT DEFAULT (datetime('now')),
    fechaActualizacion TEXT DEFAULT (datetime('now')),
    version INTEGER DEFAULT 1,
    FOREIGN KEY (archivoPrincipalId) REFERENCES archivos(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla archivos_asociados:", err.message);
    } else {
      console.log("✅ Tabla archivos_asociados creada o ya existe.");
    }
  }
);

// Extraer fecha y hora de un archivo (EXIF o metadatos del sistema)
async function getFileMetadata(filePath, fileType) {
  try {
    // 1. Intenta leer EXIF (imágenes)
    if (['image/jpeg', 'image/png'].includes(fileType)) {
      const buffer = await readFileAsync(filePath);
      const parser = ExifParser.create(buffer);
      const result = parser.parse();

      if (result.tags?.DateTimeOriginal) {
        let fecha = '';
        let hora = '';
        const dt = result.tags.DateTimeOriginal;
        if (typeof dt === 'number') {
          const d = new Date(dt * 1000);
          fecha = d.toISOString().split('T')[0];
          hora = d.toTimeString().substring(0, 5);
        } else if (typeof dt === 'string') {
          // "YYYY:MM:DD HH:MM:SS"
          const dateStr = dt.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
          const d = new Date(dateStr);
          fecha = d.toISOString().split('T')[0];
          hora = d.toTimeString().substring(0, 5);
        } else if (dt instanceof Date) {
          fecha = dt.toISOString().split('T')[0];
          hora = dt.toTimeString().substring(0, 5);
        }
        return { fecha, hora };
      }
    }
    // 2. Fallback a metadatos del sistema
    const stats = fs.statSync(filePath);
    return {
      fecha: new Date(stats.mtime).toISOString().split('T')[0],
      hora: new Date(stats.mtime).toTimeString().substring(0, 5)
    };
  } catch (error) {
    console.error('Error leyendo metadatos:', error);
    return {
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().substring(0, 5)
    };
  }
}

// ----------------------------------------
// RUTAS PARA Viajes prvistgos
// ----------------------------------------

console.log('Registrando rutas de viajes...');

// Ruta para obtener todos los viajes
app.get('/viajes', (req, res) => {
  db.all('SELECT * FROM viajes', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Agregar URL completa para las imágenes
    const viajesConImagenUrl = rows.map(viaje => ({
      ...viaje,
      imagen_url: viaje.imagen ? `${req.protocol}://${req.get('host')}/uploads/${viaje.imagen}` : null
    }));
    
    res.json(viajesConImagenUrl);
  });
});

// Ruta para obtener un viaje por id
app.get('/viajes/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM viajes WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Viaje no encontrado' });
      return;
    }
    
    // Agregar URL completa de la imagen
    const viajeConImagenUrl = {
      ...row,
      imagen_url: row.imagen ? `${req.protocol}://${req.get('host')}/uploads/${row.imagen}` : null
    };
    
    res.json(viajeConImagenUrl);
  });
});


// Ruta para agregar un nuevo viaje
app.post('/viajes', upload.single('imagen'), (req, res) => {
  const { nombre, destino, fecha_inicio, fecha_fin, descripcion } = req.body; // <-- añadimos descripcion
  const imagen = req.file ? req.file.filename : null;

  console.log('📸 Imagen recibida:', req.file);
  console.log('📝 Datos recibidos:', { nombre, destino, fecha_inicio, fecha_fin, descripcion });

  db.run(
    'INSERT INTO viajes (nombre, destino, fecha_inicio, fecha_fin, imagen, descripcion) VALUES (?, ?, ?, ?, ?, ?)', // <-- añadimos descripcion
    [nombre, destino, fecha_inicio, fecha_fin, imagen, descripcion],
    function (err) {
      if (err) {
        console.error('❌ Error al insertar viaje:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log('✅ Viaje creado con ID:', this.lastID);
      res.status(201).json({ 
        id: this.lastID,
        message: 'Viaje creado exitosamente',
        imagen: imagen,
        descripcion: descripcion
      });
    }
  );
});

// Ruta para actualizar un viaje
app.put('/viajes/:id', upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { nombre, destino, fecha_inicio, fecha_fin, descripcion, imagen_actual } = req.body; // <-- añadimos descripcion

  // Si se subió nueva imagen, usarla. Si no, mantener la actual
  const imagen = req.file ? req.file.filename : imagen_actual;

  console.log('🔄 Actualizando viaje ID:', id);
  console.log('📸 Imagen:', imagen);
  console.log('📝 Datos recibidos:', { nombre, destino, fecha_inicio, fecha_fin, descripcion });

  db.run(
    'UPDATE viajes SET nombre = ?, destino = ?, fecha_inicio = ?, fecha_fin = ?, imagen = ?, descripcion = ? WHERE id = ?', // <-- añadimos descripcion
    [nombre, destino, fecha_inicio, fecha_fin, imagen, descripcion, id],
    function (err) {
      if (err) {
        console.error('❌ Error al actualizar viaje:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log('✅ Viaje actualizado. Cambios:', this.changes);
      res.status(200).json({ 
        changes: this.changes,
        message: 'Viaje actualizado exitosamente',
        imagen: imagen,
        descripcion: descripcion
      });
    }
  );
});

// Ruta para obtener la imagen de un viaje
app.get('/viajes/:id/imagen', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT imagen FROM viajes WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row || !row.imagen) {
      res.status(404).json({ error: 'Imagen no encontrada' });
      return;
    }
    
    const imagePath = path.join(uploadsPath, row.imagen);
    
    // Verificar que el archivo existe
    if (fs.existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      res.status(404).json({ error: 'Archivo de imagen no encontrado' });
    }
  });
});

// Ruta para eliminar un viaje
app.delete('/viajes/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM viajes WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(200).json({ changes: this.changes });
  });
});

// ----------------------------------------
// RUTAS PARA ItinerarioGeneral
// ----------------------------------------

// 1️⃣ GET todos los itinerarios (o filtrar por viajePrevistoId)
//    - Si pasas ?viajePrevistoId=123, devuelve sólo los de ese viaje

console.log('Registrando rutas de itinerarios...');
app.get('/itinerarios', (req, res) => {
  const { viajePrevistoId } = req.query;
  const sql = viajePrevistoId
    ? 'SELECT * FROM ItinerarioGeneral WHERE viajePrevistoId = ?'
    : 'SELECT * FROM ItinerarioGeneral';
  const params = viajePrevistoId ? [viajePrevistoId] : [];

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 2️⃣ GET un itinerario por ID
app.get('/itinerarios/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM ItinerarioGeneral WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Itinerario no encontrado' });
    }
    res.json(row);
  });
});

// 3️⃣ POST crear un nuevo itinerario
app.post('/itinerarios', (req, res) => {
  const {
    viajePrevistoId,
    fechaInicio,
    horaInicio,
    fechaFin,
    horaFin,
    duracionDias,
    destinosPorDia,
    descripcionGeneral,
    climaGeneral,
    tipoDeViaje
  } = req.body;

  const sql = `INSERT INTO ItinerarioGeneral 
    (viajePrevistoId, fechaInicio, horaInicio, fechaFin, horaFin, duracionDias, destinosPorDia, descripcionGeneral, climaGeneral, tipoDeViaje) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // Guardamos destinosPorDia como JSON string
  const destinosJSON = JSON.stringify(destinosPorDia);

  db.run(
    sql,
    [viajePrevistoId, fechaInicio, horaInicio, fechaFin, horaFin, duracionDias, destinosJSON, descripcionGeneral, climaGeneral, tipoDeViaje],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// 4️⃣ PUT actualizar un itinerario existente
app.put('/itinerarios/:id', (req, res) => {
  const { id } = req.params;
  const {
    viajePrevistoId,
    fechaInicio,
    horaInicio,
    fechaFin,
    horaFin,
    duracionDias,
    destinosPorDia,
    descripcionGeneral,
    climaGeneral,
    tipoDeViaje
  } = req.body;

  const sql = `UPDATE ItinerarioGeneral SET
    viajePrevistoId = ?,
    fechaInicio = ?,
    horaInicio = ?,
    fechaFin = ?,
    horaFin = ?,
    duracionDias = ?,
    destinosPorDia = ?,
    descripcionGeneral = ?,
    climaGeneral = ?,
    tipoDeViaje = ?
    WHERE id = ?`;

  const destinosJSON = JSON.stringify(destinosPorDia);

  db.run(
    sql,
    [viajePrevistoId, fechaInicio, horaInicio, fechaFin, horaFin, duracionDias, destinosJSON, descripcionGeneral, climaGeneral, tipoDeViaje, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ changes: this.changes });
    }
  );
});

// 5️⃣ DELETE eliminar un itinerario
app.delete('/itinerarios/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM ItinerarioGeneral WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

// ----------------------------------------
// RUTAS PARA TiposActividad
// ----------------------------------------

console.log('Registrando rutas de tipos de actividad...');

// GET todos los tipos de actividad
app.get('/tipos-actividad', (req, res) => {
  db.all('SELECT * FROM TiposActividad', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET para obtener un tipo por ID
app.get('/tipos-actividad/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM TiposActividad WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Tipo de actividad no encontrado' });
    }
    res.json(row);
  });
});

// POST nuevo tipo de actividad
app.post('/tipos-actividad', (req, res) => {
  const { nombre, descripcion } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  db.run(
    'INSERT INTO TiposActividad (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion || null], // Acepta null si no viene descripción
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ 
        id: this.lastID,
        message: 'Tipo de actividad creado exitosamente'
      });
    }
  );
});

// PUT actualizar tipo de actividad
app.put('/tipos-actividad/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  db.run(
    'UPDATE TiposActividad SET nombre = ?, descripcion = ? WHERE id = ?',
    [nombre, descripcion || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Tipo de actividad no encontrado' });
      }
      res.json({ 
        changes: this.changes,
        message: 'Tipo de actividad actualizado exitosamente'
      });
    }
  );
});

// DELETE eliminar tipo de actividad
app.delete('/tipos-actividad/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(
    'DELETE FROM TiposActividad WHERE id = ?', 
    [id], 
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Tipo de actividad no encontrado' });
      }
      res.json({ 
        changes: this.changes,
        message: 'Tipo de actividad eliminado exitosamente'
      });
    }
  );
});

// ----------------------------------------
// RUTAS MEJORADAS PARA ActividadesDisponibles
// ----------------------------------------

console.log('Registrando rutas de actividades disponibles...');

// GET todas las actividades (con filtro opcional) + validación
app.get('/actividades-disponibles', (req, res) => {
  const { tipoActividadId } = req.query;
  
  // Validación tipoActividadId (si se envía)
  if (tipoActividadId && isNaN(Number(tipoActividadId))) {
    return res.status(400).json({ error: "tipoActividadId debe ser un número" });
  }

  const sql = tipoActividadId
    ? 'SELECT * FROM ActividadesDisponibles WHERE tipoActividadId = ?'
    : 'SELECT * FROM ActividadesDisponibles';
  const params = tipoActividadId ? [Number(tipoActividadId)] : [];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ 
      error: "Error al obtener actividades",
      detalles: err.message 
    });
    res.json(rows);
  });
});

// GET actividad por ID + manejo de 404
app.get('/actividades-disponibles/:id', (req, res) => {
  const { id } = req.params;
  
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "ID debe ser un número" });
  }

  db.get('SELECT * FROM ActividadesDisponibles WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ 
      error: "Error al buscar la actividad",
      detalles: err.message 
    });
    if (!row) return res.status(404).json({ error: "Actividad no encontrada" });
    res.json(row);
  });
});

// POST nueva actividad + validación de campos
app.post('/actividades-disponibles', (req, res) => {
  const { tipoActividadId, descripcion } = req.body;

  // Validaciones
  if (!tipoActividadId || !descripcion) {
    return res.status(400).json({ 
      error: "Campos incompletos",
      requeridos: { tipoActividadId: "number", descripcion: "string" }
    });
  }

  db.run(
    'INSERT INTO ActividadesDisponibles (tipoActividadId, descripcion) VALUES (?, ?)',
    [tipoActividadId, descripcion],
    function (err) {
      if (err) return res.status(500).json({ 
        error: "Error al crear actividad",
        detalles: err.message 
      });
      res.status(201).json({ 
        id: this.lastID,
        message: "Actividad creada exitosamente" 
      });
    }
  );
});

// PUT actualizar actividad + validaciones
app.put('/actividades-disponibles/:id', (req, res) => {
  const { id } = req.params;
  const { tipoActividadId, descripcion } = req.body;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "ID inválido" });
  }
  if (!tipoActividadId && !descripcion) {
    return res.status(400).json({ error: "Se requiere al menos un campo para actualizar" });
  }

  db.run(
    'UPDATE ActividadesDisponibles SET tipoActividadId = COALESCE(?, tipoActividadId), descripcion = COALESCE(?, descripcion) WHERE id = ?',
    [tipoActividadId, descripcion, id],
    function (err) {
      if (err) return res.status(500).json({ 
        error: "Error al actualizar actividad",
        detalles: err.message 
      });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Actividad no encontrada" });
      }
      res.json({ 
        updatedId: id,
        changes: this.changes 
      });
    }
  );
});

// DELETE actividad + validación
app.delete('/actividades-disponibles/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "ID debe ser un número" });
  }

  db.run('DELETE FROM ActividadesDisponibles WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ 
      error: "Error al eliminar actividad",
      detalles: err.message 
    });
    if (this.changes === 0) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }
    res.json({ 
      deletedId: id,
      message: "Actividad eliminada exitosamente" 
    });
  });
}); 

// ----------------------------------------
// RUTAS PARA ActividadesPorItinerario
// ----------------------------------------

console.log('Registrando rutas de actividades por itinerario...');

// GET actividades de un itinerario o de un viaje
app.get('/actividades', (req, res) => {
  const { viajePrevistoId, itinerarioId } = req.query;
  let sql = 'SELECT * FROM actividades';
  let params = [];

  if (itinerarioId) {
    sql += ' WHERE itinerarioId = ?';
    params.push(itinerarioId);
  } else if (viajePrevistoId) {
    sql += ' WHERE viajePrevistoId = ?';
    params.push(viajePrevistoId);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST nueva actividad
app.post('/actividades', (req, res) => {
  const {
    viajePrevistoId,
    itinerarioId,
    tipoActividadId,
    actividadDisponibleId,
    nombre,
    descripcion,
    horaInicio,
    horaFin
  } = req.body;

  db.run(
    `INSERT INTO actividades 
    (viajePrevistoId, itinerarioId, tipoActividadId, actividadDisponibleId, nombre, descripcion, horaInicio, horaFin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [viajePrevistoId, itinerarioId, tipoActividadId, actividadDisponibleId || null, nombre || null, descripcion || null, horaInicio, horaFin],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// DELETE eliminar actividad
app.delete('/actividades/:id', (req, res) => {
  db.run('DELETE FROM actividades WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ----------------------------------------
// RUTAS PARA Archivos (archivos por actividad)
// ----------------------------------------

console.log('📂 Registrando rutas de archivos...');

// 1️⃣ GET archivos (con filtro opcional por actividadId)
app.get('/archivos', (req, res) => {
  const { actividadId } = req.query;

  let sql = 'SELECT * FROM archivos';
  let params = [];

  if (actividadId) {
    sql += ' WHERE actividadId = ?';
    params.push(actividadId);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ----------------------------------------
// NUEVO: GET archivos por viaje
// ----------------------------------------
app.get('/archivos/viaje/:viajeId', (req, res) => {
  const { viajeId } = req.params;
  
  console.log('🎯 Obteniendo archivos para viajeId:', viajeId);
  
  const sql = `
    SELECT a.* 
    FROM archivos a
    INNER JOIN actividades act ON a.actividadId = act.id
    WHERE act.viajePrevistoId = ?
    ORDER BY a.fechaCreacion
  `;
  
  db.all(sql, [viajeId], (err, rows) => {
    if (err) {
      console.error('❌ Error obteniendo archivos por viaje:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`✅ Encontrados ${rows.length} archivos para viaje ${viajeId}`);
    res.json(rows);
  });
});

// Ruta para buscar coincidencias de actividades por fecha/hora de archivo
app.post('/archivos/buscar-coincidencias', upload.single('archivo'), async (req, res) => {
  try {
    const { actividadId } = req.body;

    // ✅ NUEVO: función para parsear fecha desde nombre de archivo
    function parseDateFromFilename(filename) {
      // Intentamos detectar patrón tipo VID20250504130146.mp4 => 2025-05-04 13:01:46
      const match = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const [_, y, m, d, h, min, s] = match;
        return new Date(`${y}-${m}-${d}T${h}:${min}:${s}.000Z`).toISOString();
      }
      return null;
    }

    console.log('\n🔍 =============== BUSCAR COINCIDENCIAS ===============');

    // ✅ Obtenemos metadatos desde archivo
    let metadata = await getFileMetadata(req.file.path, req.file.mimetype);
    console.log('📅 Metadatos iniciales:', metadata);

    // ✅ Si no hay fecha, intentamos extraer del nombre del archivo
    if (!metadata.fecha) {
      const fechaFromName = parseDateFromFilename(req.file.originalname);
      metadata.fecha = fechaFromName || new Date().toISOString();
      metadata.hora = fechaFromName ? fechaFromName.split('T')[1].split('.')[0] : new Date().toISOString().split('T')[1].split('.')[0];
      console.log('⚠️ Fecha no encontrada en metadatos, usando nombre de archivo:', metadata);
    }

    console.log('📌 actividadId actual:', actividadId);

    // ✅ Buscar actividades del MISMO DÍA y rango horario
    const query = `
      SELECT 
        a.id AS actividadId,
        a.nombre AS actividadNombre,
        a.descripcion AS actividadDescripcion,
        a.horaInicio,
        a.horaFin,
        i.id AS itinerarioId,
        i.fechaInicio,
        i.fechaFin,
        v.id AS viajeId,
        v.nombre AS nombreViaje,
        v.destino
      FROM actividades a
      JOIN ItinerarioGeneral i ON a.itinerarioId = i.id
      JOIN viajes v ON a.viajePrevistoId = v.id
      WHERE 
        DATE(?) BETWEEN DATE(i.fechaInicio) AND DATE(i.fechaFin)
        AND TIME(a.horaInicio) <= TIME(?)
        AND TIME(a.horaFin) >= TIME(?)
      ORDER BY a.horaInicio ASC
    `;

    const actividades = await new Promise((resolve, reject) => {
      db.all(query, [metadata.fecha, metadata.hora, metadata.hora], (err, rows) => {
        if (err) return reject(err);
        console.log(`✅ Encontradas ${rows.length} actividades coincidentes:`);
        rows.forEach(r => console.log(`  - ${r.actividadNombre} (${r.horaInicio}-${r.horaFin})`));
        resolve(rows);
      });
    });

    // ✅ Obtener la actividad actual solo por ID
    let actividadActual = null;
    if (actividadId) {
      actividadActual = await new Promise(resolve => {
        const queryActual = `
          SELECT 
            a.id AS actividadId, 
            a.nombre AS actividadNombre, 
            a.horaInicio, 
            a.horaFin,
            i.fechaInicio,
            i.fechaFin
          FROM actividades a
          JOIN ItinerarioGeneral i ON a.itinerarioId = i.id
          WHERE a.id = ?
        `;
        db.get(queryActual, [actividadId], (err, row) => {
          if (err) {
            console.error('❌ Error obteniendo actividad actual:', err);
            return resolve(null);
          }
          // Solo devolver actividadActual si la fecha del archivo está dentro del itinerario
          if (row && metadata.fecha >= row.fechaInicio && metadata.fecha <= row.fechaFin) {
            resolve(row);
          } else {
            resolve(null);
          }
        });
      });
    }

    if (actividadActual) {
      console.log('📌 Actividad actual válida:', actividadActual.actividadNombre, `(${actividadActual.fechaInicio} → ${actividadActual.fechaFin})`);
    } else {
      console.log('❌ Actividad actual no coincide con fecha del archivo');
    }

    res.json({
      metadata,
      actividadesCoincidentes: actividades || [],
      actividadActual
    });

  } catch (error) {
    console.error('[buscar-coincidencias] Error:', error);
    res.status(500).json({ error: "Error buscando coincidencias: " + error.message });
  }
});





// 2️⃣ GET archivo individual por ID
app.get('/archivos/:id', (req, res) => {
  db.get('SELECT * FROM archivos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json(row);
  });
});

// ✅ TAMBIÉN CORRIGE EL ENDPOINT INDIVIDUAL DE ARCHIVOS
app.post('/archivos', (req, res) => {
  // ✅ AÑADIR fechaCreacion aquí también
  const { 
    actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, 
    horaCaptura, version, geolocalizacion, metadatos, fechaCreacion 
  } = req.body;

  console.log('📝 Creando archivo individual con fechaCreacion:', fechaCreacion);

  // ✅ DETERMINAR FECHA DE CREACIÓN
  const fechaFinal = fechaCreacion ? new Date(fechaCreacion).toISOString() : new Date().toISOString();

  db.run(
    `INSERT INTO archivos 
    (actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, horaCaptura, version, geolocalizacion, metadatos, fechaCreacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actividadId, tipo, nombreArchivo, rutaArchivo, 
      descripcion || null, horaCaptura || null, version || 1, 
      geolocalizacion || null, metadatos || null, fechaFinal
    ],
    function (err) {
      if (err) {
        console.error('❌ Error creando archivo:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('✅ Archivo creado con ID:', this.lastID, 'y fechaCreacion:', fechaFinal);
      res.status(201).json({ id: this.lastID, fechaCreacion: fechaFinal });
    }
  );
});

// 4️⃣ PUT actualizar archivo físico + metadatos (con multer)
app.put('/archivos/:id/archivo', upload.single('archivo'), (req, res) => {
  const id = req.params.id;
  const archivo = req.file;
  const { actividadId, tipo, descripcion, horaCaptura, version, geolocalizacion, metadatos } = req.body;

  if (!archivo) {
    return res.status(400).json({ error: 'No se envió archivo para actualizar' });
  }

  const campos = ['rutaArchivo = ?', 'nombreArchivo = ?'];
  const valores = [archivo.path, archivo.originalname];

  if (actividadId !== undefined) campos.push('actividadId = ?');
  if (tipo !== undefined) campos.push('tipo = ?');
  if (descripcion !== undefined) campos.push('descripcion = ?');
  if (horaCaptura !== undefined) campos.push('horaCaptura = ?');
  if (version !== undefined) campos.push('version = ?');
  if (geolocalizacion !== undefined) campos.push('geolocalizacion = ?');
  if (metadatos !== undefined) campos.push('metadatos = ?');

  campos.push("fechaActualizacion = datetime('now')");
  valores.push(id);

  const sql = `UPDATE archivos SET ${campos.join(', ')} WHERE id = ?`;
  db.run(sql, valores, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// 5️⃣ PUT actualizar solo metadatos
// 5️⃣ PUT actualizar solo metadatos (VERSIÓN CORREGIDA)
app.put('/archivos/:id', (req, res) => {
  const id = req.params.id;
  const { actividadId, tipo, nombreArchivo, descripcion, horaCaptura, version, geolocalizacion, metadatos, fechaCreacion } = req.body;

  const campos = [];
  const valores = [];

  // 1️⃣ Agregar campos condicionalmente
  if (actividadId !== undefined) { campos.push('actividadId = ?'); valores.push(actividadId); }
  if (tipo !== undefined) { campos.push('tipo = ?'); valores.push(tipo); }
  if (nombreArchivo !== undefined) { campos.push('nombreArchivo = ?'); valores.push(nombreArchivo); }
  if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
  if (horaCaptura !== undefined) { campos.push('horaCaptura = ?'); valores.push(horaCaptura); }
  if (version !== undefined) { campos.push('version = ?'); valores.push(version); }
  if (geolocalizacion !== undefined) { campos.push('geolocalizacion = ?'); valores.push(geolocalizacion); }
  if (metadatos !== undefined) { campos.push('metadatos = ?'); valores.push(metadatos); }
  if (fechaCreacion !== undefined) { campos.push('fechaCreacion = ?'); valores.push(fechaCreacion); }

  // 2️⃣ Siempre actualizar fechaActualizacion
  campos.push("fechaActualizacion = datetime('now')");

  // 3️⃣ Agregar ID al final para el WHERE
  valores.push(id);

  const sql = `UPDATE archivos SET ${campos.join(', ')} WHERE id = ?`;
  
  console.log('📝 Ejecutando UPDATE con:', { sql, valores }); // ← Debugging

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('❌ Error en UPDATE:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('✅ Resultado UPDATE:', { changes: this.changes, lastID: this.lastID }); // ← Debugging
    
    if (this.changes === 0) {
      console.warn('⚠️ No se actualizó ningún registro. Posibles causas:');
      console.warn('- El ID no existe');
      console.warn('- Los datos enviados son idénticos a los existentes');
    }
    
    res.json({ 
      updated: this.changes,
      id: id,
      cambiosRealizados: campos.filter(c => !c.includes('fechaActualizacion')) 
    });
  });
});

// 6️⃣ POST subir múltiples archivos (CORREGIDO CON GPS)
app.post('/archivos/subir', upload.array('archivos'), async (req, res) => {
  const { actividadId, tipo, descripcion, horaCaptura, geolocalizacion, fechaCreacion, actividadesCoincidentes, actividadSeleccionada } = req.body;
  const archivos = req.files;

  console.log('\n🚀 =============== NUEVA SUBIDA DE ARCHIVOS ===============');
  console.log('📦 Datos recibidos del frontend:');
  console.log('  - actividadId:', actividadId);
  console.log('  - actividadSeleccionada:', actividadSeleccionada);
  console.log('  - tipo:', tipo);
  console.log('  - descripcion:', descripcion);
  console.log('  - horaCaptura:', horaCaptura);
  console.log('  - fechaCreacion:', fechaCreacion);
  console.log('  - geolocalizacion:', geolocalizacion);
  console.log('  - archivos:', archivos?.length || 0);

  if (!archivos?.length) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }

  function extraerCoordendasGPS(exifTags) {
    try {
      const { GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef, GPSAltitude } = exifTags;
      if (!GPSLatitude || !GPSLongitude) return null;

      let lat = convertirADecimal(GPSLatitude);
      let lng = convertirADecimal(GPSLongitude);

      if (GPSLatitudeRef?.toLowerCase() === 's') lat = -lat;
      if (GPSLongitudeRef?.toLowerCase() === 'w') lng = -lng;

      const coordenadas = { latitud: lat, longitud: lng, altitud: GPSAltitude || null };
      console.log('🌍 Coordenadas GPS extraídas:', coordenadas);
      return JSON.stringify(coordenadas);
    } catch (error) {
      console.error('❌ Error extrayendo GPS:', error);
      return null;
    }
  }

  function convertirADecimal(coordenada) {
    if (typeof coordenada === 'number') return coordenada;
    if (Array.isArray(coordenada) && coordenada.length >= 2) {
      const grados = coordenada[0] || 0;
      const minutos = coordenada[1] || 0;
      const segundos = coordenada[2] || 0;
      return grados + minutos / 60 + segundos / 3600;
    }
    return coordenada;
  }

  const resultados = [];

  for (const archivo of archivos) {
    try {
      console.log(`\n📁 Procesando archivo: ${archivo.originalname}`);

      let metadatos = {};
      let horaExif = null;
      let geolocalizacionExif = null;

      if (['image/jpeg', 'image/tiff'].includes(archivo.mimetype)) {
        const buffer = fs.readFileSync(archivo.path);
        const parser = ExifParser.create(buffer);
        const exifData = parser.parse();

        if (exifData.tags?.DateTimeOriginal) {
          const dt = exifData.tags.DateTimeOriginal;
          if (typeof dt === 'number') horaExif = new Date(dt * 1000).toISOString();
          else if (typeof dt === 'string') {
            const dateStr = dt.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
            horaExif = new Date(dateStr).toISOString();
          } else if (dt instanceof Date) horaExif = dt.toISOString();
          else horaExif = null;
        }

        metadatos = exifData.tags || {};
        geolocalizacionExif = extraerCoordendasGPS(exifData.tags || {});
        if (geolocalizacionExif) console.log('📍 GPS encontrado en EXIF del archivo:', archivo.originalname);
      }

      let fechaCreacionFinal;
      if (fechaCreacion) {
        fechaCreacionFinal = new Date(fechaCreacion).toISOString();
        console.log('✅ Usando fechaCreacion del frontend:', fechaCreacionFinal);
      } else if (horaExif) {
        fechaCreacionFinal = horaExif;
        console.log('📷 Usando fecha EXIF como fallback:', fechaCreacionFinal);
      } else {
        fechaCreacionFinal = new Date().toISOString();
        console.log('🕐 Usando fecha actual como último recurso:', fechaCreacionFinal);
      }

      let geolocalizacionFinal;
      if (geolocalizacionExif) {
        geolocalizacionFinal = geolocalizacionExif;
        console.log('🌍 Usando geolocalización de EXIF');
      } else if (geolocalizacion) {
        geolocalizacionFinal = geolocalizacion;
        console.log('📱 Usando geolocalización del frontend');
      } else {
        geolocalizacionFinal = null;
        console.log('❌ No hay datos de geolocalización disponibles');
      }

      // ------------------ ASIGNACIÓN DE ACTIVIDAD ------------------
      let actividadFinal = null;

      if (actividadId) {
        actividadFinal = actividadId;
        console.log(`📌 Asignando archivo a actividadId del frontend: ${actividadFinal}`);
        console.log('📝 Usuario NO seleccionó actividad manualmente, se usa actividadId por defecto');
      } else if (actividadSeleccionada) {
        actividadFinal = actividadSeleccionada;
        console.log(`📌 Asignando archivo a actividadSeleccionada enviada por frontend: ${actividadFinal}`);
        console.log('📝 Usuario SÍ seleccionó actividad manualmente');
      } else {
        if (!actividadesCoincidentes?.length) {
          console.log(`❌ No hay coincidencias para asignar automáticamente`);
          resultados.push({
            nombre: archivo.originalname,
            estado: 'no-actividad',
            mensaje: 'No hay actividades coincidentes'
          });
          continue;
        } else if (actividadesCoincidentes.length === 1) {
          actividadFinal = actividadesCoincidentes[0].actividadId;
          console.log(`📌 Asignando archivo automáticamente a la única actividad encontrada: ${actividadFinal}`);
          console.log('📝 Usuario NO seleccionó actividad manualmente, se asignó automáticamente');
        } else {
          console.log(`⚠️ Varias coincidencias encontradas, selección necesaria`);
          resultados.push({
            nombre: archivo.originalname,
            estado: 'seleccion-necesaria',
            actividadesCoincidentes
          });
          continue;
        }
      }

      // ------------------ GUARDAR ARCHIVO ------------------
      const stmt = await db.prepare(
        `INSERT INTO archivos 
        (actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, horaCaptura, geolocalizacion, metadatos, fechaCreacion) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.run(
        actividadFinal,
        tipo || archivo.mimetype.split('/')[0],
        archivo.originalname,
        archivo.path,
        descripcion || '',
        horaCaptura || horaExif || new Date().toISOString(),
        geolocalizacionFinal,
        JSON.stringify(metadatos),
        fechaCreacionFinal
      );

      console.log(`✅ Archivo guardado con actividadId: ${actividadFinal}`);
      resultados.push({
        id: stmt.lastID,
        nombre: archivo.originalname,
        estado: 'subido',
        actividadId: actividadFinal,
        fechaCreacion: fechaCreacionFinal,
        geolocalizacion: geolocalizacionFinal,
        metadatos: Object.keys(metadatos).length > 0 ? metadatos : null
      });

    } catch (error) {
      console.error(`❌ Error procesando ${archivo?.originalname}:`, error);
      resultados.push({
        nombre: archivo?.originalname || 'desconocido',
        estado: 'error',
        error: error.message
      });
    }
  }

  console.log('\n🏁 Subida completada. Resultados:', resultados.length);
  console.log('🔍 Detalle de resultados:', resultados);
  res.status(201).json(resultados);
});







// 7️⃣ DELETE archivo
app.delete('/archivos/:id', (req, res) => {
  db.run('DELETE FROM archivos WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// 8️⃣ GET descargar archivo
app.get('/archivos/:id/descargar', (req, res) => {
  db.get('SELECT rutaArchivo, nombreArchivo FROM archivos WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.download(row.rutaArchivo, row.nombreArchivo);
  });
});

// ----------------------------------------

// Configuración del servidor Express
// 🧱 Ruta a archivos Angular compilados
const isProduction = process.env.NODE_ENV === 'production';
const frontendPath = isProduction
  ? path.join(__dirname, '../../dist/travel-memory-app/browser')
  : null;

if (isProduction) {
  if (!fs.existsSync(frontendPath)) {
    console.error('❌ frontendPath NO existe:', frontendPath);
    process.exit(1);
  } else {
    console.log('✅ frontendPath existe:', frontendPath);
  }
  app.use(express.static(frontendPath));

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html NO existe en:', indexPath);
    process.exit(1);
  } else {
    console.log('✅ index.html existe en:', indexPath);
  }
  // 🌀 Para cualquier ruta no API, sirve index.html SOLO en producción
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});
}

// Configurar el puerto y poner a escuchar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend escuchando en http://0.0.0.0:${PORT}`);
});;;

