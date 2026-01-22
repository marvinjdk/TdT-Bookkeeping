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
  ];

  // Superbruger only sees Dashboard and Admin
  if (user.role === 'superbruger') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Users });
  } 
  // Admin and Afdeling see full menu
  else {
    navItems.push(
      { path: '/transactions', label: 'Posteringer', icon: FileText },
      { path: '/export', label: 'Eksporter', icon: Download },
      { path: '/settings', label: 'Indstillinger', icon: Settings }
    );
    
    if (user.role === 'admin') {
      navItems.push({ path: '/admin', label: 'Admin', icon: Users });
    }
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <div>
          <h1 className="text-lg font-bold text-[#109848] tracking-tight">Tour de Taxa</h1>
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-16"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-16 lg:top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-slate-200 lg:block hidden">
          <div className="flex flex-col items-center mb-4">
            <img 
              src="/logo.png" 
              alt="Tour de Taxa Logo" 
              className="h-16 w-auto mb-3"
              onError={(e) => e.target.style.display = 'none'}
            />
            <h1 className="text-xl font-bold text-[#109848] tracking-tight text-center">Tour de Taxa</h1>
            <p className="text-xs text-slate-500 mt-1">Bogføring</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">{user.afdeling_navn || user.username}</p>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              data-testid="logout-button"
              className="text-slate-500 hover:bg-slate-100 hover:text-red-600 p-2"
              title="Log ud"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
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
        {/* Mobile logout button at bottom */}
        <div className="p-4 border-t border-slate-200 lg:hidden">
          <Button
            onClick={handleLogout}
            variant="ghost"
            data-testid="logout-button-mobile"
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