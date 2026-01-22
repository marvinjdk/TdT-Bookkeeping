import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, FileImage, Users, Calendar, ArrowUpDown, ArrowUp, ArrowDown, FileX } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyWithUnit } from '@/utils/formatNumber';

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

// Format date to DD-MM-YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // If already in DD-MM-YYYY format, return as is
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return dateStr;
  }
  // If in YYYY-MM-DD format, convert to DD-MM-YYYY
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

export default function TransactionsPage({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formalFilter, setFormalFilter] = useState('all');
  const [afdelinger, setAfdelinger] = useState([]);
  const [afdelingerMap, setAfdelingerMap] = useState({});
  const [selectedAfdelingFilter, setSelectedAfdelingFilter] = useState('all');
  const [regnskabsaarList, setRegnskabsaarList] = useState([]);
  const [selectedRegnskabsaar, setSelectedRegnskabsaar] = useState('');
  const [sortColumn, setSortColumn] = useState('bilagnr');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showMissingReceipts, setShowMissingReceipts] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isAdmin = user.role === 'admin' || user.role === 'superbruger';
  
  // Get afdeling_id or afdeling_navn from URL
  const urlAfdelingId = searchParams.get('afdeling_id');
  const urlAfdelingNavn = searchParams.get('afdeling_navn');

  useEffect(() => {
    fetchRegnskabsaar();
    if (isAdmin) {
      fetchAfdelinger();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedRegnskabsaar) {
      if (isAdmin && afdelinger.length > 0) {
        fetchTransactions();
      } else if (!isAdmin) {
        fetchTransactions();
      }
    }
  }, [afdelinger, urlAfdelingId, urlAfdelingNavn, selectedAfdelingFilter, selectedRegnskabsaar, isAdmin]);

  const fetchRegnskabsaar = async () => {
    try {
      const res = await api.get('/historik/regnskabsaar');
      const years = res.data.regnskabsaar || [];
      const currentYear = res.data.current;
      setRegnskabsaarList(years);
      if (years.length > 0) {
        // Use the current year from backend, or first in list
        setSelectedRegnskabsaar(currentYear && years.includes(currentYear) ? currentYear : years[0]);
      }
    } catch (error) {
      console.error('Kunne ikke hente regnskabsår');
    }
  };

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, typeFilter, formalFilter, sortColumn, sortDirection, showMissingReceipts]);

  const fetchAfdelinger = async () => {
    try {
      // Get afdelinger from dashboard stats (includes user_id)
      const statsRes = await api.get('/dashboard/stats');
      if (statsRes.data.afdelinger_saldi) {
        const afdelingerData = statsRes.data.afdelinger_saldi;
        setAfdelinger(afdelingerData);
        
        // Create mapping for afdeling_id (user_id) to afdeling_navn
        const mapping = {};
        afdelingerData.forEach(afd => {
          if (afd.user_id) {
            mapping[afd.user_id] = afd.afdeling_navn;
          }
        });
        setAfdelingerMap(mapping);
        
        // Set selected filter from URL if provided
        if (urlAfdelingNavn) {
          setSelectedAfdelingFilter(urlAfdelingNavn);
        } else if (urlAfdelingId) {
          // Find afdeling by ID and use its user_id
          const afd = afdelingerData.find(a => a.afdeling_id === urlAfdelingId);
          if (afd && afd.user_id) {
            setSelectedAfdelingFilter(afd.afdeling_navn);
          }
        }
      }
    } catch (error) {
      console.error('Kunne ikke hente afdelinger', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = '/transactions';
      const params = new URLSearchParams();
      
      // Add regnskabsaar filter
      if (selectedRegnskabsaar) {
        params.append('regnskabsaar', selectedRegnskabsaar);
      }
      
      if (isAdmin) {
        // Find the user_id for the selected afdeling
        if (selectedAfdelingFilter && selectedAfdelingFilter !== 'all') {
          const selectedAfd = afdelinger.find(a => a.afdeling_navn === selectedAfdelingFilter);
          if (selectedAfd && selectedAfd.user_id) {
            params.append('afdeling_id', selectedAfd.user_id);
          }
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await api.get(url);
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

    // Filter for missing receipts
    if (showMissingReceipts) {
      filtered = filtered.filter((t) => !t.kvittering_url && !t.kvittering_drive_link);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      // Handle bilagnr sorting (extract number from B001, B002, etc.)
      if (sortColumn === 'bilagnr') {
        const aNum = parseInt(aVal.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bVal.replace(/\D/g, '')) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Handle date sorting
      if (sortColumn === 'bank_dato') {
        // Convert DD-MM-YYYY or YYYY-MM-DD to sortable format
        const parseDate = (dateStr) => {
          if (!dateStr) return 0;
          if (dateStr.includes('-') && dateStr.length === 10) {
            const parts = dateStr.split('-');
            if (parts[0].length === 4) {
              // YYYY-MM-DD format
              return new Date(dateStr).getTime();
            } else {
              // DD-MM-YYYY format
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
            }
          }
          return 0;
        };
        aVal = parseDate(aVal);
        bVal = parseDate(bVal);
      }
      
      // Handle number sorting (beløb)
      if (sortColumn === 'belob') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      // Default string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(filtered);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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

  const handleAfdelingFilterChange = (value) => {
    setSelectedAfdelingFilter(value);
    // Update URL
    if (value === 'all') {
      searchParams.delete('afdeling_id');
      searchParams.delete('afdeling_navn');
    } else {
      searchParams.set('afdeling_navn', value);
      searchParams.delete('afdeling_id');
    }
    setSearchParams(searchParams);
  };

  const getAfdelingNavn = (afdelingId) => {
    return afdelingerMap[afdelingId] || 'Ukendt';
  };

  if (loading && !isAdmin) {
    return <div className="p-8">Indlæser...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-12 space-y-6" data-testid="transactions-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Posteringer</h1>
          <p className="text-base md:text-lg text-slate-600 mt-2">
            {isAdmin 
              ? (selectedAfdelingFilter !== 'all' ? `Posteringer for ${selectedAfdelingFilter}` : 'Alle posteringer')
              : 'Administrer dine bogføringsposteringer'
            }
            {selectedRegnskabsaar && ` (${selectedRegnskabsaar})`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Regnskabsår selector */}
          {regnskabsaarList.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              <Select value={selectedRegnskabsaar} onValueChange={setSelectedRegnskabsaar}>
                <SelectTrigger className="w-[160px] bg-white border-slate-200" data-testid="regnskabsaar-select">
                  <SelectValue placeholder="Vælg år" />
                </SelectTrigger>
                <SelectContent>
                  {regnskabsaarList.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {!isAdmin && (
            <Button
              onClick={() => navigate('/transactions/new')}
              data-testid="new-transaction-button"
              className="bg-[#109848] hover:bg-[#0d7a3a] text-white shadow-sm transition-all active:scale-95 w-full sm:w-auto"
            >
              <Plus size={18} className="mr-2" />
              Ny postering
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {/* Admin: Afdeling filter */}
            {isAdmin && (
              <Select value={selectedAfdelingFilter} onValueChange={handleAfdelingFilterChange}>
                <SelectTrigger data-testid="afdeling-filter" className="bg-white border-slate-200 focus:ring-2 focus:ring-[#109848]/20">
                  <Users size={18} className="mr-2 text-slate-400" />
                  <SelectValue placeholder="Vælg hold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle hold</SelectItem>
                  {afdelinger.map((afd) => (
                    <SelectItem key={afd.afdeling_id} value={afd.afdeling_navn}>
                      {afd.afdeling_navn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
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
              <SelectTrigger data-testid="type-filter" className="bg-white border-slate-200 focus:ring-2 focus:ring-[#109848]/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle typer</SelectItem>
                <SelectItem value="indtaegt">Indtægt</SelectItem>
                <SelectItem value="udgift">Udgift</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formalFilter} onValueChange={setFormalFilter}>
              <SelectTrigger data-testid="formal-filter" className="bg-white border-slate-200 focus:ring-2 focus:ring-[#109848]/20">
                <SelectValue placeholder="Formål" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle formål</SelectItem>
                {FORMAL_OPTIONS.map((formal) => (
                  <SelectItem key={formal} value={formal}>
                    {formal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Checkbox for missing receipts */}
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
            <Checkbox 
              id="missing-receipts" 
              checked={showMissingReceipts}
              onCheckedChange={setShowMissingReceipts}
              className="border-slate-300 data-[state=checked]:bg-[#109848] data-[state=checked]:border-[#109848]"
            />
            <Label 
              htmlFor="missing-receipts" 
              className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <FileX size={16} className="text-orange-500" />
              Vis kun posteringer uden bilag
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Posteringsoversigt
            <span className="ml-2 text-base font-normal text-slate-500">
              ({filteredTransactions.length} {filteredTransactions.length === 1 ? 'postering' : 'posteringer'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Indlæser posteringer...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {isAdmin && selectedAfdelingFilter === 'all' 
                ? 'Vælg et hold for at se posteringer, eller skift til "Alle hold" for at se alle'
                : 'Ingen posteringer fundet'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    {isAdmin && selectedAfdelingFilter === 'all' && (
                      <TableHead className="font-semibold text-slate-700">Hold</TableHead>
                    )}
                    <TableHead 
                      className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('bilagnr')}
                    >
                      <div className="flex items-center gap-1">
                        Bilagnr.
                        {sortColumn === 'bilagnr' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('bank_dato')}
                    >
                      <div className="flex items-center gap-1">
                        Bank dato
                        {sortColumn === 'bank_dato' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('tekst')}
                    >
                      <div className="flex items-center gap-1">
                        Tekst
                        {sortColumn === 'tekst' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('formal')}
                    >
                      <div className="flex items-center gap-1">
                        Formål
                        {sortColumn === 'formal' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('belob')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Beløb
                        {sortColumn === 'belob' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-slate-700 text-center cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Type
                        {sortColumn === 'type' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="text-slate-400" />}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Kvit.</TableHead>
                    {!isAdmin && (
                      <TableHead className="font-semibold text-slate-700 text-right">Handlinger</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                      data-testid={`transaction-row-${transaction.id}`}
                    >
                      {isAdmin && selectedAfdelingFilter === 'all' && (
                        <TableCell className="font-medium text-slate-600">
                          <span className="px-2 py-1 rounded bg-slate-100 text-xs">
                            {getAfdelingNavn(transaction.afdeling_id)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-slate-800">{transaction.bilagnr}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(transaction.bank_dato)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-700" title={transaction.tekst}>
                        {transaction.tekst}
                      </TableCell>
                      <TableCell className="text-slate-600">{transaction.formal}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={transaction.type === 'indtaegt' ? 'text-[#109848]' : 'text-red-600'}>
                          {transaction.type === 'indtaegt' ? '+' : '-'}{formatCurrencyWithUnit(transaction.belob)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'indtaegt'
                              ? 'bg-[#109848]/10 text-[#109848]'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {transaction.type === 'indtaegt' ? 'Indtægt' : 'Udgift'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {transaction.kvittering_url ? (
                          <a
                            href={`${process.env.REACT_APP_BACKEND_URL}${transaction.kvittering_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 rounded hover:bg-blue-50 text-blue-600"
                            title="Download kvittering"
                          >
                            <FileImage size={18} />
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      {!isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
                              data-testid={`edit-button-${transaction.id}`}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(transaction.id)}
                              data-testid={`delete-button-${transaction.id}`}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
