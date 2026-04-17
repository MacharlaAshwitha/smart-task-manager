import axios from 'axios';

const baseURL = "https://smart-task-manager-api-59xu.onrender.com/api";

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach JWT from localStorage on every request. */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}