import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Kanban from "@/pages/Kanban";
import TreeView from "@/pages/TreeView";
import ArchivePage from "@/pages/ArchivePage";
import Stats from "@/pages/Stats";
import CalendarView from "@/pages/CalendarView";

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback synchronously before other routes
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="/tree" element={<ProtectedRoute><TreeView /></ProtectedRoute>} />
      <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
