import { Router } from "express";
import {
    createSpeciality,
    getSpecialities,
} from "../controllers/speciality_controller.js";

const router = Router();

router.route("/get-specialities").get(getSpecialities);
router.route("/post-speciality").post(createSpeciality);

export default router;