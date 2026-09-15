import React, { useState, useEffect } from 'react';
import { ListTodo, RefreshCw } from 'lucide-react';
import { api } from './api';

interface Task {
  id: string;
  title: string;
  description: string;
  reward_cents: number;
  status: string;
}

export const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch Live Tasks from Express Backend
  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const taskData = await api.getTasks();
      setTasks(taskData.tasks || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle Real Task Submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !proofText.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await api.submitTask(selectedTask.id, proofText);
      setStatusMessage('Submission recorded! Awaiting requester verification.');
      setSelectedTask(null);
      setProofText('');
      loadDashboardData(); // Refresh list
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <header className="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-emerald-400">Earn with Grahm's</h1>
          <p className="text-xs text-slate-400">Live Worker Portal</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:border-emerald-500/50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold text-slate-200">Refresh</span>
        </button>
      </header>

      {/* Error / Success Banners */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}
      {statusMessage && (
        <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-lg text-sm">
          {statusMessage}
        </div>
      )}

      {/* Tasks List */}
      <section className="mt-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-emerald-400" />
          Available Tasks ({tasks.length})
        </h2>

        {loading ? (
          <p className="text-xs text-slate-400">Loading active tasks from server...</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-slate-500">No active tasks available right now.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-medium text-slate-100 text-sm">{task.title}</h3>
                  <span className="text-sm font-bold text-emerald-400">
                    +${(task.reward_cents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{task.description}</p>
                <button
                  onClick={() => setSelectedTask(task)}
                  className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg"
                >
                  Start Task
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-semibold text-slate-100">{selectedTask.title}</h3>
            <form onSubmit={handleTaskSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="Enter proof details..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-semibold rounded-lg text-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
