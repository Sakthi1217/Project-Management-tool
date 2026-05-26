import { query } from '../../db/database.js';

export interface Phase {
  id?: number;
  proyecto_id: number;
  nombre: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  orden: number;
  porcentaje_avance: number;
}

export interface PhaseMember {
  id?: number;
  fase_id: number;
  responsable_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_laborables: string[];
}

export class PhaseTrackerService {
  // 1. Obtener fases de un proyecto
  static async getPhasesByProjectId(projectId: number) {
    const result = await query(
      'SELECT * FROM proyecto_fases WHERE proyecto_id = $1 ORDER BY orden ASC',
      [projectId]
    );
    return result.rows;
  }

  // 2. Obtener miembros de una fase
  static async getMembersByPhaseId(phaseId: number) {
    const result = await query(
      `SELECT fm.*, r.nombre as responsable_nombre, r.email as responsable_email, r.avatar_url, r.color 
       FROM fase_miembros fm 
       JOIN responsables r ON fm.responsable_id = r.id 
       WHERE fm.fase_id = $1`,
      [phaseId]
    );
    return result.rows;
  }

  // 3. Crear una nueva fase
  static async createPhase(data: Phase) {
    const result = await query(
      `INSERT INTO proyecto_fases (proyecto_id, nombre, estado, orden, porcentaje_avance)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.proyecto_id, data.nombre, data.estado || 'pendiente', data.orden, data.porcentaje_avance || 0]
    );
    return result.rows[0];
  }

  // 4. Iniciar una fase (Valida que la fase anterior esté 100% completada)
  static async startPhase(phaseId: number) {
    // Obtener la fase que queremos iniciar
    const phaseRes = await query('SELECT * FROM proyecto_fases WHERE id = $1', [phaseId]);
    if (phaseRes.rows.length === 0) throw new Error('Phase not found');
    const phase = phaseRes.rows[0];

    // Si no es la primera fase, verificar la fase anterior
    if (phase.orden > 1) {
      const prevPhaseRes = await query(
        'SELECT * FROM proyecto_fases WHERE proyecto_id = $1 AND orden = $2',
        [phase.proyecto_id, phase.orden - 1]
      );
      
      if (prevPhaseRes.rows.length > 0) {
        const prevPhase = prevPhaseRes.rows[0];
        if (prevPhase.porcentaje_avance < 100 || prevPhase.estado !== 'completada') {
          throw new Error('Cannot start this phase until the previous phase is 100% complete.');
        }
      }
    }

    // Iniciar la fase
    const updateRes = await query(
      `UPDATE proyecto_fases 
       SET estado = 'en_progreso', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [phaseId]
    );
    return updateRes.rows[0];
  }

  // 5. Actualizar avance de una fase y auto-completar si llega a 100%
  static async updatePhaseProgress(phaseId: number, progress: number) {
    if (progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100');
    
    const estado = progress === 100 ? 'completada' : 'en_progreso';
    
    const result = await query(
      `UPDATE proyecto_fases 
       SET porcentaje_avance = $1, estado = $2, updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [progress, estado, phaseId]
    );
    return result.rows[0];
  }

  // 6. Asignar miembro a fase
  static async assignMemberToPhase(data: PhaseMember) {
    const result = await query(
      `INSERT INTO fase_miembros (fase_id, responsable_id, fecha_inicio, fecha_fin, dias_laborables)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.fase_id, data.responsable_id, data.fecha_inicio, data.fecha_fin, JSON.stringify(data.dias_laborables)]
    );
    return result.rows[0];
  }
}
