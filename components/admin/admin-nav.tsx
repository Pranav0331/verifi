"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export function AdminNav() {
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { isAuthenticated } = useConvexAuth();

  const stats = useQuery(
    api.roleRequests.getRoleRequestStats,
    isAuthenticated ? {} : "skip"
  );
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const pendingCount = stats?.pendingRequests ?? 0;

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      badge: null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Role Requests",
      href: "/admin/role-requests",
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: "bg-amber-500 text-slate-950",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "User Directory",
      href: "/admin/users",
      badge: stats?.totalUsers ? String(stats.totalUsers) : null,
      badgeColor: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Integrations",
      href: "/admin/integrations",
      badge: null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="w-full bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-2 backdrop-blur-xl shadow-sm dark:shadow-lg dark:shadow-indigo-950/10 transition-colors duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Nav Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/80"
                }`}
              >
                <span className={isActive ? "text-indigo-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      item.badgeColor || "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/30 dark:text-indigo-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin context & Back to Dashboard */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800/80 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all"
          >
            <span>&larr;</span>
            <span className="hidden sm:inline">User Dashboard</span>
          </Link>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
              {currentUser?.username
                ? `@${currentUser.username}`
                : clerkUser?.username
                ? `@${clerkUser.username}`
                : clerkUser?.fullName || "Admin"}
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Network Admin
            </span>
          </div>

          <button
            onClick={async () => {
              await signOut({ redirectUrl: "/" });
            }}
            title="Sign Out Current Session"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
