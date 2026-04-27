import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, paymentsTable, payersTable } from "@workspace/db";
import {
  RegisterPaymentBody,
  RegisterPaymentParams,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/payers/:payerId/payments", async (req, res, next) => {
  try {
    const { payerId } = RegisterPaymentParams.parse(req.params);
    const body = RegisterPaymentBody.parse(req.body);

    const [payer] = await db
      .select()
      .from(payersTable)
      .where(eq(payersTable.id, payerId));
    if (!payer) {
      res.status(404).json({ error: "Payer not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.payerId, payerId),
          eq(paymentsTable.referenceMonth, body.referenceMonth),
        ),
      );
    if (existing) {
      res
        .status(409)
        .json({ error: "Já existe pagamento registrado para esse mês." });
      return;
    }

    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

    const [created] = await db
      .insert(paymentsTable)
      .values({
        payerId,
        referenceMonth: body.referenceMonth,
        amount: String(body.amount),
        paidAt,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      id: created.id,
      payerId: created.payerId,
      referenceMonth: created.referenceMonth,
      amount: Number(created.amount),
      paidAt: created.paidAt.toISOString(),
      notes: created.notes,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/payments/:paymentId", async (req, res, next) => {
  try {
    const { paymentId } = DeletePaymentParams.parse(req.params);
    await db.delete(paymentsTable).where(eq(paymentsTable.id, paymentId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
