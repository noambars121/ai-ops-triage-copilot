import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Inbox, PlusCircle, Book, Activity, Settings, Mail, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { logout } from "./actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Support Ops Inbox",
  description: "Internal Support Triage Tool",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const isLoggedIn = !!session;

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-white">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-6">
                <Link href={isLoggedIn ? "/inbox" : "/new"} className="flex items-center gap-2 font-bold text-xl text-blue-600">
                  <Activity className="h-6 w-6" />
                  OpsInbox
                </Link>
                {isLoggedIn && (
                  <nav className="flex items-center gap-4 text-sm font-semibold text-gray-800">
                    <Link href="/inbox" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
                      <Inbox className="h-4 w-4" /> Inbox
                    </Link>
                    <Link href="/kb" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
                      <Book className="h-4 w-4" /> KB
                    </Link>
                    <Link href="/outbox" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
                      <Mail className="h-4 w-4" /> Outbox
                    </Link>
                    <Link href="/logs" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
                      <Settings className="h-4 w-4" /> Logs
                    </Link>
                  </nav>
                )}
              </div>
              <div className="flex items-center gap-4">
                  <Link href="/new" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <PlusCircle className="h-4 w-4" /> Public Form
                  </Link>
                  {isLoggedIn && (
                      <form action={logout}>
                          <button className="text-sm text-gray-700 hover:text-red-700 font-medium flex items-center gap-1 transition-colors">
                              <LogOut className="h-4 w-4" /> Logout
                          </button>
                      </form>
                  )}
              </div>
            </div>
          </header>
          <main className="flex-1 bg-gray-50 p-4 md:p-8">
            <div className="container mx-auto max-w-5xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
