import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboard,
  useListCities,
  useCreateCity,
  useListRecentActivity,
  getGetDashboardQueryKey,
  getListCitiesQueryKey,
  getListRecentActivityQueryKey,
  type CityWithSummary,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Wallet,
  AlertCircle,
  Plus,
  ChevronRight,
  Activity,
  CalendarDays,
} from "lucide-react";

import { useMonth } from "@/hooks/use-month";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CityForm } from "@/components/dialogs/city-form";
import { formatCurrency, formatMonthLabel, formatDateTime } from "@/lib/format";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

function SummaryCard({ title, value, icon, hint, tone = "default" }: SummaryCardProps) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-destructive"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CityCard({ city }: { city: CityWithSummary }) {
  const expected = city.expectedTotal || 0;
  const received = city.receivedTotal || 0;
  const progress = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0;
  return (
    <Link href={`/cidades/${city.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{city.name}</CardTitle>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Vencimento dia {city.dueDay}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {city.payersCount} {city.payersCount === 1 ? "pagante" : "pagantes"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Recebido</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(received)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Previsto</span>
              <span className="font-medium">{formatCurrency(expected)}</span>
            </div>
            {city.overdueTotal > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Em atraso</span>
                <span className="font-semibold text-destructive">
                  {formatCurrency(city.overdueTotal)}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% do mês</span>
              <span className="flex items-center gap-1">
                Ver detalhes <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const referenceMonth = useMonth((s) => s.referenceMonth);
  const queryClient = useQueryClient();
  const [openNewCity, setOpenNewCity] = useState(false);

  const dashboardQuery = useGetDashboard({ referenceMonth });
  const citiesQuery = useListCities({ referenceMonth });
  const activityQuery = useListRecentActivity({ limit: 8 });
  const createCity = useCreateCity();

  const summary = dashboardQuery.data;
  const cities = citiesQuery.data ?? [];
  const activity = activityQuery.data ?? [];

  const handleCreate = (data: { name: string; dueDay: number; notes?: string | null }) => {
    createCity.mutate(
      { data: { name: data.name, dueDay: data.dueDay, notes: data.notes ?? null } },
      {
        onSuccess: () => {
          toast.success("Cidade criada com sucesso");
          setOpenNewCity(false);
          queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Erro ao criar cidade";
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">
            Resumo de {formatMonthLabel(referenceMonth)}
          </p>
        </div>
        <Button onClick={() => setOpenNewCity(true)} data-testid="button-new-city">
          <Plus className="mr-2 h-4 w-4" />
          Nova Cidade
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardQuery.isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          <>
            <SummaryCard
              title="Recebido no Mês"
              value={formatCurrency(summary.receivedTotal)}
              icon={<Wallet className="h-4 w-4" />}
              tone="success"
              hint={`${summary.paidPayers} pagamento(s) confirmado(s)`}
            />
            <SummaryCard
              title="Em Atraso"
              value={formatCurrency(summary.overdueTotal)}
              icon={<AlertCircle className="h-4 w-4" />}
              tone="danger"
              hint={`${summary.overduePayers} pagante(s) em atraso`}
            />
            <SummaryCard
              title="Cidades"
              value={String(summary.citiesCount)}
              icon={<Building2 className="h-4 w-4" />}
              hint={`Previsto: ${formatCurrency(summary.expectedTotal)}`}
            />
            <SummaryCard
              title="Pagantes"
              value={String(summary.payersCount)}
              icon={<Users className="h-4 w-4" />}
              hint={`${summary.pendingPayers} pendente(s)`}
            />
          </>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cidades</h2>
        </div>
        {citiesQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Nenhuma cidade cadastrada</p>
                <p className="text-sm text-muted-foreground">
                  Comece criando sua primeira cidade para acompanhar as cobranças.
                </p>
              </div>
              <Button onClick={() => setOpenNewCity(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar cidade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Atividade Recente</h2>
        </div>
        <Card>
          <CardContent className="p-0">
            {activityQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              <ul className="divide-y">
                {activity.map((entry) => (
                  <li
                    key={entry.paymentId}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.payerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.cityName} · {formatDateTime(entry.paidAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-600">
                      {formatCurrency(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <CityForm
        open={openNewCity}
        onOpenChange={setOpenNewCity}
        onSubmit={handleCreate}
        isLoading={createCity.isPending}
      />
    </div>
  );
}
