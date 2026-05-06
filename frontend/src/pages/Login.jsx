import React from "react";

const loginBg = "https://images.unsplash.com/photo-1696595883516-76c97aa3a164?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxkYXJrJTIwbW9kZSUyMGFic3RyYWN0JTIwdGVjaCUyMGFyY2hpdGVjdHVyYWwlMjBiYWNrZ3JvdW5kJTIwdGV4dHVyZXxlbnwwfHx8fDE3NzgxMDA1NTN8MA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative overflow-hidden grain-bg">
      <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left column: hero */}
        <div className="flex flex-col justify-between p-10 lg:p-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-sm bg-[#FF5E00] flex items-center justify-center">
              <span className="text-[#0A0A0B] font-heading font-black">S</span>
            </div>
            <span className="font-heading font-black tracking-tighter text-xl">SCRUM<span className="text-[#FF5E00]">.</span>FLOW</span>
          </div>

          <div className="space-y-8 max-w-xl">
            <p className="label-mono text-[#FF5E00]" data-testid="login-tagline">
              // TASK OS FOR BUSINESS ANALYSTS
            </p>
            <h1 className="font-heading font-black tracking-tighter text-5xl md:text-6xl lg:text-7xl leading-[0.95]">
              Orchestrate every sprint.
              <br />
              <span className="text-[#FF5E00]">Ship the backlog.</span>
            </h1>
            <p className="text-[#A1A4AB] text-lg leading-relaxed max-w-md">
              Une plateforme taillée pour les Business Analysts IT qui endossent le rôle de Scrum Master.
              Kanban, hiérarchie parent/enfant, historique, et analytics — dans un seul tableau de contrôle.
            </p>
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10">
              {[
                { k: "Vues", v: "Daily / Weekly" },
                { k: "Flow", v: "Kanban DnD" },
                { k: "Liens", v: "Parent / Child" },
              ].map((s) => (
                <div key={s.k}>
                  <p className="label-mono">{s.k}</p>
                  <p className="font-heading text-lg mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="label-mono text-[#565961]">© {new Date().getFullYear()} SCRUM.FLOW</p>
        </div>

        {/* Right column: login card */}
        <div className="flex items-center justify-center p-6 lg:p-16">
          <div
            className="w-full max-w-md surface rounded-sm p-10 backdrop-blur-xl bg-[#131418]/80"
            data-testid="login-card"
          >
            <p className="label-mono text-[#FF5E00]">01 / SIGN IN</p>
            <h2 className="font-heading font-bold text-3xl mt-3 tracking-tight">
              Bienvenue, BA.
            </h2>
            <p className="text-[#A1A4AB] mt-2 text-sm">
              Connectez-vous avec Google pour accéder à votre backlog.
            </p>

            <button
              onClick={handleLogin}
              data-testid="google-login-btn"
              className="mt-10 w-full group flex items-center justify-center gap-3 bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] font-semibold rounded-sm h-12 transition-colors duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.48-1.7 4.34-5.27 4.34-3.17 0-5.76-2.63-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.78 3.88 14.69 3 12.18 3 7.09 3 3 7.09 3 12.18S7.09 21.36 12.18 21.36c7.04 0 9.36-4.94 9.36-7.48 0-.5-.05-.88-.19-1.28z"/>
              </svg>
              <span className="label-mono tracking-[0.12em]">Continue with Google</span>
            </button>

            <div className="mt-10 pt-6 border-t border-white/10">
              <p className="label-mono">Secure · Private</p>
              <p className="text-xs text-[#A1A4AB] mt-2 leading-relaxed">
                OAuth 2.0 via Google. Aucun mot de passe stocké. Session chiffrée valide 7 jours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
