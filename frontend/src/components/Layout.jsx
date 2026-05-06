import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Kanban, GitBranch, Archive, BarChart3, LogOut, CheckSquare } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/kanban", label: "Kanban", icon: Kanban },
  { to: "/tree", label: "Hiérarchie", icon: GitBranch },
  { to: "/archive", label: "Archives", icon: Archive },
  { to: "/stats", label: "Statistiques", icon: BarChart3 },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8F9FA] grain-bg relative">
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-[#0A0A0B]/80 border-b border-white/5"
        data-testid="app-header"
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center h-16 gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="logo-link">
            <div className="w-8 h-8 rounded-sm bg-[#FF5E00] flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-[#0A0A0B]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-black tracking-tighter text-lg">SCRUM<span className="text-[#FF5E00]">.</span>FLOW</span>
          </Link>

          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `label-mono px-3 py-2 rounded-sm flex items-center gap-2 transition-colors duration-200 ${
                    isActive ? "bg-white/10 text-[#F8F9FA]" : "text-[#A1A4AB] hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user?.name}
                className="w-8 h-8 rounded-full border border-white/10"
                data-testid="user-avatar"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1D1E24] flex items-center justify-center text-xs font-mono border border-white/10">
                {(user?.name || "?").slice(0,1)}
              </div>
            )}
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-[11px] text-[#A1A4AB] font-mono">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="ml-2 p-2 rounded-sm border border-white/10 text-[#A1A4AB] hover:text-white hover:border-white/20 transition-colors duration-200"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
