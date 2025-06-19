// Importar las dependencias
const fs = require('fs');
const ExifParser = require('exif-parser');
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
db.run( 
  `CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    destino TEXT,
    fecha_inicio TEXT,
    fecha_fin TEXT
  )`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla viajes-previstos:", err.message);
    } else {
      console.log("✅ Tabla viajes-previstos creada o ya existe.");
    }
  }
);

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

// ----------------------------------------
// RUTAS PARA Viajes
// ----------------------------------------

console.log('Registrando rutas de viajes...');

// Ruta para obtener todos los viajes
app.get('/viajes', (req, res) => {
  db.all('SELECT * FROM viajes', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Ruta para agregar un nuevo viaje
app.post('/viajes', (req, res) => {
  const { nombre, destino, fecha_inicio, fecha_fin } = req.body;
  db.run(
    'INSERT INTO viajes (nombre, destino, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
    [nombre, destino, fecha_inicio, fecha_fin],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Ruta para actualizar un viaje
app.put('/viajes/:id', (req, res) => {
  const { nombre, destino, fecha_inicio, fecha_fin } = req.body;
  const { id } = req.params;
  db.run(
    'UPDATE viajes SET nombre = ?, destino = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
    [nombre, destino, fecha_inicio, fecha_fin, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json({ changes: this.changes });
    }
  );
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

// 2️⃣ GET archivo individual por ID
app.get('/archivos/:id', (req, res) => {
  db.get('SELECT * FROM archivos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json(row);
  });
});

// 3️⃣ POST nuevo archivo (metadatos)
app.post('/archivos', (req, res) => {
  const { actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, horaCaptura, version, geolocalizacion, metadatos } = req.body;

  db.run(
    `INSERT INTO archivos 
    (actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, horaCaptura, version, geolocalizacion, metadatos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [actividadId, tipo, nombreArchivo, rutaArchivo, descripcion || null, horaCaptura || null, version || 1, geolocalizacion || null, metadatos || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
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
app.put('/archivos/:id', (req, res) => {
  const id = req.params.id;
  const { actividadId, tipo, nombreArchivo, descripcion, horaCaptura, version, geolocalizacion, metadatos } = req.body;

  const campos = [];
  const valores = [];

  if (actividadId !== undefined) campos.push('actividadId = ?');
  if (tipo !== undefined) campos.push('tipo = ?');
  if (nombreArchivo !== undefined) campos.push('nombreArchivo = ?');
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

// 6️⃣ POST subir múltiples archivos (con procesamiento EXIF)
app.post('/archivos/subir', upload.array('archivos'), async (req, res) => {
  const { actividadId, tipo, descripcion, horaCaptura, geolocalizacion } = req.body;
  const archivos = req.files;

  if (!archivos?.length) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }

  const resultados = [];
  
  for (const archivo of archivos) {
    try {
      // Procesamiento EXIF (ejemplo básico)
      let metadatos = {};
      let horaExif = null;
      
      if (['image/jpeg', 'image/tiff'].includes(archivo.mimetype)) {
        const buffer = fs.readFileSync(archivo.path);
        const parser = ExifParser.create(buffer);
        const exifData = parser.parse();
        
if (exifData.tags?.DateTimeOriginal) {
  const dt = exifData.tags.DateTimeOriginal;
  if (typeof dt === 'number') {
    // Si es un timestamp (segundos desde 1970)
    horaExif = new Date(dt * 1000).toISOString();
  } else if (typeof dt === 'string') {
    // Si es string tipo "YYYY:MM:DD HH:MM:SS"
    const dateStr = dt.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
    horaExif = new Date(dateStr).toISOString();
  } else if (dt instanceof Date) {
    horaExif = dt.toISOString();
  } else {
    // Si no se puede convertir, ignora
    horaExif = null;
  }
}
        metadatos = exifData.tags || {};
      }

      // Insertar en base de datos
const stmt = await db.prepare(
  `INSERT INTO archivos 
  (actividadId, tipo, nombreArchivo, rutaArchivo, descripcion, horaCaptura, geolocalizacion, metadatos) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

await stmt.run(
  actividadId,
  tipo || archivo.mimetype.split('/')[0],
  archivo.originalname,
  archivo.path,
  descripcion || '',
  horaCaptura || horaExif || new Date().toISOString(),
  geolocalizacion || '',
  JSON.stringify(metadatos)
);
      
      resultados.push({
        id: stmt.lastID,
        nombre: archivo.originalname,
        estado: 'subido',
        metadatos: Object.keys(metadatos).length > 0 ? metadatos : null
      });

    } catch (error) {
      resultados.push({
        nombre: archivo?.originalname || 'desconocido',
        estado: 'error',
        error: error.message
      });
    }
  }

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

