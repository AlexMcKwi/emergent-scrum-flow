import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (user) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(password);
    if (!ok) {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
      <div className="bg-[#111113] border border-[#2A2A2E] rounded-xl p-8 w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-white text-xl font-semibold text-center">Emergent Scrum Flow</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            autoFocus
            className="bg-[#1A1A1E] border border-[#2A2A2E] text-white rounded-lg px-4 py-2 outline-none focus:border-[#FF5E00] transition"
          />
          {error && <p className="text-red-400 text-sm text-center">Mot de passe incorrect</p>}
          <button
            type="submit"
            className="bg-[#FF5E00] hover:bg-[#e05400] text-white font-medium py-2 rounded-lg transition"
          >
            Accéder
          </button>
        </form>
      </div>
    </div>
  );
}