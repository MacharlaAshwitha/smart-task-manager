/**
 * Reads a human-readable message from an Axios error response.
 */
export function getApiErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (typeof data?.error === 'string') return data.error;
  if (err.response?.status) {
    return `${fallback} (HTTP ${err.response.status})`;
  }
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Cannot reach the API. Start the backend on port 5000 and run the UI with npm run dev (Vite proxies /api).';
  }
  return err.message || fallback;
}
