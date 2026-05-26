import React, { useEffect, useState } from 'react';
import { Phase, PhaseMember } from './types';
import * as api from './api';

interface PhaseTrackerPanelProps {
  projectId: number;
}

export const PhaseTrackerPanel: React.FC<PhaseTrackerPanelProps> = ({ projectId }) => {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // New phase state
  const [newPhaseName, setNewPhaseName] = useState('');

  useEffect(() => {
    loadPhases();
  }, [projectId]);

  const loadPhases = async () => {
    try {
      const data = await api.fetchPhases(projectId);
      setPhases(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePhase = async () => {
    if (!newPhaseName.trim()) return;
    try {
      await api.createPhase({
        proyecto_id: projectId,
        nombre: newPhaseName,
        estado: 'pendiente',
        orden: phases.length + 1,
        porcentaje_avance: 0
      });
      setNewPhaseName('');
      loadPhases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartPhase = async (phaseId: number) => {
    try {
      setError(null);
      await api.startPhase(phaseId);
      loadPhases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProgress = async (phaseId: number, progress: number) => {
    try {
      await api.updatePhaseProgress(phaseId, progress);
      loadPhases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Project Phases Tracker</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          placeholder="New phase name..."
          className="border rounded p-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          onClick={handleCreatePhase}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Add Phase
        </button>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.id} className="border p-4 rounded-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold mr-2 text-gray-700">{phase.orden}. {phase.nombre}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  phase.estado === 'completada' ? 'bg-green-100 text-green-800' :
                  phase.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {phase.estado.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="font-semibold">{phase.porcentaje_avance}%</span>
                
                {phase.estado === 'pendiente' && (
                  <button 
                    onClick={() => phase.id && handleStartPhase(phase.id)}
                    className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700 transition"
                  >
                    Start Phase
                  </button>
                )}
                
                {phase.estado === 'en_progreso' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={phase.porcentaje_avance}
                      onChange={(e) => phase.id && handleUpdateProgress(phase.id, parseInt(e.target.value))}
                      className="w-32"
                    />
                    {phase.porcentaje_avance === 100 && (
                       <span className="text-green-600 text-sm font-bold">Auto-completed!</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Embedded Member Assignment Form (Simplified for demonstration) */}
            <PhaseMembersList phaseId={phase.id!} />
          </div>
        ))}
        {phases.length === 0 && <p className="text-gray-500 italic">No phases defined yet.</p>}
      </div>
    </div>
  );
};

// Sub-component for managing members within a phase
const PhaseMembersList: React.FC<{ phaseId: number }> = ({ phaseId }) => {
  const [members, setMembers] = useState<PhaseMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    responsable_id: 1, // Defaulting for example
    fecha_inicio: '',
    fecha_fin: '',
    dias_laborables: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  useEffect(() => {
    loadMembers();
  }, [phaseId]);

  const loadMembers = async () => {
    try {
      const data = await api.fetchPhaseMembers(phaseId);
      setMembers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async () => {
    try {
      await api.assignPhaseMember(phaseId, formData as any);
      setShowAdd(false);
      loadMembers();
    } catch (e) {
      alert('Failed to assign member');
    }
  };

  const toggleDay = (day: string) => {
    const current = formData.dias_laborables;
    const updated = current.includes(day) 
      ? current.filter(d => d !== day)
      : [...current, day];
    setFormData({ ...formData, dias_laborables: updated });
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="mt-2 pl-4 border-l-2 border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-gray-600">Assigned Team Members</h4>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="text-blue-600 text-sm hover:underline"
        >
          {showAdd ? 'Cancel' : '+ Assign Member'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 p-3 rounded mb-3 text-sm flex flex-col gap-3">
          <div className="flex gap-3">
            <input 
              type="number" 
              placeholder="Responsable ID" 
              className="border p-1 w-32"
              value={formData.responsable_id}
              onChange={e => setFormData({...formData, responsable_id: parseInt(e.target.value)})}
            />
            <input 
              type="date" 
              className="border p-1"
              value={formData.fecha_inicio}
              onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
            />
            <input 
              type="date" 
              className="border p-1"
              value={formData.fecha_fin}
              onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
            />
          </div>
          <div>
            <span className="text-gray-500 mb-1 block">Working Days:</span>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(day => (
                <label key={day} className="flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={formData.dias_laborables.includes(day)}
                    onChange={() => toggleDay(day)}
                  /> {day.substring(0,3)}
                </label>
              ))}
            </div>
          </div>
          <button 
            onClick={handleAssign}
            className="bg-blue-600 text-white px-3 py-1 rounded w-fit hover:bg-blue-700"
          >
            Save Assignment
          </button>
        </div>
      )}

      <ul className="text-sm space-y-1">
        {members.map(m => (
          <li key={m.id} className="text-gray-700 bg-gray-50 px-2 py-1 rounded flex justify-between">
            <span>{m.responsable_nombre || `ID: ${m.responsable_id}`}</span>
            <span className="text-gray-500">
              {m.fecha_inicio} to {m.fecha_fin} | {m.dias_laborables.join(', ')}
            </span>
          </li>
        ))}
        {members.length === 0 && !showAdd && <span className="text-gray-400 italic text-xs">No members assigned yet.</span>}
      </ul>
    </div>
  );
};
