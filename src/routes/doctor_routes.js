import { Router } from "express";
import { createDoctor, getDoctors } from "../controllers/doctor_controller.js";

const router = Router();
router.route("/get-doctors").get(getDoctors);
router.route("/post-doctor").post(createDoctor);

export default router;