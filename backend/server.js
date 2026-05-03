import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT) || 5000;
const logoPath = path.join(__dirname, "logo.png");
const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || "").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim();
const SMTP_DEBUG = String(process.env.SMTP_DEBUG || "").toLowerCase() === "true";
const SMTP_SECURE = SMTP_PORT === 465;

const app = express();
// --- CORS CONFIGURATION ---
// Allow ALL origins (simplest fix to ensure it works)
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: SMTP_DEBUG,
  debug: SMTP_DEBUG,
});

transporter.verify().catch((err) => {
  console.error("SMTP VERIFY FAILED:", err.message);
});

app.get("/", (req, res) =>
  res.send("Prime Move Logistics LLC Backend Running"),
);

app.get("/api/smtp-test", async (req, res) => {
  const configSnapshot = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    userConfigured: Boolean(SMTP_USER),
    passConfigured: Boolean(SMTP_PASS),
    adminEmailConfigured: Boolean(ADMIN_EMAIL),
  };

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(400).json({
      success: false,
      error: "SMTP config missing. Check SMTP_HOST, SMTP_USER, SMTP_PASS/BREVO_SMTP_KEY.",
      config: configSnapshot,
    });
  }

  try {
    await transporter.verify();
    res.json({ success: true, message: "SMTP authentication successful.", config: configSnapshot });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      config: configSnapshot,
    });
  }
});

// --- GENERATE LINK ROUTE ---
app.post("/api/generate-link", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      orderNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
      createdAt: new Date().toISOString(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const signingLink = `${process.env.FRONTEND_URL}/?token=${token}`;

    // Create a string list of vehicles for the email
    let vehicleString = "";
    if (req.body.vehicles && Array.isArray(req.body.vehicles)) {
      vehicleString = req.body.vehicles
        .map((v) => `<li>${v.year} ${v.make} ${v.model} ($${v.price})</li>`)
        .join("");
    } else {
      // Fallback
      vehicleString = `<li>${req.body.vehicleYear} ${req.body.vehicleMake} ${req.body.vehicleModel}</li>`;
    }

    try {
      await transporter.sendMail({
        from: `"Prime Move Logistics LLC Dispatch" <${ADMIN_EMAIL}>`,
        to: req.body.customerEmail,
        subject: `ACTION REQUIRED: Transport Order #${payload.orderNumber}`,
        html: `
            <div style="text-align:center; margin-bottom:24px;">
              <img src="cid:companylogo" alt="Prime Move Logistics LLC Logo" style="max-width:220px; margin-bottom:16px;" />
            </div>
            <h3>Hello ${req.body.customerName},</h3>
            <p>Your auto transport order is ready for review.</p>
            <p><b>Order #:</b> ${payload.orderNumber}</p>
            <p><b>Vehicles:</b></p>
            <ul>${vehicleString}</ul>
            <p><b>Total Price:</b> $${req.body.totalPrice}</p>
            <p>Please click the link below to review the terms, fill in your pickup/delivery details, and sign:</p>
            <p><a href="${signingLink}" style="padding: 12px 20px; background: #0f172a; color: white; text-decoration: none; border-radius: 5px;">Review & Sign Order</a></p>
        `,
        attachments: [
          {
            filename: "logo.png",
            path: logoPath,
            cid: "companylogo",
          },
        ],
      });
    } catch (emailError) {
      console.error("EMAIL ERROR:", emailError.message);
    }

    res.json({ success: true, link: signingLink });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- VERIFY ROUTE ---
app.post("/api/verify-token", (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, data: decoded });
  } catch (error) {
    res.status(401).json({ success: false, error: "Link expired" });
  }
});

