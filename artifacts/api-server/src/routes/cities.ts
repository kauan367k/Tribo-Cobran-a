import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, sql, inArray } from "drizzle-orm";
import {
  db,
  citiesTable,
  payersTable,
  paymentsTable,
} from "@workspace/db";
import {
  CreateCityBody,
  UpdateCityBody,
  ListCitiesQueryParams,
  GetCityParams,
  GetCityQueryParams,
  UpdateCityParams,
  DeleteCityParams,
} from "@workspace/api-zod";
import { currentReferenceMonth, isOverdue } from "../lib/dates";

const router: IRouter = Router();

router.get("/cities", async (req, res, next) => {
  try {
    const params = ListCitiesQueryParams.parse(req.query);
    const referenceMonth = params.referenceMonth ?? currentReferenceMonth();

    const cities = await db.select().from(citiesTable).orderBy(citiesTable.name);

    if (cities.length === 0) {
      res.json([]);
      return;
    }

    const cityIds = cities.map((c) => c.id);

    const payersAgg = await db
      .select({
        cityId: payersTable.cityId,
        payersCount: sql<number>`count(*)::int`,
        expectedTotal: sql<string>`coalesce(sum(${payersTable.monthlyAmount}), 0)`,
      })
      .from(payersTable)
      .where(inArray(payersTable.cityId, cityIds))
      .groupBy(payersTable.cityId);

    const paymentsAgg = await db
      .select({
        cityId: payersTable.cityId,
        receivedTotal: sql<string>`coalesce(sum(${paymentsTable.amount}), 0)`,
      })
      .from(paymentsTable)
      .innerJoin(payersTable, eq(paymentsTable.payerId, payersTable.id))
      .where(
        sql`${paymentsTable.referenceMonth} = ${referenceMonth} and ${payersTable.cityId} in ${cityIds}`,
      )
      .groupBy(payersTable.cityId);

    const payersMap = new Map(payersAgg.map((p) => [p.cityId, p]));
    const paymentsMap = new Map(paymentsAgg.map((p) => [p.cityId, p]));

    const result = cities.map((city) => {
      const payerInfo = payersMap.get(city.id);
      const paymentInfo = paymentsMap.get(city.id);
      const payersCount = payerInfo?.payersCount ?? 0;
      const expectedTotal = Number(payerInfo?.expectedTotal ?? 0);
      const receivedTotal = Number(paymentInfo?.receivedTotal ?? 0);
      const remaining = Math.max(expectedTotal - receivedTotal, 0);
      const overdue = isOverdue(referenceMonth, city.dueDay);
      return {
        id: city.id,
        name: city.name,
        dueDay: city.dueDay,
        notes: city.notes,
        payersCount,
        expectedTotal,
        receivedTotal,
        pendingTotal: overdue ? 0 : remaining,
        overdueTotal: overdue ? remaining : 0,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/cities", async (req, res, next) => {
  try {
    const body = CreateCityBody.parse(req.body);
    const [created] = await db
      .insert(citiesTable)
      .values({
        name: body.name,
        dueDay: body.dueDay,
        notes: body.notes ?? null,
      })
      .returning();
    res.status(201).json({
      id: created.id,
      name: created.name,
      dueDay: created.dueDay,
      notes: created.notes,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/cities/:cityId", async (req, res, next) => {
  try {
    const { cityId } = GetCityParams.parse(req.params);
    const queryParams = GetCityQueryParams.parse(req.query);
    const referenceMonth = queryParams.referenceMonth ?? currentReferenceMonth();

    const [city] = await db
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.id, cityId));

    if (!city) {
      res.status(404).json({ error: "City not found" });
      return;
    }

    const payers = await db
      .select()
      .from(payersTable)
      .where(eq(payersTable.cityId, cityId))
      .orderBy(payersTable.name);

    const payerIds = payers.map((p) => p.id);

    const payments =
      payerIds.length > 0
        ? await db
            .select()
            .from(paymentsTable)
            .where(
              sql`${paymentsTable.payerId} in ${payerIds} and ${paymentsTable.referenceMonth} = ${referenceMonth}`,
            )
        : [];

    const paymentsByPayer = new Map(payments.map((p) => [p.payerId, p]));
    const overdue = isOverdue(referenceMonth, city.dueDay);

    const payersWithStatus = payers.map((payer) => {
      const payment = paymentsByPayer.get(payer.id);
      const monthlyAmount = Number(payer.monthlyAmount);
      let status: "paid" | "pending" | "overdue";
      if (payment) {
        status = "paid";
      } else if (overdue) {
        status = "overdue";
      } else {
        status = "pending";
      }
      return {
        id: payer.id,
        cityId: payer.cityId,
        name: payer.name,
        monthlyAmount,
        contact: payer.contact,
        notes: payer.notes,
        status,
        paymentId: payment?.id ?? null,
        paidAt: payment?.paidAt.toISOString() ?? null,
        paidAmount: payment ? Number(payment.amount) : null,
      };
    });

    const expectedTotal = payersWithStatus.reduce(
      (sum, p) => sum + p.monthlyAmount,
      0,
    );
    const receivedTotal = payersWithStatus.reduce(
      (sum, p) => sum + (p.paidAmount ?? 0),
      0,
    );
    const remaining = Math.max(expectedTotal - receivedTotal, 0);

    res.json({
      city: {
        id: city.id,
        name: city.name,
        dueDay: city.dueDay,
        notes: city.notes,
        payersCount: payers.length,
        expectedTotal,
        receivedTotal,
        pendingTotal: overdue ? 0 : remaining,
        overdueTotal: overdue ? remaining : 0,
      },
      referenceMonth,
      payers: payersWithStatus,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/cities/:cityId", async (req, res, next) => {
  try {
    const { cityId } = UpdateCityParams.parse(req.params);
    const body = UpdateCityBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.dueDay !== undefined) updates.dueDay = body.dueDay;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      const [city] = await db
        .select()
        .from(citiesTable)
        .where(eq(citiesTable.id, cityId));
      if (!city) {
        res.status(404).json({ error: "City not found" });
        return;
      }
      res.json({
        id: city.id,
        name: city.name,
        dueDay: city.dueDay,
        notes: city.notes,
        createdAt: city.createdAt.toISOString(),
      });
      return;
    }

    const [updated] = await db
      .update(citiesTable)
      .set(updates)
      .where(eq(citiesTable.id, cityId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "City not found" });
      return;
    }

    res.json({
      id: updated.id,
      name: updated.name,
      dueDay: updated.dueDay,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/cities/:cityId", async (req, res, next) => {
  try {
    const { cityId } = DeleteCityParams.parse(req.params);
    await db.delete(citiesTable).where(eq(citiesTable.id, cityId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
