import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

// Google Drive feature is disabled for now - will be enabled later
const GOOGLE_DRIVE_ENABLED = false;

export default function SettingsPage({ user }) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    startsaldo: '',
    periode_start: '01-10-2024',
    periode_slut: '30-09-2025',
    regnskabsaar: '2024-2025',
  });
  
  // Google Drive state
  const [driveStatus, setDriveStatus] = useState({ connected: false });
  const [driveLoading, setDriveLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'afdeling') {
      fetchSettings();
      fetchDriveStatus();
    } else {
      setLoading(false);
    }
    
    // Check for drive connection success/error from URL params
    if (searchParams.get('drive_connected') === 'true') {
      toast.success('Google Drive tilsluttet!');
      fetchDriveStatus();
    } else if (searchParams.get('drive_error') === 'true') {
      toast.error('Kunne ikke tilslutte Google Drive');
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings({
        startsaldo: res.data.startsaldo.toString(),
        periode_start: res.data.periode_start,
        periode_slut: res.data.periode_slut,
        regnskabsaar: res.data.regnskabsaar || '2024-2025',
      });
    } catch (error) {
      toast.error('Kunne ikke hente indstillinger');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriveStatus = async () => {
    try {
      const res = await api.get('/drive/status');
      setDriveStatus(res.data);
    } catch (error) {
      console.error('Kunne ikke hente Drive status', error);
    }
  };

  const handleConnectDrive = async () => {
    setDriveLoading(true);
    try {
      const res = await api.get('/drive/connect');
      // Redirect to Google OAuth
      window.location.href = res.data.authorization_url;
    } catch (error) {
      toast.error('Kunne ikke starte Google Drive tilslutning');
      setDriveLoading(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm('Er du sikker på, at du vil afbryde Google Drive? Dine filer forbliver i Drive.')) {
      return;
    }
    
    setDriveLoading(true);
    try {
      await api.post('/drive/disconnect');
      setDriveStatus({ connected: false });
      toast.success('Google Drive afbrudt');
    } catch (error) {
      toast.error('Kunne ikke afbryde Google Drive');
    } finally {
      setDriveLoading(false);
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
      <div className="p-4 md:p-6 lg:p-12" data-testid="settings-page">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Indstillinger</h1>
        <p className="text-base md:text-lg text-slate-600 mt-2">Kun tilgængelig for afdelinger</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Indstillinger</h1>
        <p className="text-base md:text-lg text-slate-600 mt-2">Administrer regnskabsindstillinger</p>
      </div>

      {/* Google Drive Card */}
      <Card className="bg-white border border-slate-100 shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            Google Drive
          </CardTitle>
          <CardDescription>
            Gem kvitteringer direkte i din Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent>
          {driveStatus.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Google Drive er tilsluttet</p>
                  <p className="text-sm text-green-700">
                    Kvitteringer gemmes i: Tour de Taxa/Kvitteringer/{user.afdeling_navn}/{settings.regnskabsaar}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open('https://drive.google.com', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Åbn Google Drive
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnectDrive}
                  disabled={driveLoading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {driveLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CloudOff size={16} className="mr-2" />
                  )}
                  Afbryd
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <AlertCircle className="w-6 h-6 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">Google Drive er ikke tilsluttet</p>
                  <p className="text-sm text-slate-600">
                    Tilslut din Google Drive for at gemme kvitteringer i skyen
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleConnectDrive}
                disabled={driveLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                {driveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud size={18} />
                )}
                Tilslut Google Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="bg-white border border-slate-100 shadow-sm w-full">
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

            <div className="space-y-2">
              <Label htmlFor="regnskabsaar" className="text-slate-700 font-medium">Regnskabsår</Label>
              <Input
                id="regnskabsaar"
                data-testid="regnskabsaar-input"
                value={settings.regnskabsaar}
                onChange={(e) => setSettings({ ...settings, regnskabsaar: e.target.value })}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                placeholder="2024-2025"
              />
              <p className="text-sm text-slate-600">F.eks. 2024-2025</p>
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
                  placeholder="DD-MM-ÅÅÅÅ"
                />
                <p className="text-sm text-slate-600">Format: DD-MM-ÅÅÅÅ</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periode_slut" className="text-slate-700 font-medium">Periode slut</Label>
                <Input
                  id="periode_slut"
                  data-testid="periode-slut-input"
                  value={settings.periode_slut}
                  onChange={(e) => setSettings({ ...settings, periode_slut: e.target.value })}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  placeholder="DD-MM-ÅÅÅÅ"
                />
                <p className="text-sm text-slate-600">Format: DD-MM-ÅÅÅÅ</p>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="save-settings-button"
              disabled={saving}
              className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
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