// --- FINALIZE ROUTE ---
app.post("/api/finalize-contract", async (req, res) => {
  try {
    const {
      token,
      signedName,
      signatureImage,
      ipAddress,
      // Customer Contact Info
      pickupContactName,
      pickupPhone,
      pickupInstructions,
      dropContactName,
      dropPhone,
      dropInstructions,
    } = req.body;

    const jwtData = jwt.verify(token, process.env.JWT_SECRET);

    const data = {
      ...jwtData,
      pickupContactName,
      pickupPhone,
      pickupInstructions,
      dropContactName,
      dropPhone,
      dropInstructions,
    };

    const signedDate = new Date().toLocaleString();

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    // --- PDF GENERATION ---

    // 1. HEADER
    doc.rect(0, 0, 595, 80).fill("#0f172a");
    doc
      .fillColor("white")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Prime Move Logistics LLC", 30, 20);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("325 Pine St, Jersey City, NJ 07304, USA | (321) 222-3188", 30, 50);

    doc.fillColor("black").moveDown(4);

    // 2. ORDER INFO
    const startY = 100;
    doc.fontSize(10).font("Helvetica-Bold").text("CUSTOMER:", 30, startY);
    doc.font("Helvetica").text(data.customerName, 30, startY + 15);
    doc.text(`Phone: ${data.customerPhone || "N/A"}`, 30, startY + 30);
    doc.text(data.customerEmail, 30, startY + 45);

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`ORDER # ${data.orderNumber}`, 400, startY);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Date: ${new Date(data.createdAt).toLocaleDateString()}`,
        400,
        startY + 20,
      );

    doc
      .fontSize(10)
      .text(`Carrier Type: ${data.carrierType || "Open"}`, 400, startY + 40);

    // 3. PAYMENT
    const payY = startY + 70;
    doc.rect(30, payY, 535, 25).fill("#e2e8f0");
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .text("PRICE AND PAYMENT", 40, payY + 8);

    doc.fillColor("black").font("Helvetica");
    const payContentY = payY + 35;

    doc.font("Helvetica-Bold").text("Total Tariff:", 40, payContentY);
    doc.font("Helvetica").text(`$${data.totalPrice}`, 120, payContentY);

    doc.font("Helvetica-Bold").text("First Payment:", 200, payContentY);
    doc.font("Helvetica").text(`$${data.firstPayment}`, 290, payContentY);
    doc.fontSize(8).text("(Credit Card)", 200, payContentY + 12);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("COD Amount:", 400, payContentY);
    doc.font("Helvetica").text(`$${data.codPayment}`, 490, payContentY);
    doc.fontSize(8).text("(Cash/Cert. Funds)", 400, payContentY + 12);

    // 4. SHIPMENT DETAILS (Dynamic List)
    let currentY = payContentY + 40;

    doc.rect(30, currentY, 535, 25).fill("#e2e8f0");
    doc
      .fillColor("#0f172a")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("VEHICLE DETAILS", 40, currentY + 8);

    currentY += 35;

    // Table Header
    doc.fillColor("black").fontSize(9).font("Helvetica-Bold");
    doc.text("Year/Make/Model", 40, currentY);
    doc.text("Type", 250, currentY);
    doc.text("Condition", 350, currentY);
    doc.text("Price", 450, currentY);
    doc.text("Deposit", 500, currentY);

    currentY += 15;
    doc.font("Helvetica");

    // Loop through vehicles
    if (data.vehicles && Array.isArray(data.vehicles)) {
      data.vehicles.forEach((v) => {
        doc.text(`${v.year} ${v.make} ${v.model}`, 40, currentY);
        doc.text(v.type, 250, currentY);
        doc.text(v.condition, 350, currentY);
        doc.text(`$${v.price}`, 450, currentY);
        doc.text(`$${v.deposit}`, 500, currentY);
        currentY += 15;
      });
    } else {
      // Fallback for legacy
      doc.text(
        `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}`,
        40,
        currentY,
      );
      currentY += 15;
    }

    currentY += 10;

    // Dates
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("First Avail. Pickup:", 40, currentY);
    doc.font("Helvetica").text(data.pickupDate, 150, currentY);

    if (data.deliveryDate) {
      doc.font("Helvetica-Bold").text("Est. Delivery:", 300, currentY);
      doc.font("Helvetica").text(data.deliveryDate, 380, currentY);
    }

    currentY += 30;

    // 5. LOCATIONS
    const locY = currentY;

    // -- Origin --
    doc.font("Helvetica-Bold").text("ORIGIN (Pickup)", 40, locY);
    doc
      .font("Helvetica")
      .text(data.pickupContactName || "Contact N/A", 40, locY + 15);

    // Pickup Address with Street
    doc.text(data.pickupStreet || "", 40, locY + 30);
    doc.text(
      `${data.pickupCity}, ${data.pickupState} ${data.pickupZip}`,
      40,
      locY + 45,
    );

    doc.text(`Phone: ${data.pickupPhone || "N/A"}`, 40, locY + 60);
    if (data.pickupInstructions) {
      doc.fontSize(8).text(`Note: ${data.pickupInstructions}`, 40, locY + 75, {
        width: 220,
      });
    }

    // -- Destination --
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("DESTINATION (Delivery)", 300, locY);
    doc
      .font("Helvetica")
      .text(data.dropContactName || "Contact N/A", 300, locY + 15);

    // Drop Address with Street
    doc.text(data.dropStreet || "", 300, locY + 30);
    doc.text(
      `${data.dropCity}, ${data.dropState} ${data.dropZip}`,
      300,
      locY + 45,
    );

    doc.text(`Phone: ${data.dropPhone || "N/A"}`, 300, locY + 60);
    if (data.dropInstructions) {
      doc
        .fontSize(8)
        .text(`Note: ${data.dropInstructions}`, 300, locY + 75, { width: 220 });
    }

    // 6. SIGNATURE SECTION
    // Calculate position based on previous content
    let sigY = locY + 100;

    // Check if we need a new page
    if (sigY > 700) {
      doc.addPage();
      sigY = 50;
    }

    doc.rect(30, sigY, 535, 120).stroke();

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("DIGITAL SIGNATURE CERTIFICATE", 40, sigY + 10);
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        'By selecting "I Agree" and entering my full name as a binding electronic signature, I understand that an electronic signature has the same legal effect and can be enforced in the same way as a written signature. Furthermore, I hereby accept terms and conditions of service as described in the "Terms and Conditions" section below.',
        40,
        sigY + 25,
        { width: 515 },
      );

    doc.fontSize(10).text(`Electronic Signature: ${signedName}`, 40, sigY + 65);
    doc.text(`Signature IP Address: ${ipAddress}`, 40, sigY + 80);
    doc.text(`Signed On: ${signedDate}`, 300, sigY + 80);

    // Image handling
    if (signatureImage && signatureImage.startsWith("data:image")) {
      try {
        doc.image(signatureImage, 300, sigY + 45, { fit: [150, 30] });
      } catch (imageError) {
        doc.text("(Signed Digitally)", 300, sigY + 55);
      }
    }

    // 7. TERMS
    doc.addPage();
    doc.rect(0, 0, 595, 50).fill("#e2e8f0");
    doc
      .fillColor("#0f172a")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("TERMS AND CONDITIONS", 30, 20);

    doc.fillColor("black").fontSize(9).font("Helvetica");
    const terms = [
      "1. Payment: Payment terms are as specified in the quote. Customer agrees to pay according to the payment schedule provided.",
      "2. Vehicle Condition: Vehicle must be in operable condition and ready for pickup at the specified location and time.",
      "3. Personal Items: Customer is responsible for removing all personal items from the vehicle. Prime Move Logistics LLC is not responsible for any items left in the vehicle.",
      "4. Delivery Timeframe: Delivery timeframes are estimates based on distance and weather conditions. While we strive for on-time delivery, exact dates cannot be guaranteed.",
      "5. Vehicle Inspection: Customer must inspect vehicle upon delivery and report any issues immediately. Any damage claims must be noted on the Bill of Lading at time of delivery.",
      "6. Mechanical Issues: Prime Move Logistics LLC is not responsible for mechanical failures, battery issues, or pre-existing damage during transport.",
      "7. Contact Information: Customer agrees to provide accurate contact information and be available for communication during pickup and delivery.",
      "8. Cancellation: Cancellations must be made in writing. Cancellation fees may apply as per our cancellation policy.",
      "9. Insurance: Basic carrier liability insurance is included. Additional insurance options are available upon request.",
      "10. Legal Agreement: This electronic signature constitutes a legally binding agreement between the customer and Prime Move Logistics LLC.",
    ];

    let termY = 70;
    terms.forEach((term) => {
      doc.text(term, 30, termY, { width: 535 });
      termY += doc.heightOfString(term, { width: 535 }) + 8;
    });

    doc.end();

    const pdfBuffer = await new Promise((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(buffers))),
    );

    // Send final email with PDF (do not fail customer submission if SMTP is down)
    let emailSent = true;
    let emailError = null;
    try {
      await transporter.sendMail({
        from: `"Prime Move Logistics LLC" <${ADMIN_EMAIL}>`,
        to: [data.customerEmail, ADMIN_EMAIL],
        subject: `SIGNED ORDER #${data.orderNumber}`,
        html: `
        <div style="text-align:center; margin-bottom:24px;">
          <img src="cid:companylogo" alt="Prime Move Logistics LLC Logo" style="max-width:220px; margin-bottom:16px;" />
        </div>
        <p>Attached is the fully executed transport agreement.</p>
      `,
        attachments: [
          { filename: `Order_${data.orderNumber}.pdf`, content: pdfBuffer },
          {
            filename: "logo.png",
            path: logoPath,
            cid: "companylogo",
          },
        ],
      });
    } catch (err) {
      emailSent = false;
      emailError = err?.message || "SMTP send failed";
      console.error("FINAL EMAIL ERROR:", emailError);
    }

    res.json({ success: true, emailSent, emailError });
  } catch (error) {
    console.error("Finalize Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
