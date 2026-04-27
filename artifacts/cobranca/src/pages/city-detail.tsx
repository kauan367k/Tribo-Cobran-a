import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCity,
  useUpdateCity,
  useDeleteCity,
  useCreatePayer,
  useUpdatePayer,
  useDeletePayer,
  useRegisterPayment,
  useDeletePayment,
  getGetCityQueryKey,
  getGetDashboardQueryKey,
  getListCitiesQueryKey,
  getListRecentActivityQueryKey,
  type PayerWithStatus,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Undo2,
  Phone,
  StickyNote,
  Wallet,
  Users,
  CalendarDays,
  MessageCircle,
  FileDown,
} from "lucide-react";

import { useMonth } from "@/hooks/use-month";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CityForm } from "@/components/dialogs/city-form";
import { PayerForm } from "@/components/dialogs/payer-form";
import { PaymentForm } from "@/components/dialogs/payment-form";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { formatCurrency, formatMonthLabel, formatDateTime } from "@/lib/format";
import {
  buildOverdueMessage,
  buildWhatsAppUrl,
  extractPhoneDigits,
} from "@/lib/whatsapp";
import { generateCityReport } from "@/lib/pdf-report";

const STATUS_LABEL: Record<PayerWithStatus["status"], string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Em atraso",
};

