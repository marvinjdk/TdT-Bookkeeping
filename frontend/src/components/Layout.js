import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Download, Settings, Users, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Posteringer', icon: FileText },
    { path: '/export', label: 'Eksporter', icon: Download },
    { path: '/settings', label: 'Indstillinger', icon: Settings },
  ];

  if (user.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Users });
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-bold text-[#109848] tracking-tight">Bogføring</h1>
          <p className="text-xs text-slate-600">{user.afdeling_navn || user.username}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          data-testid="mobile-menu-button"
          className="lg:hidden"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-slate-200 lg:block hidden">
          <h1 className="text-2xl font-bold text-[#109848] tracking-tight">Bogføring</h1>
          <p className="text-sm text-slate-600 mt-1">{user.afdeling_navn || user.username}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 mt-16 lg:mt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#109848] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <Button
            onClick={handleLogout}
            variant="ghost"
            data-testid="logout-button"
            className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={20} className="mr-3" />
            Log ud
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}