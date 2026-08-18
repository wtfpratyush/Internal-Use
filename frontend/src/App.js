import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider } from "@/context/UIContext";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import { Loading } from "@/components/Common";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MyWork from "@/pages/MyWork";
import Tasks from "@/pages/Tasks";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Team from "@/pages/Team";
import CalendarPage from "@/pages/CalendarPage";
import FilesPage from "@/pages/FilesPage";
import Notifications from "@/pages/Notifications";
import Reports from "@/pages/Reports";
import Services from "@/pages/Services";
import Settings from "@/pages/Settings";

function Protected({ children }) {
  const { user, checked } = useAuth();
  if (!checked) return <div className="flex h-screen items-center justify-center"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <UIProvider>
      <Layout>{children}</Layout>
    </UIProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/my-work" element={<Protected><MyWork /></Protected>} />
      <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
      <Route path="/clients" element={<Protected><Clients /></Protected>} />
      <Route path="/clients/:id" element={<Protected><ClientDetail /></Protected>} />
      <Route path="/team" element={<Protected><Team /></Protected>} />
      <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
      <Route path="/files" element={<Protected><FilesPage /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/services" element={<Protected><Services /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
