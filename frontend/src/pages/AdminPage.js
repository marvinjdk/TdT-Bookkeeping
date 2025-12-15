import { useEffect, useState } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Eye, Settings, Key, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([]);
  const [afdelinger, setAfdelinger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAfdelingDialog, setShowAfdelingDialog] = useState(false);
  const [showNewAfdelingDialog, setShowNewAfdelingDialog] = useState(false);
  const [showManageAfdelingerDialog, setShowManageAfdelingerDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newAfdelingNavn, setNewAfdelingNavn] = useState('');
  const [newAfdelingCreate, setNewAfdelingCreate] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'afdeling',
    afdeling_navn: '',
  });
  const [stats, setStats] = useState({});
  const [allAfdelingerStats, setAllAfdelingerStats] = useState(null);
  const navigate = useNavigate();
  const currentUser = user; // Rename for clarity

  useEffect(() => {
    fetchUsers();
    fetchAfdelinger();
    fetchAllAfdelingerStats();
  }, []);

  const fetchAllAfdelingerStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setAllAfdelingerStats(res.data);
    } catch (error) {
      console.error('Kunne ikke hente samlet statistik');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      
      // Fetch stats for all afdelinger
      const statsPromises = res.data
        .filter(u => u.role === 'afdeling')
        .map(u => api.get(`/dashboard/stats?afdeling_id=${u.id}`));
      const statsResults = await Promise.all(statsPromises);
      
      const statsMap = {};
      res.data.filter(u => u.role === 'afdeling').forEach((u, i) => {
        statsMap[u.id] = statsResults[i].data;
      });
      setStats(statsMap);
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
      setShowDialog(false);
      setFormData({ username: '', password: '', role: 'afdeling', afdeling_navn: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kunne ikke oprette bruger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Er du sikker på, at du vil slette denne bruger?')) return;

    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Bruger slettet');
      fetchUsers();
    } catch (error) {
      toast.error('Kunne ikke slette bruger');
    }
  };

  const handleOpenPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordDialog(true);
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

  const handleOpenAfdelingDialog = (user) => {
    setSelectedUser(user);
    setNewAfdelingNavn(user.afdeling_navn || '');
    setShowAfdelingDialog(true);
  };

  const handleChangeAfdelingNavn = async () => {
    if (!newAfdelingNavn || newAfdelingNavn.trim().length === 0) {
      toast.error('Afdelingsnavn skal udfyldes');
      return;
    }

    try {
      await api.put(`/admin/users/${selectedUser.id}/afdeling`, {
        afdeling_navn: newAfdelingNavn,
      });
      toast.success('Afdelingsnavn ændret!');
      setShowAfdelingDialog(false);
      setSelectedUser(null);
      setNewAfdelingNavn('');
      fetchUsers();
    } catch (error) {
      toast.error('Kunne ikke ændre afdelingsnavn');
    }
  };

  const handleCreateAfdeling = async () => {
    if (!newAfdelingCreate || newAfdelingCreate.trim().length === 0) {
      toast.error('Afdelingsnavn skal udfyldes');
      return;
    }

    try {
      await api.post('/admin/afdelinger', {
        navn: newAfdelingCreate,
      });
      toast.success('Afdeling oprettet!');
      setShowNewAfdelingDialog(false);
      setNewAfdelingCreate('');
      fetchAfdelinger();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kunne ikke oprette afdeling');
    }
  };

  const handleDeleteAfdeling = async (afdelingId) => {
    if (!window.confirm('Er du sikker på, at du vil slette denne afdeling?')) return;

    try {
      await api.delete(`/admin/afdelinger/${afdelingId}`);
      toast.success('Afdeling slettet');
      fetchAfdelinger();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kunne ikke slette afdeling');
    }
  };

  const viewAfdelingTransactions = (afdelingId) => {
    navigate(`/transactions?afdeling_id=${afdelingId}`);
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="admin-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Admin Panel</h1>
          <p className="text-base md:text-lg text-slate-600 mt-2">Administrer brugere og afdelinger</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {currentUser.role === 'admin' && (
            <Button
              onClick={() => navigate('/admin/settings')}
              variant="outline"
              className="border-[#109848] text-[#109848] hover:bg-[#109848]/10 w-full sm:w-auto"
              data-testid="admin-settings-button"
            >
              <Settings size={18} className="mr-2" />
              Hold Indstillinger
            </Button>
          )}
          {currentUser.role === 'superbruger' && (
            <>
              <Button
                onClick={() => setShowManageAfdelingerDialog(true)}
                variant="outline"
                className="border-slate-300 hover:bg-slate-50 w-full sm:w-auto"
                data-testid="manage-afdelinger-button"
              >
                <Edit2 size={18} className="mr-2" />
                Administrer Afdelinger
              </Button>
              
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="create-user-button"
                    className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
                  >
                    <Plus size={18} className="mr-2" />
                    Opret bruger
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Opret ny bruger</DialogTitle>
              <DialogDescription>Tilføj en ny afdeling eller admin bruger</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Brugernavn *</Label>
                <Input
                  id="username"
                  data-testid="username-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Adgangskode *</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="password-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rolle *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger id="role" data-testid="role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {user.role === 'superbruger' && <SelectItem value="superbruger">Superbruger</SelectItem>}
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
                    <SelectTrigger id="afdeling_navn" data-testid="afdeling-select">
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
                data-testid="submit-user-button"
                className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white"
              >
                Opret bruger
              </Button>
            </form>
          </DialogContent>
        </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Samlet saldo for alle hold */}
      {allAfdelingerStats && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Samlet nuværende saldo for alle hold</p>
                <p className="text-3xl md:text-4xl font-bold text-green-900">
                  {allAfdelingerStats.aktuelt_saldo.toFixed(2)} kr.
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-slate-600 font-medium mb-1">Total Indtægter</p>
                  <p className="text-lg font-semibold text-green-700">
                    {allAfdelingerStats.total_indtaegter.toFixed(2)} kr.
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 font-medium mb-1">Total Udgifter</p>
                  <p className="text-lg font-semibold text-red-600">
                    {allAfdelingerStats.total_udgifter.toFixed(2)} kr.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alle afdelinger med saldi */}
      {allAfdelingerStats && allAfdelingerStats.afdelinger_saldi && allAfdelingerStats.afdelinger_saldi.length > 0 && (
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Alle Hold - Saldi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Afdeling</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Nuværende Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAfdelingerStats.afdelinger_saldi.map((afdeling) => (
                    <TableRow
                      key={afdeling.afdeling_id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="font-medium">{afdeling.afdeling_navn}</TableCell>
                      <TableCell className="text-right font-data">
                        <span className={afdeling.aktuelt_saldo >= 0 ? 'text-green-700' : 'text-red-600'}>
                          {afdeling.aktuelt_saldo.toFixed(2)} kr.
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="font-semibold text-slate-700">Saldo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Posteringer</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    data-testid={`user-row-${user.id}`}
                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'superbruger' ? 'bg-green-50 text-green-700' :
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {user.role === 'superbruger' ? 'Superbruger' : user.role === 'admin' ? 'Admin' : 'Afdeling'}
                      </span>
                    </TableCell>
                    <TableCell>{user.afdeling_navn || '-'}</TableCell>
                    <TableCell className="font-data">
                      {user.role === 'afdeling' && stats[user.id]
                        ? `${stats[user.id].aktuelt_saldo.toFixed(2)} kr.`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {user.role === 'afdeling' && stats[user.id] ? stats[user.id].antal_posteringer : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'afdeling' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/?afdeling_id=${user.id}`)}
                            data-testid={`view-afdeling-${user.id}`}
                            className="hover:bg-slate-100"
                          >
                            <Eye size={16} />
                          </Button>
                        )}
                        {currentUser.role === 'superbruger' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenPasswordDialog(user)}
                              data-testid={`change-password-${user.id}`}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Key size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user.id)}
                              data-testid={`delete-user-${user.id}`}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manage Afdelinger Dialog */}
      <Dialog open={showManageAfdelingerDialog} onOpenChange={setShowManageAfdelingerDialog}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Administrer Afdelinger</DialogTitle>
            <DialogDescription>
              Opret nye afdelinger eller slet eksisterende
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={() => setShowNewAfdelingDialog(true)}
              className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white"
            >
              <Plus size={18} className="mr-2" />
              Opret Ny Afdeling
            </Button>
            
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Afdelingsnavn</TableHead>
                    <TableHead className="font-semibold text-right">Handling</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {afdelinger.map((afd) => (
                    <TableRow key={afd.id}>
                      <TableCell>{afd.navn}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAfdeling(afd.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Afdeling Dialog */}
      <Dialog open={showNewAfdelingDialog} onOpenChange={setShowNewAfdelingDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Opret Ny Afdeling</DialogTitle>
            <DialogDescription>
              Tilføj en ny afdeling til systemet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-afdeling-name">Afdelingsnavn *</Label>
              <Input
                id="new-afdeling-name"
                value={newAfdelingCreate}
                onChange={(e) => setNewAfdelingCreate(e.target.value)}
                className="bg-white border-slate-200 focus:border-[#109848]"
                placeholder="F.eks. København Nord"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleCreateAfdeling}
                className="flex-1 bg-[#109848] hover:bg-[#0d7a3a] text-white"
              >
                Opret Afdeling
              </Button>
              <Button
                onClick={() => setShowNewAfdelingDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Annuller
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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