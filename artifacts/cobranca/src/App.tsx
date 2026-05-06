import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import CityDetailPage from "@/pages/city-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cidades/:cityId" component={CityDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const AUTH_STORAGE_KEY = "site-authenticated";
const DEFAULT_SITE_PASSWORD = "1234";

function PasswordGate({ children }: { children: ReactNode }) {
  const sitePassword =
    import.meta.env.VITE_SITE_PASSWORD?.trim() || DEFAULT_SITE_PASSWORD;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
  });

  const helperText = useMemo(() => {
    if (import.meta.env.VITE_SITE_PASSWORD?.trim()) {
      return "Digite a senha para acessar o site.";
    }

    return "Senha padrão ativa: 1234 (altere em VITE_SITE_PASSWORD).";
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === sitePassword) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      setIsAuthenticated(true);
      setError("");
      return;
    }

    setError("Senha incorreta.");
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setPassword("");
    setError("");
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={handleLogout}
          className="fixed right-4 top-4 z-50 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Sair
        </button>
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-md"
      >
        <h1 className="text-lg font-semibold text-slate-900">Entrar</h1>
        <p className="mt-1 text-sm text-slate-600">{helperText}</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Senha
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            placeholder="Digite sua senha"
          />
        </label>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Acessar
        </button>
      </form>
    </main>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PasswordGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
        </PasswordGate>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