function StatusBadge({ status }: { status: PayerWithStatus["status"] }) {
  if (status === "paid") {
    return (
      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="mr-1 h-3 w-3" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <AlertTriangle className="mr-1 h-3 w-3" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export default function CityDetailPage() {
  const params = useParams<{ cityId: string }>();
  const cityId = Number(params.cityId);
  const referenceMonth = useMonth((s) => s.referenceMonth);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const cityQuery = useGetCity(cityId, { referenceMonth });

  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();
  const createPayer = useCreatePayer();
  const updatePayer = useUpdatePayer();
  const deletePayer = useDeletePayer();
  const registerPayment = useRegisterPayment();
  const deletePayment = useDeletePayment();

  const [editCityOpen, setEditCityOpen] = useState(false);
  const [confirmDeleteCityOpen, setConfirmDeleteCityOpen] = useState(false);
  const [newPayerOpen, setNewPayerOpen] = useState(false);
  const [editPayer, setEditPayer] = useState<PayerWithStatus | null>(null);
  const [confirmDeletePayer, setConfirmDeletePayer] = useState<PayerWithStatus | null>(null);
  const [paymentFor, setPaymentFor] = useState<PayerWithStatus | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetCityQueryKey(cityId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRecentActivityQueryKey() });
  };

  const handleEditCity = (data: { name: string; dueDay: number; notes?: string | null }) => {
    updateCity.mutate(
      { cityId, data: { name: data.name, dueDay: data.dueDay, notes: data.notes ?? null } },
      {
        onSuccess: () => {
          toast.success("Cidade atualizada");
          setEditCityOpen(false);
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao atualizar cidade");
        },
      }
    );
  };

  const handleDeleteCity = () => {
    deleteCity.mutate(
      { cityId },
      {
        onSuccess: () => {
          toast.success("Cidade removida");
          setConfirmDeleteCityOpen(false);
          queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListRecentActivityQueryKey() });
          navigate("/");
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao remover cidade");
        },
      }
    );
  };

  const handleCreatePayer = (data: {
    name: string;
    monthlyAmount: number;
    contact?: string | null;
    notes?: string | null;
  }) => {
    createPayer.mutate(
      {
        cityId,
        data: {
          name: data.name,
          monthlyAmount: data.monthlyAmount,
          contact: data.contact ?? null,
          notes: data.notes ?? null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pagante adicionado");
          setNewPayerOpen(false);
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao adicionar pagante");
        },
      }
    );
  };

  const handleEditPayer = (data: {
    name: string;
    monthlyAmount: number;
    contact?: string | null;
    notes?: string | null;
  }) => {
    if (!editPayer) return;
    updatePayer.mutate(
      {
        payerId: editPayer.id,
        data: {
          name: data.name,
          monthlyAmount: data.monthlyAmount,
          contact: data.contact ?? null,
          notes: data.notes ?? null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pagante atualizado");
          setEditPayer(null);
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao atualizar pagante");
        },
      }
    );
  };

  const handleDeletePayer = () => {
    if (!confirmDeletePayer) return;
    const payerId = confirmDeletePayer.id;
    deletePayer.mutate(
      { payerId },
      {
        onSuccess: () => {
          toast.success("Pagante removido");
          setConfirmDeletePayer(null);
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao remover pagante");
        },
      }
    );
  };

  const handleRegisterPayment = (data: { amount: number; notes?: string | null }) => {
    if (!paymentFor) return;
    registerPayment.mutate(
      {
        payerId: paymentFor.id,
        data: {
          amount: data.amount,
          referenceMonth,
          notes: data.notes ?? null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pagamento registrado");
          setPaymentFor(null);
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento");
        },
      }
    );
  };

  const handleUndoPayment = (payer: PayerWithStatus) => {
    if (!payer.paymentId) return;
    deletePayment.mutate(
      { paymentId: payer.paymentId },
      {
        onSuccess: () => {
          toast.success("Pagamento desfeito");
          invalidateAll();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Erro ao desfazer pagamento");
        },
      }
    );
  };

  if (cityQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (cityQuery.isError || !cityQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold">Cidade não encontrada</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao painel
          </Button>
        </Link>
      </div>
    );
  }

  const { city, payers } = cityQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{city.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              Vencimento dia {city.dueDay}
            </span>
            <span>·</span>
            <span>{formatMonthLabel(referenceMonth)}</span>
          </div>
          {city.notes && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{city.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              try {
                generateCityReport({ city, payers, referenceMonth });
                toast.success("Relatório PDF gerado");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF");
              }
            }}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={() => setEditCityOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDeleteCityOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Previsto</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(city.expectedTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recebido</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(city.receivedTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Em atraso</p>
            <p className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(city.overdueTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagantes</p>
            <p className="mt-1 text-xl font-semibold">{city.payersCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Pagantes
          </CardTitle>
          <Button onClick={() => setNewPayerOpen(true)} data-testid="button-new-payer">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pagante
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {payers.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum pagante cadastrado nesta cidade.
            </div>
          ) : (
            <ul className="divide-y">
              {payers.map((payer) => (
                <li key={payer.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{payer.name}</span>
                      <StatusBadge status={payer.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatCurrency(payer.monthlyAmount)} / mês
                      </span>
                      {payer.contact && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {payer.contact}
                        </span>
                      )}
                      {payer.paidAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Pago em {formatDateTime(payer.paidAt)}
                          {payer.paidAmount != null && ` (${formatCurrency(payer.paidAmount)})`}
                        </span>
                      )}
                    </div>
                    {payer.notes && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                        <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{payer.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payer.status === "overdue" && (() => {
                      const phone = extractPhoneDigits(payer.contact);
                      const message = buildOverdueMessage({
                        payerName: payer.name,
                        cityName: city.name,
                        amount: payer.monthlyAmount,
                        referenceMonth,
                        dueDay: city.dueDay,
                      });
                      const url = phone ? buildWhatsAppUrl(phone, message) : null;
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                          asChild={!!url}
                          disabled={!url}
                          onClick={
                            url
                              ? undefined
                              : () =>
                                  toast.error(
                                    "Adicione um telefone no contato deste pagante para enviar o lembrete."
                                  )
                          }
                          aria-label="Enviar lembrete pelo WhatsApp"
                        >
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Lembrar no WhatsApp
                            </a>
                          ) : (
                            <>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Lembrar no WhatsApp
                            </>
                          )}
                        </Button>
                      );
                    })()}
                    {payer.status === "paid" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoPayment(payer)}
                        disabled={deletePayment.isPending}
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Desfazer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setPaymentFor(payer)}
                        data-testid={`button-pay-${payer.id}`}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar como pago
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditPayer(payer)}
                      aria-label="Editar pagante"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setConfirmDeletePayer(payer)}
                      aria-label="Remover pagante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CityForm
        open={editCityOpen}
        onOpenChange={setEditCityOpen}
        initialData={{ name: city.name, dueDay: city.dueDay, notes: city.notes ?? null }}
        onSubmit={handleEditCity}
        isLoading={updateCity.isPending}
      />

      <ConfirmDialog
        open={confirmDeleteCityOpen}
        onOpenChange={setConfirmDeleteCityOpen}
        title="Remover cidade?"
        description={`A cidade "${city.name}" será removida permanentemente, junto com todos os pagantes e o histórico de pagamentos. Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        onConfirm={handleDeleteCity}
        isLoading={deleteCity.isPending}
      />

      <PayerForm
        open={newPayerOpen}
        onOpenChange={setNewPayerOpen}
        onSubmit={handleCreatePayer}
        isLoading={createPayer.isPending}
      />

      <PayerForm
        open={editPayer !== null}
        onOpenChange={(o) => !o && setEditPayer(null)}
        initialData={
          editPayer
            ? {
                name: editPayer.name,
                monthlyAmount: editPayer.monthlyAmount,
                contact: editPayer.contact ?? null,
                notes: editPayer.notes ?? null,
              }
            : undefined
        }
        onSubmit={handleEditPayer}
        isLoading={updatePayer.isPending}
      />

      <ConfirmDialog
        open={confirmDeletePayer !== null}
        onOpenChange={(o) => !o && setConfirmDeletePayer(null)}
        title="Remover pagante?"
        description={`O pagante "${confirmDeletePayer?.name ?? ""}" e todo o histórico de pagamentos dele serão removidos. Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        onConfirm={handleDeletePayer}
        isLoading={deletePayer.isPending}
      />

      <PaymentForm
        open={paymentFor !== null}
        onOpenChange={(o) => !o && setPaymentFor(null)}
        payerName={paymentFor?.name ?? ""}
        defaultAmount={paymentFor?.monthlyAmount ?? 0}
        onSubmit={handleRegisterPayment}
        isLoading={registerPayment.isPending}
      />
    </div>
  );
}
