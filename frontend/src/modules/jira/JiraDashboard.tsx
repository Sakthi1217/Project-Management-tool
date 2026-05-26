import React, { useEffect, useState } from 'react';

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  assignee: string;
  assigneeEmail: string | null;
  priority: string;
}

export const JiraDashboard: React.FC = () => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkload();
  }, []);

  const loadWorkload = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/jira/workload', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load Jira workload');
      const data = await res.json();
      setIssues(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Jira Workload...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 0C5.149 0 0 5.149 0 11.5S5.149 23 11.5 23 23 17.851 23 11.5 17.851 0 11.5 0zm0 21.1c-5.293 0-9.6-4.307-9.6-9.6 0-5.293 4.307-9.6 9.6-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6z"/></svg>
            Jira Team Workload
          </h1>
          <p className="text-gray-500 text-sm mt-1">Consolidated view of all active Jira tickets for your team</p>
        </div>
        <button 
          onClick={loadWorkload}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {issues.map(issue => (
          <div key={issue.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {issue.key}
              </span>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                issue.status.toLowerCase().includes('done') ? 'bg-green-100 text-green-800' :
                issue.status.toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {issue.status}
              </span>
            </div>
            
            <h3 className="font-semibold text-gray-800 text-sm mb-3 line-clamp-2">
              {issue.summary}
            </h3>
            
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {issue.assignee ? issue.assignee.charAt(0) : '?'}
                </div>
                <span className="text-xs text-gray-600">{issue.assignee}</span>
              </div>
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                {issue.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {issues.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No active Jira issues found for your team.</p>
        </div>
      )}
    </div>
  );
};
