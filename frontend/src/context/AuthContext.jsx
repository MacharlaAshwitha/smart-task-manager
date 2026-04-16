import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../api/client';

const TOKEN_KEY = 'stm_token';
const USER_KEY = 'stm_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      setAuthToken(nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
    }
    setTokenState(nextToken);
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    } else {
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      api
        .get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        })
        .catch(() => {
          persist(null, null);
        })
        .finally(() => setLoading(false));
    } else {
      setAuthToken(null);
      setLoading(false);
    }
  }, [token, persist]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persist(data.token, data.user);
    return data;
  };

  const logout = () => persist(null, null);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
