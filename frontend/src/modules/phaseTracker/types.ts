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
  responsable_nombre?: string;
  responsable_email?: string;
  avatar_url?: string;
  color?: string;
}
