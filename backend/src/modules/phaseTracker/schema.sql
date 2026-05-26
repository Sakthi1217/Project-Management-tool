-- Phase Tracker Module Schema

-- Fases del proyecto
CREATE TABLE IF NOT EXISTS proyecto_fases (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en_progreso','completada')),
  orden INTEGER NOT NULL,
  porcentaje_avance INTEGER NOT NULL DEFAULT 0 CHECK(porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Miembros asignados a una fase
CREATE TABLE IF NOT EXISTS fase_miembros (
  id SERIAL PRIMARY KEY,
  fase_id INTEGER NOT NULL REFERENCES proyecto_fases(id) ON DELETE CASCADE,
  responsable_id INTEGER NOT NULL REFERENCES responsables(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_laborables JSONB NOT NULL DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_proyecto_fases_proyecto ON proyecto_fases(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_fase_miembros_fase ON fase_miembros(fase_id);
