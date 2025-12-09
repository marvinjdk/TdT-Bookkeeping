import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function LoginPage({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.access_token);
      setUser(res.data.user);
      toast.success('Login succesfuldt!');
      navigate('/');
    } catch (error) {
      toast.error('Ugyldigt brugernavn eller adgangskode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1621398945308-8bbe2fe60eb4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxkYW5pc2glMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtaW5pbWFsaXN0fGVufDB8fHx8MTc2NTI3MDkxMnww&ixlib=rb-4.1.0&q=85)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/90 border border-white/20 shadow-xl" data-testid="login-card">
        <CardHeader className="space-y-2 text-center pb-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-[#109848]">Tour de Taxa</CardTitle>
          <CardDescription className="text-slate-600">Log ind for at administrere bogføring</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Brugernavn</Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Adgangskode</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-slate-200 focus:border-[#109848] focus:ring-2 focus:ring-[#109848]/20 transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-[#109848] hover:bg-[#0d7a3a] text-white font-medium shadow-sm transition-all active:scale-95"
            >
              {loading ? 'Logger ind...' : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Log ind
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}