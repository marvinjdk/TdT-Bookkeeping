import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, FileText, Wallet, Users as UsersIcon, Plus, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [afdelinger, setAfdelinger] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'afdeling',
    afdeling_navn: '',
  });
  const navigate = useNavigate();
  const isSuperbruger = user.role === 'superbruger';

  useEffect(() => {
    if (isSuperbruger) {
      fetchUsers();
      fetchAfdelinger();
    } else {
      fetchStats();
    }
  }, [isSuperbruger]);

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

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Kunne ikke hente brugere');
    } finally {
      setLoading(false);
    }
  };

  const fetchAfdelinger = async () => {
    try {
      const res = await api.get('/admin/afdelinger');
      setAfdelinger(res.data);
    } catch (error) {
      console.error('Kunne ikke hente afdelinger');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      toast.success('Bruger oprettet!');
      setShowCreateDialog(false);
      setFormData({ username: '', password: '', role: 'afdeling', afdeling_navn: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kunne ikke oprette bruger');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password skal være mindst 6 tegn');
      return;
    }

    try {
      await api.put(`/admin/users/${selectedUser.id}/password`, {
        new_password: newPassword,
      });
      toast.success('Password ændret!');
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Kunne ikke ændre password');
    }
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  // Superbruger dashboard - only user management
  if (isSuperbruger) {
    const activeUsers = users.filter(u => u.role !== 'superbruger').length;
    
    return (
      <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="dashboard-page">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Superbruger Dashboard</h1>
          <p className="text-base md:text-lg text-slate-600 mt-2">Administrer brugere og adgange</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Aktive Brugere</CardTitle>
              <div className="p-2 rounded-lg bg-[#109848]/10">
                <UsersIcon className="w-5 h-5 text-[#109848]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-data text-[#109848]">{activeUsers}</div>
              <p className="text-xs text-slate-500 mt-1">Admins og afdelinger</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Hurtig Adgang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white">
                    <Plus size={18} className="mr-2" />
                    Opret Ny Bruger
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Opret ny bruger</DialogTitle>
                    <DialogDescription>Tilføj en ny admin eller afdeling bruger</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Brugernavn *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="bg-white border-slate-200 focus:border-[#109848]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Adgangskode *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-white border-slate-200 focus:border-[#109848]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rolle *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="afdeling">Afdeling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.role === 'afdeling' && (
                      <div className="space-y-2">
                        <Label htmlFor="afdeling_navn">Afdelingsnavn *</Label>
                        <Select
                          value={formData.afdeling_navn}
                          onValueChange={(value) => setFormData({ ...formData, afdeling_navn: value })}
                        >
                          <SelectTrigger id="afdeling_navn">
                            <SelectValue placeholder="Vælg afdeling" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                            {afdelinger.map((afdeling) => (
                              <SelectItem key={afdeling.id} value={afdeling.navn}>
                                {afdeling.navn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white"
                    >
                      Opret bruger
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50"
              >
                Se Alle Brugere
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Brugeroversigt</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Brugernavn</TableHead>
                    <TableHead className="font-semibold text-slate-700">Rolle</TableHead>
                    <TableHead className="font-semibold text-slate-700">Afdeling</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Handling</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.role !== 'superbruger').map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Afdeling'}
                        </span>
                      </TableCell>
                      <TableCell>{user.afdeling_navn || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPassword('');
                            setShowPasswordDialog(true);
                          }}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Key size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Skift Password</DialogTitle>
              <DialogDescription>
                Skift password for bruger: {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nyt Password *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white border-slate-200 focus:border-[#109848]"
                  placeholder="Mindst 6 tegn"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleChangePassword}
                  className="flex-1 bg-[#109848] hover:bg-[#0d7a3a] text-white"
                >
                  <Key size={18} className="mr-2" />
                  Gem Password
                </Button>
                <Button
                  onClick={() => setShowPasswordDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuller
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const isAdmin = user.role === 'admin' || user.role === 'superbruger';
  
  const statCards = isAdmin ? [
    {
      title: 'Total Indtægter (Alle hold)',
      value: `${stats.total_indtaegter.toFixed(2)} kr.`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'stat-indtaegter'
    },
    {
      title: 'Total Udgifter (Alle hold)',
      value: `${stats.total_udgifter.toFixed(2)} kr.`,
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      testId: 'stat-udgifter'
    },
  ] : [
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
        <p className="text-base md:text-lg text-slate-600 mt-2">Velkommen til {user.afdeling_navn || 'Tour de Taxa'}</p>
      </div>

      {/* Samlet saldo for alle hold (kun for admin) */}
      {isAdmin && stats.aktuelt_saldo !== undefined && stats.aktuelt_saldo !== null && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Samlet nuværende saldo for alle hold</p>
                <p className="text-3xl md:text-4xl font-bold text-green-900">
                  {stats.aktuelt_saldo.toFixed(2)} kr.
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-slate-600 font-medium mb-1">Total Indtægter</p>
                  <p className="text-lg font-semibold text-green-700">
                    {stats.total_indtaegter.toFixed(2)} kr.
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 font-medium mb-1">Total Udgifter</p>
                  <p className="text-lg font-semibold text-red-600">
                    {stats.total_udgifter.toFixed(2)} kr.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {isAdmin && stats.afdelinger_saldi && stats.afdelinger_saldi.length > 0 && (
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Hold Oversigt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.afdelinger_saldi.map((afd) => (
                <button
                  key={afd.afdeling_id}
                  onClick={() => navigate(`/transactions?afdeling_id=${afd.afdeling_id}`)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  data-testid={`view-hold-${afd.afdeling_id}`}
                >
                  <span className="font-medium text-slate-700">{afd.afdeling_navn}</span>
                  <span className={`font-bold font-data text-lg ${afd.aktuelt_saldo >= 0 ? 'text-[#109848]' : 'text-red-600'}`}>
                    {afd.aktuelt_saldo.toFixed(2)} kr.
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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