import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(false))
      .finally(() => setChecked(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, checked }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const can = {
  manage: (u) => u && ["super_admin", "admin"].includes(u.role),
  internal: (u) => u && ["super_admin", "admin", "team_member"].includes(u.role),
  superAdmin: (u) => u && u.role === "super_admin",
};
