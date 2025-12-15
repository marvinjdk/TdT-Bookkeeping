import { useState, useEffect } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPage({ user }) {
  const [loading, setLoading] = useState(false);
  const [afdelinger, setAfdelinger] = useState([]);
  const [selectedAfdeling, setSelectedAfdeling] = useState('all');
  const [regnskabsaarList, setRegnskabsaarList] = useState([]);
  const [selectedRegnskabsaar, setSelectedRegnskabsaar] = useState('current');

  useEffect(() => {
    if (user.role === 'admin') {
      fetchAfdelinger();
      fetchRegnskabsaar();
    }
  }, [user]);

  const fetchAfdelinger = async () => {
    try {
      const res = await api.get('/admin/users');
      const afdelingUsers = res.data.filter(u => u.role === 'afdeling');
      setAfdelinger(afdelingUsers);
    } catch (error) {
      console.error('Kunne ikke hente afdelinger');
    }
  };

  const fetchRegnskabsaar = async () => {
    try {
      const res = await api.get('/historik/regnskabsaar');
      setRegnskabsaarList(res.data.regnskabsaar || []);
    } catch (error) {
      console.error('Kunne ikke hente regnskabsår');
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedAfdeling !== 'all') {
        params.append('afdeling_id', selectedAfdeling);
      }
      
      const response = await fetch(`${api.defaults.baseURL}/export/excel?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Export fejlede');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = selectedAfdeling === 'all' 
        ? `tour_de_taxa_alle_hold_${new Date().toISOString().split('T')[0]}.xlsx`
        : `tour_de_taxa_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel-fil downloadet!');
    } catch (error) {
      toast.error('Kunne ikke eksportere til Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="export-page">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Eksporter</h1>
        <p className="text-base md:text-lg text-slate-600 mt-2">Download bogføringsdata til Excel</p>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Excel eksport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-600">
            Download posteringer til en Excel-fil. Filen indeholder alle kolonner (Hold, Bilagnr., Bank dato, Tekst, Formål, Beløb, Type) plus startsaldo og aktuel saldo.
          </p>

          {user.role === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="afdeling-select" className="text-slate-700 font-medium">Vælg hold</Label>
              <Select value={selectedAfdeling} onValueChange={setSelectedAfdeling}>
                <SelectTrigger id="afdeling-select" data-testid="afdeling-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Alle hold (separate ark)</SelectItem>
                  {afdelinger.map((afd) => (
                    <SelectItem key={afd.id} value={afd.id}>
                      {afd.afdeling_navn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Hvad inkluderes?</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              <li>Startsaldo i øverste række</li>
              <li>Alle posteringer sorteret efter bank dato</li>
              <li>Aktuel saldo beregnet (startsaldo + indtægter - udgifter)</li>
              {user.role === 'admin' && selectedAfdeling === 'all' && (
                <>
                  <li>Separate faneblade per hold</li>
                  <li>Samlet ark med alle posteringer</li>
                </>
              )}
            </ul>
          </div>

          <Button
            onClick={handleExport}
            data-testid="export-button"
            disabled={loading}
            className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
          >
            {loading ? 'Eksporterer...' : (
              <>
                <Download size={18} className="mr-2" />
                Download Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}