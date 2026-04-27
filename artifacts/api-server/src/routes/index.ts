import { Router, type IRouter } from "express";
import healthRouter from "./health";
import citiesRouter from "./cities";
import payersRouter from "./payers";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(citiesRouter);
router.use(payersRouter);
router.use(paymentsRouter);

export default router;
