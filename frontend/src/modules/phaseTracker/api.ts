import { Phase, PhaseMember } from './types';

const API_BASE = '/api/phase-tracker'; // Handled by nginx proxy

export const fetchPhases = async (projectId: number): Promise<Phase[]> => {
  const res = await fetch(`${API_BASE}/project/${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch phases');
  return res.json();
};

export const fetchPhaseMembers = async (phaseId: number): Promise<PhaseMember[]> => {
  const res = await fetch(`${API_BASE}/${phaseId}/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
};

export const createPhase = async (phase: Omit<Phase, 'id'>): Promise<Phase> => {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(phase)
  });
  if (!res.ok) throw new Error('Failed to create phase');
  return res.json();
};

export const startPhase = async (phaseId: number): Promise<Phase> => {
  const res = await fetch(`${API_BASE}/${phaseId}/start`, {
    method: 'POST'
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to start phase');
  }
  return res.json();
};

export const updatePhaseProgress = async (phaseId: number, progress: number): Promise<Phase> => {
  const res = await fetch(`${API_BASE}/${phaseId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress })
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
};

export const assignPhaseMember = async (phaseId: number, member: Omit<PhaseMember, 'id' | 'fase_id'>): Promise<PhaseMember> => {
  const res = await fetch(`${API_BASE}/${phaseId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member)
  });
  if (!res.ok) throw new Error('Failed to assign member');
  return res.json();
};
