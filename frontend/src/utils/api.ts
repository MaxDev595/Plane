import axios from 'axios';

const api = axios.create({
  baseURL: 'https://plane-afzr.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('plane_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('plane_token');
      localStorage.removeItem('plane_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;