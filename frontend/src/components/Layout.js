import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Download, Settings, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-[#109848] tracking-tight">Bogføring</h1>
          <p className="text-sm text-slate-600 mt-1">{user.afdeling_navn || user.username}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}