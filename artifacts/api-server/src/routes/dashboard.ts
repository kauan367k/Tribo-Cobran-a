import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, citiesTable, payersTable, paymentsTable } from "@workspace/db";
import {
  GetDashboardQueryParams,
  ListRecentActivityQueryParams,
} from "@workspace/api-zod";
import { currentReferenceMonth, isOverdue } from "../lib/dates";

const router: IRouter = Router();

router.get("/dashboard", async (req, res, next) => {
  try {
    const params = GetDashboardQueryParams.parse(req.query);
    const referenceMonth = params.referenceMonth ?? currentReferenceMonth();

    const cities = await db.select().from(citiesTable);
    const payers = await db.select().from(payersTable);
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.referenceMonth, referenceMonth));

    const cityById = new Map(cities.map((c) => [c.id, c]));
    const paymentByPayer = new Map(payments.map((p) => [p.payerId, p]));

    let expectedTotal = 0;
    let receivedTotal = 0;
    let pendingTotal = 0;
    let overdueTotal = 0;
    let paidPayers = 0;
    let pendingPayers = 0;
    let overduePayers = 0;

    for (const payer of payers) {
      const monthly = Number(payer.monthlyAmount);
      expectedTotal += monthly;
      const payment = paymentByPayer.get(payer.id);
      if (payment) {
        const paid = Number(payment.amount);
        receivedTotal += paid;
        paidPayers += 1;
      } else {
        const city = cityById.get(payer.cityId);
        const overdue = city
          ? isOverdue(referenceMonth, city.dueDay)
          : false;
        if (overdue) {
          overdueTotal += monthly;
          overduePayers += 1;
        } else {
          pendingTotal += monthly;
          pendingPayers += 1;
        }
      }
    }

    res.json({
      referenceMonth,
      citiesCount: cities.length,
      payersCount: payers.length,
      expectedTotal,
      receivedTotal,
      pendingTotal,
      overdueTotal,
      paidPayers,
      pendingPayers,
      overduePayers,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/activity", async (req, res, next) => {
  try {
    const params = ListRecentActivityQueryParams.parse(req.query);
    const limit = params.limit ?? 10;

    const rows = await db
      .select({
        paymentId: paymentsTable.id,
        payerId: paymentsTable.payerId,
        payerName: payersTable.name,
        cityId: citiesTable.id,
        cityName: citiesTable.name,
        amount: paymentsTable.amount,
        referenceMonth: paymentsTable.referenceMonth,
        paidAt: paymentsTable.paidAt,
      })
      .from(paymentsTable)
      .innerJoin(payersTable, eq(paymentsTable.payerId, payersTable.id))
      .innerJoin(citiesTable, eq(payersTable.cityId, citiesTable.id))
      .orderBy(desc(paymentsTable.paidAt))
      .limit(limit);

    res.json(
      rows.map((row) => ({
        paymentId: row.paymentId,
        payerId: row.payerId,
        payerName: row.payerName,
        cityId: row.cityId,
        cityName: row.cityName,
        amount: Number(row.amount),
        referenceMonth: row.referenceMonth,
        paidAt: row.paidAt.toISOString(),
      })),
    );
    // sql import just to keep ESM happy if unused above
    void sql;
  } catch (err) {
    next(err);
  }
});

export default router;
