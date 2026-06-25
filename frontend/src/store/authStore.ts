import { create } from 'zustand';
import type { AuthState, RegisterData, User } from '../types';
import api from '../utils/api';

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('plane_user') || 'null'); } catch { return null; }
  })(),
  token: localStorage.getItem('plane_token'),
  isAuthenticated: !!localStorage.getItem('plane_token'),

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    localStorage.setItem('plane_token', token);
    localStorage.setItem('plane_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { user, token } = res.data;
    localStorage.setItem('plane_token', token);
    localStorage.setItem('plane_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('plane_token');
    localStorage.removeItem('plane_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user: User) => {
    localStorage.setItem('plane_user', JSON.stringify(user));
    set({ user });
  },
}));
