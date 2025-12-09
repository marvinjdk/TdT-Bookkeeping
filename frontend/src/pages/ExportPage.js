import { useState } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPage({ user }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
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
      a.download = `bogforing_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="export-page">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Eksporter</h1>
        <p className="text-lg text-slate-600 mt-2">Download bogføringsdata til Excel</p>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Excel eksport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-600">
            Download alle dine posteringer til en Excel-fil. Filen indeholder alle kolonner (Bilagnr., Bank dato, Tekst, Formål, Beløb, Type) og kan bruges til regnskab eller videre behandling.
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Hvad inkluderes?</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              <li>Alle posteringer for dit regnskab</li>
              <li>Sorteret efter bank dato</li>
              <li>Formateret til regnskabsbrug</li>
            </ul>
          </div>

          <Button
            onClick={handleExport}
            data-testid="export-button"
            disabled={loading}
            className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95"
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