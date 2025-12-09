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
    bank_dato: '',
    tekst: '',
    formal: '',
    belob: '',
    type: 'udgift',
  });
  const [bilagnr, setBilagnr] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const res = await api.get(`/transactions/${id}`);
      setBilagnr(res.data.bilagnr);
      setFormData({
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
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="edit-transaction-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate('/transactions')}
          data-testid="back-button"
          className="hover:bg-slate-100 flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Rediger postering</h1>
          <p className="text-sm md:text-base lg:text-lg text-slate-600 mt-1">Opdater posteringsoplysninger</p>
        </div>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl font-semibold">Posteringsoplysninger</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-700">
                <strong>Bilagnummer:</strong> {bilagnr} (kan ikke ændres)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                  <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
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
                  <SelectContent position="popper">
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

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                data-testid="submit-button"
                disabled={saving}
                className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
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
                className="border-slate-200 hover:bg-slate-50 w-full sm:w-auto"
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