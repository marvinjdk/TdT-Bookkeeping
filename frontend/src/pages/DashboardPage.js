import { useEffect, useState } from 'react';
import { api } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, FileText, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      toast.error('Kunne ikke hente statistik');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  const statCards = [
    {
      title: 'Aktuel Saldo',
      value: `${stats.aktuelt_saldo.toFixed(2)} kr.`,
      icon: Wallet,
      color: 'text-[#109848]',
      bgColor: 'bg-[#109848]/10',
      testId: 'stat-saldo'
    },
    {
      title: 'Total Indtægter',
      value: `${stats.total_indtaegter.toFixed(2)} kr.`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'stat-indtaegter'
    },
    {
      title: 'Total Udgifter',
      value: `${stats.total_udgifter.toFixed(2)} kr.`,
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      testId: 'stat-udgifter'
    },
    {
      title: 'Antal Posteringer',
      value: stats.antal_posteringer,
      icon: FileText,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      testId: 'stat-posteringer'
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-base md:text-lg text-slate-600 mt-2">Velkommen til {user.afdeling_navn || 'Bogføringsappen'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              data-testid={stat.testId}
              className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-data ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Hurtig adgang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Brug menuen til venstre for at navigere mellem funktioner:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
            <li><strong>Posteringer:</strong> Se alle bogføringsposteringer</li>
            <li><strong>Eksporter:</strong> Download data til Excel</li>
            <li><strong>Indstillinger:</strong> Opdater startsaldo og periodeinfo</li>
            {user.role === 'admin' && <li><strong>Admin:</strong> Administrer brugere og afdelinger</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}