-- Miembros asignados a una tarea (fase)
CREATE TABLE IF NOT EXISTS tarea_miembros (
  id SERIAL PRIMARY KEY,
  tarea_id INTEGER NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  responsable_id INTEGER NOT NULL REFERENCES responsables(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_laborables JSONB NOT NULL DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_miembros_tarea ON tarea_miembros(tarea_id);
