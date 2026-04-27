import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, payersTable, paymentsTable, citiesTable } from "@workspace/db";
import {
  CreatePayerBody,
  UpdatePayerBody,
  CreatePayerParams,
  UpdatePayerParams,
  DeletePayerParams,
  ListPayerPaymentsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializePayer(payer: typeof payersTable.$inferSelect) {
  return {
    id: payer.id,
    cityId: payer.cityId,
    name: payer.name,
    monthlyAmount: Number(payer.monthlyAmount),
    contact: payer.contact,
    notes: payer.notes,
    createdAt: payer.createdAt.toISOString(),
  };
}

router.post("/cities/:cityId/payers", async (req, res, next) => {
  try {
    const { cityId } = CreatePayerParams.parse(req.params);
    const body = CreatePayerBody.parse(req.body);

    const [city] = await db
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.id, cityId));
    if (!city) {
      res.status(404).json({ error: "City not found" });
      return;
    }

    const [created] = await db
      .insert(payersTable)
      .values({
        cityId,
        name: body.name,
        monthlyAmount: String(body.monthlyAmount),
        contact: body.contact ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json(serializePayer(created));
  } catch (err) {
    next(err);
  }
});

router.patch("/payers/:payerId", async (req, res, next) => {
  try {
    const { payerId } = UpdatePayerParams.parse(req.params);
    const body = UpdatePayerBody.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.monthlyAmount !== undefined)
      updates.monthlyAmount = String(body.monthlyAmount);
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      const [payer] = await db
        .select()
        .from(payersTable)
        .where(eq(payersTable.id, payerId));
      if (!payer) {
        res.status(404).json({ error: "Payer not found" });
        return;
      }
      res.json(serializePayer(payer));
      return;
    }

    const [updated] = await db
      .update(payersTable)
      .set(updates)
      .where(eq(payersTable.id, payerId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Payer not found" });
      return;
    }

    res.json(serializePayer(updated));
  } catch (err) {
    next(err);
  }
});

router.delete("/payers/:payerId", async (req, res, next) => {
  try {
    const { payerId } = DeletePayerParams.parse(req.params);
    await db.delete(payersTable).where(eq(payersTable.id, payerId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/payers/:payerId/payments", async (req, res, next) => {
  try {
    const { payerId } = ListPayerPaymentsParams.parse(req.params);
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.payerId, payerId))
      .orderBy(desc(paymentsTable.paidAt));

    res.json(
      payments.map((p) => ({
        id: p.id,
        payerId: p.payerId,
        referenceMonth: p.referenceMonth,
        amount: Number(p.amount),
        paidAt: p.paidAt.toISOString(),
        notes: p.notes,
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
