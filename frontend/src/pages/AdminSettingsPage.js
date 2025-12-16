import { useEffect, useState } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyWithUnit } from '@/utils/formatNumber';

export default function AdminSettingsPage() {
  const [afdelingerSettings, setAfdelingerSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAfdeling, setEditingAfdeling] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startsaldo: '',
    periode_start: '',
    periode_slut: '',
    regnskabsaar: '',
  });

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      const res = await api.get('/admin/settings/all');
      setAfdelingerSettings(res.data);
    } catch (error) {
      toast.error('Kunne ikke hente indstillinger');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (afdeling) => {
    setEditingAfdeling(afdeling);
    setEditFormData({
      startsaldo: afdeling.settings.startsaldo.toString(),
      periode_start: afdeling.settings.periode_start,
      periode_slut: afdeling.settings.periode_slut,
      regnskabsaar: afdeling.settings.regnskabsaar,
    });
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/settings/${editingAfdeling.afdeling_id}`, {
        startsaldo: parseFloat(editFormData.startsaldo),
        periode_start: editFormData.periode_start,
        periode_slut: editFormData.periode_slut,
        regnskabsaar: editFormData.regnskabsaar,
      });
      toast.success('Indstillinger opdateret!');
      setEditingAfdeling(null);
      fetchAllSettings();
    } catch (error) {
      toast.error('Kunne ikke opdatere indstillinger');
    }
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="admin-settings-page">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Hold Indstillinger
        </h1>
        <p className="text-base md:text-lg text-slate-600 mt-2">
          Administrer startsaldo og perioder for alle hold
        </p>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="font-semibold text-slate-700">Hold</TableHead>
                  <TableHead className="font-semibold text-slate-700">Regnskabsår</TableHead>
                  <TableHead className="font-semibold text-slate-700">Startsaldo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Periode Start</TableHead>
                  <TableHead className="font-semibold text-slate-700">Periode Slut</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {afdelingerSettings.map((afd) => (
                  <TableRow
                    key={afd.afdeling_id}
                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="font-medium">{afd.afdeling_navn}</TableCell>
                    <TableCell>{afd.settings.regnskabsaar}</TableCell>
                    <TableCell className="font-data">{afd.settings.startsaldo.toFixed(2)} kr.</TableCell>
                    <TableCell>{afd.settings.periode_start}</TableCell>
                    <TableCell>{afd.settings.periode_slut}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(afd)}
                        className="hover:bg-slate-100"
                        data-testid={`edit-settings-${afd.afdeling_id}`}
                      >
                        <Edit size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingAfdeling} onOpenChange={(open) => !open && setEditingAfdeling(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Rediger Indstillinger</DialogTitle>
            <DialogDescription>
              Opdater indstillinger for {editingAfdeling?.afdeling_navn}
            </DialogDescription>
          </DialogHeader>
          {editingAfdeling && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startsaldo">Startsaldo (kr.) *</Label>
                <Input
                  id="edit-startsaldo"
                  type="number"
                  step="0.01"
                  value={editFormData.startsaldo}
                  onChange={(e) => setEditFormData({ ...editFormData, startsaldo: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-regnskabsaar">Regnskabsår</Label>
                <Input
                  id="edit-regnskabsaar"
                  value={editFormData.regnskabsaar}
                  onChange={(e) => setEditFormData({ ...editFormData, regnskabsaar: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848]"
                  placeholder="2024-2025"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-periode-start">Periode Start</Label>
                  <Input
                    id="edit-periode-start"
                    value={editFormData.periode_start}
                    onChange={(e) => setEditFormData({ ...editFormData, periode_start: e.target.value })}
                    className="bg-white border-slate-200 focus:border-[#109848]"
                    placeholder="DD-MM-ÅÅÅÅ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-periode-slut">Periode Slut</Label>
                  <Input
                    id="edit-periode-slut"
                    value={editFormData.periode_slut}
                    onChange={(e) => setEditFormData({ ...editFormData, periode_slut: e.target.value })}
                    className="bg-white border-slate-200 focus:border-[#109848]"
                    placeholder="DD-MM-ÅÅÅÅ"
                  />
                </div>
              </div>
              <Button
                onClick={handleSave}
                className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white"
              >
                <Save size={18} className="mr-2" />
                Gem Ændringer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
