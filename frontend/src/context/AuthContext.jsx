import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const PASSWORD = process.env.REACT_APP_ACCESS_PASSWORD;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return sessionStorage.getItem("auth") === "true"
      ? { name: "Utilisateur", email: "local@emergent.app" }
      : null;
  });
  const loading = false;

  const login = (password) => {
    if (PASSWORD && password === PASSWORD) {
      sessionStorage.setItem("auth", "true");
      setUser({ name: "Utilisateur", email: "local@emergent.app" });
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem("auth");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);