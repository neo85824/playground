import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getNotifications = () => api.get('/notifications').then(r => r.data);

export const createNotification = (data) => api.post('/notifications', data).then(r => r.data);

export const updateNotification = (id, data) => api.patch(`/notifications/${id}`, data).then(r => r.data);

export const cancelNotification = (id) => api.delete(`/notifications/${id}`).then(r => r.data);

export const fireNotification = (id) => api.post(`/notifications/${id}/fire`).then(r => r.data);
