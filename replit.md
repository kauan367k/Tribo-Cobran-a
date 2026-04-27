# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### cobranca (web app)

Brazilian monthly billing tracker — "Cobrança Mensal por Cidades". Organizes payers (pagantes) by city, with monthly payment status (paid / pending / overdue) based on each city's due day.

- **Path**: `artifacts/cobranca`, served at `/`, port `18444`
- **Stack**: React + Vite + Tailwind v4, shadcn/ui, wouter, react-query, react-hook-form + zod, sonner toasts, zustand (global month picker), date-fns (pt-BR)
- **API client**: generated hooks from `@workspace/api-client-react` (Orval)
- **Locale**: all UI text in Brazilian Portuguese; currency formatted as BRL (`Intl.NumberFormat("pt-BR")`)
- **Theme**: teal/emerald "financial planner" palette
- **Pages**: `/` dashboard, `/cidades/:cityId` city detail
- **Key files**:
  - `src/App.tsx` — routing + providers
  - `src/components/layout.tsx` — header with global month picker
  - `src/pages/dashboard.tsx` — summary cards, cities grid, recent activity
  - `src/pages/city-detail.tsx` — payer list with mark-paid / undo / edit / delete
  - `src/components/dialogs/*` — city, payer, payment, confirm dialogs
  - `src/lib/format.ts` — BRL currency + pt-BR date helpers
  - `src/hooks/use-month.ts` — zustand store for global reference month

### api-server

Express 5 REST API for cobranca. Routes: `/api/cities`, `/api/cities/:id`, `/api/payers`, `/api/payments`, `/api/dashboard`, `/api/activity`. Validation via Zod schemas from `@workspace/api-zod`.

### Database

Tables: `cities` (name, dueDay, notes), `payers` (cityId FK, name, monthlyAmount, contact, notes), `payments` (payerId FK, referenceMonth `YYYY-MM`, amount, paidAt, notes). Unique index on `(payer_id, reference_month)`. Cascade deletes from city → payers → payments.
