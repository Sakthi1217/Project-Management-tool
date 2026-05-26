import React, { useEffect, useState } from 'react';

// Interfaces for Team Member Tracking on Tasks
export interface TaskMember {
  id?: number;
  tarea_id: number;
  responsable_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_laborables: string[];
  responsable_nombre?: string;
  responsable_email?: string;
  avatar_url?: string;
  color?: string;
}

interface TaskTeamTrackerProps {
  taskId: number;
}

export const TaskTeamTracker: React.FC<TaskTeamTrackerProps> = ({ taskId }) => {
  const [members, setMembers] = useState<TaskMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    responsable_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias_laborables: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}/miembros`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load team members for this task.');
      const data = await res.json();
      setMembers(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [taskId]);

  const handleAssign = async () => {
    if (!formData.responsable_id || !formData.fecha_inicio || !formData.fecha_fin) {
      setError('Please fill in all fields (Responsable ID, Start Date, End Date)');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}/miembros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          responsable_id: Number(formData.responsable_id),
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin,
          dias_laborables: formData.dias_laborables
        })
      });

      if (!res.ok) throw new Error('Failed to assign member');
      
      setShowAdd(false);
      setFormData({
        responsable_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        dias_laborables: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });
      loadMembers();
      setError(null);
    } catch (e: any) {
      setError(e.message);
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
    <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-semibold text-gray-800">Assigned Phase/Task Members</h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="text-blue-600 text-sm font-medium hover:underline focus:outline-none"
        >
          {showAdd ? 'Cancel' : '+ Assign Member'}
        </button>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {showAdd && (
        <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-100 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Responsable ID</label>
              <input 
                type="number" 
                placeholder="e.g. 1" 
                className="border p-2 rounded w-full text-sm"
                value={formData.responsable_id}
                onChange={e => setFormData({...formData, responsable_id: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input 
                type="date" 
                className="border p-2 rounded w-full text-sm"
                value={formData.fecha_inicio}
                onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input 
                type="date" 
                className="border p-2 rounded w-full text-sm"
                value={formData.fecha_fin}
                onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Working Days for this Phase:</label>
            <div className="flex gap-3 flex-wrap">
              {DAYS.map(day => (
                <label key={day} className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.dias_laborables.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="rounded text-blue-600"
                  /> {day.substring(0,3)}
                </label>
              ))}
            </div>
          </div>
          <button 
            onClick={handleAssign}
            className="bg-blue-600 text-white px-4 py-2 mt-2 rounded text-sm w-fit hover:bg-blue-700 transition"
          >
            Save Member Assignment
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {members.map(m => (
          <li key={m.id} className="bg-gray-50 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2 border border-gray-100">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" 
                style={{ backgroundColor: m.color || '#ccc' }}
              >
                {m.responsable_nombre ? m.responsable_nombre[0].toUpperCase() : '?'}
              </div>
              <span className="font-medium text-sm text-gray-800">
                {m.responsable_nombre || `ID: ${m.responsable_id}`}
              </span>
            </div>
            <div className="flex flex-col text-right text-xs text-gray-500">
              <span>{new Date(m.fecha_inicio).toLocaleDateString()} to {new Date(m.fecha_fin).toLocaleDateString()}</span>
              <span className="mt-0.5">{m.dias_laborables.join(', ')}</span>
            </div>
          </li>
        ))}
        {members.length === 0 && !showAdd && (
          <p className="text-gray-400 italic text-sm text-center py-4">No team members assigned to this phase yet.</p>
        )}
      </ul>
    </div>
  );
};
