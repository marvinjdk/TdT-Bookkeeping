import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import NewTransactionPage from "@/pages/NewTransactionPage";
import EditTransactionPage from "@/pages/EditTransactionPage";
import ExportPage from "@/pages/ExportPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import Layout from "@/components/Layout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Indlæser...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/" />} />
          <Route element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
            <Route path="/" element={<DashboardPage user={user} />} />
            <Route path="/transactions" element={<TransactionsPage user={user} />} />
            <Route path="/transactions/new" element={<NewTransactionPage user={user} />} />
            <Route path="/transactions/:id/edit" element={<EditTransactionPage user={user} />} />
            <Route path="/export" element={<ExportPage user={user} />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
            {user.role === "admin" && <Route path="/admin" element={<AdminPage />} />}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;