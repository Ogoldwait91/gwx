"use client";
import { useEffect, useState } from "react";

export type UserState = {
  equity: number;
  mode: string;
};

export function useUser(): [UserState, (u: Partial<UserState>) => void] {
  const [user, setUser] = useState<UserState>({ equity: 10000, mode: "Balanced" });

  // load from localStorage
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gwx_user") || "{}");
      setUser({ equity: s.equity || 10000, mode: s.mode || "Balanced" });
    } catch {}
  }, []);

  const updateUser = (changes: Partial<UserState>) => {
    const newUser = { ...user, ...changes };
    setUser(newUser);
    localStorage.setItem("gwx_user", JSON.stringify(newUser));
    window.dispatchEvent(new Event("gwx-user-update"));
  };

  // react to external changes (e.g. from Settings)
  useEffect(() => {
    const fn = () => {
      try {
        const s = JSON.parse(localStorage.getItem("gwx_user") || "{}");
        setUser({ equity: s.equity || 10000, mode: s.mode || "Balanced" });
      } catch {}
    };
    window.addEventListener("gwx-user-update", fn);
    return () => window.removeEventListener("gwx-user-update", fn);
  }, []);

  return [user, updateUser];
}
