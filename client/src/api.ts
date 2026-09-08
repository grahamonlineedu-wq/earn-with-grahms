const API_BASE_URL = 'http://localhost:5000/api';

// Retrieve auth token stored in localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('grahms_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Fetch available micro-tasks
  getTasks: async () => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  // Submit task completion proof
  submitTask: async (taskId: string, proofData: string) => {
    const res = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task_id: taskId, proof_data: proofData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');
    return data;
  },
};

