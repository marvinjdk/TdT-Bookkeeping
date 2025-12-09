import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, FileImage } from 'lucide-react';
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

export default function TransactionsPage({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formalFilter, setFormalFilter] = useState('all');
  const [viewingAfdelingName, setViewingAfdelingName] = useState('');
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin' || user.role === 'superbruger';

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, typeFilter, formalFilter]);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (error) {
      toast.error('Kunne ikke hente posteringer');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.bilagnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.tekst.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (formalFilter !== 'all') {
      filtered = filtered.filter((t) => t.formal === formalFilter);
    }

    setFilteredTransactions(filtered);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Er du sikker på, at du vil slette denne postering?')) return;

    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Postering slettet');
      fetchTransactions();
    } catch (error) {
      toast.error('Kunne ikke slette postering');
    }
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="transactions-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Posteringer</h1>
          <p className="text-base md:text-lg text-slate-600 mt-2">Administrer dine bogføringsposteringer</p>
        </div>
        <Button
          onClick={() => navigate('/transactions/new')}
          data-testid="new-transaction-button"
          className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
        >
          <Plus size={18} className="mr-2" />
          Ny postering
        </Button>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Søg efter bilagnr. eller tekst..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-input"
                className="pl-10 bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Alle typer</SelectItem>
                <SelectItem value="indtaegt">Indtægt</SelectItem>
                <SelectItem value="udgift">Udgift</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formalFilter} onValueChange={setFormalFilter}>
              <SelectTrigger data-testid="formal-filter">
                <SelectValue placeholder="Formål" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                <SelectItem value="all">Alle formål</SelectItem>
                {FORMAL_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="font-semibold text-slate-700">Bilagnr.</TableHead>
                  <TableHead className="font-semibold text-slate-700">Bank dato</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tekst</TableHead>
                  <TableHead className="font-semibold text-slate-700">Formål</TableHead>
                  <TableHead className="font-semibold text-slate-700">Beløb</TableHead>
                  <TableHead className="font-semibold text-slate-700">Type</TableHead>
                  <TableHead className="font-semibold text-slate-700">Kvittering</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      Ingen posteringer fundet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      data-testid={`transaction-row-${transaction.id}`}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="font-data">{transaction.bilagnr}</TableCell>
                      <TableCell className="font-data">{transaction.bank_dato}</TableCell>
                      <TableCell>{transaction.tekst}</TableCell>
                      <TableCell>{transaction.formal}</TableCell>
                      <TableCell className="font-data font-medium">{transaction.belob.toFixed(2)} kr.</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'indtaegt'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          {transaction.type === 'indtaegt' ? 'Indtægt' : 'Udgift'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.kvittering_url && (
                          <FileImage size={18} className="text-[#109848]" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
                            data-testid={`edit-transaction-${transaction.id}`}
                            className="hover:bg-slate-100"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(transaction.id)}
                            data-testid={`delete-transaction-${transaction.id}`}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}