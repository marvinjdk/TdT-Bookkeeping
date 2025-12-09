import { useState, useEffect } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    startsaldo: '',
    periode_start: '01-10',
    periode_slut: '30-09',
  });

  useEffect(() => {
    if (user.role === 'afdeling') {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings({
        startsaldo: res.data.startsaldo.toString(),
        periode_start: res.data.periode_start,
        periode_slut: res.data.periode_slut,
      });
    } catch (error) {
      toast.error('Kunne ikke hente indstillinger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/settings', {
        ...settings,
        startsaldo: parseFloat(settings.startsaldo),
      });
      toast.success('Indstillinger gemt!');
    } catch (error) {
      toast.error('Kunne ikke gemme indstillinger');
    } finally {
      setSaving(false);
    }
  };

  if (user.role !== 'afdeling') {
    return (
      <div className="p-6 md:p-8 lg:p-12" data-testid="settings-page">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Indstillinger</h1>
        <p className="text-lg text-slate-600 mt-2">Kun tilgængelig for afdelinger</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="settings-page">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Indstillinger</h1>
        <p className="text-lg text-slate-600 mt-2">Administrer regnskabsindstillinger</p>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Regnskabsoplysninger</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="startsaldo" className="text-slate-700 font-medium">Startsaldo (kr.) *</Label>
              <Input
                id="startsaldo"
                type="number"
                step="0.01"
                data-testid="startsaldo-input"
                value={settings.startsaldo}
                onChange={(e) => setSettings({ ...settings, startsaldo: e.target.value })}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                required
              />
              <p className="text-sm text-slate-600">Startsaldo fra banken (1. oktober)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="periode_start" className="text-slate-700 font-medium">Periode start</Label>
                <Input
                  id="periode_start"
                  data-testid="periode-start-input"
                  value={settings.periode_start}
                  onChange={(e) => setSettings({ ...settings, periode_start: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  placeholder="DD-MM"
                />
                <p className="text-sm text-slate-600">Format: DD-MM</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periode_slut" className="text-slate-700 font-medium">Periode slut</Label>
                <Input
                  id="periode_slut"
                  data-testid="periode-slut-input"
                  value={settings.periode_slut}
                  onChange={(e) => setSettings({ ...settings, periode_slut: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  placeholder="DD-MM"
                />
                <p className="text-sm text-slate-600">Format: DD-MM</p>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="save-settings-button"
              disabled={saving}
              className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95"
            >
              {saving ? 'Gemmer...' : (
                <>
                  <Save size={18} className="mr-2" />
                  Gem indstillinger
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}