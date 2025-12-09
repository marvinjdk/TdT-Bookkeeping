import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const FORMAL_OPTIONS = [
  'Ryttermøder',
  'Ørslev rytter refusion',
  'Træningsture indtægter og udgifter',
  'Indtægter og udgifter ved salg',
  'Indtægter og udgifter ved aktiviteter',
  'Billeje og indretning',
  'Brændstof',
  'Færger vejafgifter P-afgifter',
  'Forplejning',
  'Diverse',
  'Sponsorater',
];

export default function EditTransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bilagnr: '',
    bank_dato: '',
    tekst: '',
    formal: '',
    belob: '',
    type: 'udgift',
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const res = await api.get(`/transactions/${id}`);
      setFormData({
        bilagnr: res.data.bilagnr,
        bank_dato: res.data.bank_dato,
        tekst: res.data.tekst,
        formal: res.data.formal,
        belob: res.data.belob.toString(),
        type: res.data.type,
      });
    } catch (error) {
      toast.error('Kunne ikke hente postering');
      navigate('/transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        belob: parseFloat(formData.belob),
      };

      await api.put(`/transactions/${id}`, payload);
      
      // Upload file if selected
      if (file) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        await api.post(`/transactions/${id}/upload`, fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Postering opdateret!');
      navigate('/transactions');
    } catch (error) {
      toast.error('Kunne ikke opdatere postering');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="edit-transaction-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/transactions')}
          data-testid="back-button"
          className="hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Rediger postering</h1>
          <p className="text-lg text-slate-600 mt-2">Opdater posteringsoplysninger</p>
        </div>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Posteringsoplysninger</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bilagnr" className="text-slate-700 font-medium">Bilagnr. *</Label>
                <Input
                  id="bilagnr"
                  data-testid="bilagnr-input"
                  value={formData.bilagnr}
                  onChange={(e) => handleChange('bilagnr', e.target.value)}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_dato" className="text-slate-700 font-medium">Bank dato *</Label>
                <Input
                  id="bank_dato"
                  type="date"
                  data-testid="bank-dato-input"
                  value={formData.bank_dato}
                  onChange={(e) => handleChange('bank_dato', e.target.value)}
                  className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tekst" className="text-slate-700 font-medium">Tekst *</Label>
              <Input
                id="tekst"
                data-testid="tekst-input"
                value={formData.tekst}
                onChange={(e) => handleChange('tekst', e.target.value)}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="formal" className="text-slate-700 font-medium">Formål *</Label>
                <Select value={formData.formal} onValueChange={(value) => handleChange('formal', value)} required>
                  <SelectTrigger id="formal" data-testid="formal-select">
                    <SelectValue placeholder="Vælg formål" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-700 font-medium">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleChange('type', value)} required>
                  <SelectTrigger id="type" data-testid="type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indtaegt">Indtægt</SelectItem>
                    <SelectItem value="udgift">Udgift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="belob" className="text-slate-700 font-medium">Beløb (kr.) *</Label>
              <Input
                id="belob"
                type="number"
                step="0.01"
                data-testid="belob-input"
                value={formData.belob}
                onChange={(e) => handleChange('belob', e.target.value)}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-slate-700 font-medium">Upload ny kvittering (valgfrit)</Label>
              <Input
                id="file"
                type="file"
                data-testid="file-input"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
              />
              {file && <p className="text-sm text-slate-600 mt-1">Valgt fil: {file.name}</p>}
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                data-testid="submit-button"
                disabled={saving}
                className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95"
              >
                {saving ? 'Gemmer...' : (
                  <>
                    <Save size={18} className="mr-2" />
                    Gem ændringer
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/transactions')}
                data-testid="cancel-button"
                className="border-slate-200 hover:bg-slate-50"
              >
                Annuller
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}