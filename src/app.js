import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

const app = express();



app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET
}));

app.use(cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN
}));

app.use(express.json({
    limit:"10mb"
}));

app.use(express.urlencoded({
    limit:"10mb",
    extended: true
}));

app.use(express.static("public"));

app.use(cookieParser());

import authrouter from "./routes/auth_routes.js";
import doctorrouter from "./routes/doctor_routes.js";
import specialityRouter from "./routes/speciality_routes.js";
import appointmentRouter from "./routes/appointment_routes.js";
import messageRouter from "./routes/messages_routes.js";
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/auth", authrouter);
app.use("/api/v1/doctors", doctorrouter);
app.use("/api/v1/specialities", specialityRouter);
export default app;