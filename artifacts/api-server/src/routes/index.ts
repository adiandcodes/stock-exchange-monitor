import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stockRouter from "./stock";
import resolveRouter from "./resolve";
import moversRouter from "./movers";
import searchRouter from "./search";
import cryptoRouter from "./crypto";
import newsRouter from "./news";
import metalsRouter from "./metals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stockRouter);
router.use(resolveRouter);
router.use(moversRouter);
router.use(searchRouter);
router.use(cryptoRouter);
router.use(newsRouter);
router.use(metalsRouter);

export default router;
