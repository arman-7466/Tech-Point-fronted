const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

const app = express();

// =====================================================
// BASIC SETTINGS
// =====================================================

const PORT = process.env.PORT || 5000;

// Apna WhatsApp number yahan likho
// Example: const ADMIN_MOBILE = "9876543210";
const ADMIN_MOBILE = process.env.ADMIN_MOBILE || "9528290865";

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// =====================================================
// DATABASE
// =====================================================

const dbPath = path.join(__dirname, "database.json");

function createDatabase() {
    return {
        users: [],
        bookings: [],
        products: []
    };
}

function getDB() {
    try {
        if (!fs.existsSync(dbPath)) {
            const newDB = createDatabase();

            fs.writeFileSync(
                dbPath,
                JSON.stringify(newDB, null, 2)
            );

            return newDB;
        }

        const file = fs.readFileSync(dbPath, "utf8");

        if (!file.trim()) {
            return createDatabase();
        }

        const db = JSON.parse(file);

        return {
            users: Array.isArray(db.users) ? db.users : [],
            bookings: Array.isArray(db.bookings) ? db.bookings : [],
            products: Array.isArray(db.products) ? db.products : []
        };

    } catch (error) {
        console.error("Database read error:", error);
        return createDatabase();
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(
            dbPath,
            JSON.stringify(data, null, 2)
        );

        return true;

    } catch (error) {
        console.error("Database save error:", error);
        return false;
    }
}

// =====================================================
// WHATSAPP
// =====================================================

let latestQR = null;
let whatsappReady = false;

const whatsapp = new Client({
    authStrategy: new LocalAuth({
        clientId: "tech-point"
    }),

    puppeteer: {
        headless: true,

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu"
        ]
    }
});

// QR generated
whatsapp.on("qr", async (qr) => {

    latestQR = qr;
    whatsappReady = false;

    console.log("");
    console.log("======================================");
    console.log("📱 WHATSAPP QR CODE GENERATED");
    console.log("======================================");
    console.log("Open:");
    console.log(`http://localhost:${PORT}/qr`);
    console.log("======================================");
    console.log("");
});

// WhatsApp ready
whatsapp.on("ready", () => {

    latestQR = null;
    whatsappReady = true;

    console.log("");
    console.log("======================================");
    console.log("✅ WHATSAPP CONNECTED");
    console.log("✅ Tech Point WhatsApp Bot Ready");
    console.log("======================================");
    console.log("");
});

// Auth failure
whatsapp.on("auth_failure", (message) => {

    whatsappReady = false;

    console.error("❌ WhatsApp authentication failed:");
    console.error(message);
});

// Disconnected
whatsapp.on("disconnected", (reason) => {

    whatsappReady = false;

    console.log("⚠️ WhatsApp disconnected:");
    console.log(reason);
});

// Initialize WhatsApp
whatsapp.initialize();

// =====================================================
// OTP
// =====================================================

let currentOTP = null;
let otpCreatedAt = null;

function generateOTP() {

    return Math.floor(
        1000 + Math.random() * 9000
    ).toString();
}

// OTP expires after 5 minutes
function isOTPValid(otp) {

    if (!currentOTP || !otpCreatedAt) {
        return false;
    }

    const fiveMinutes = 5 * 60 * 1000;

    if (Date.now() - otpCreatedAt > fiveMinutes) {

        currentOTP = null;
        otpCreatedAt = null;

        return false;
    }

    return otp === currentOTP;
}

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Tech Point Backend is running perfectly!",
        whatsapp: whatsappReady ? "connected" : "disconnected",
        time: new Date().toISOString()
    });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        server: "online",
        whatsapp: whatsappReady,
        uptime: process.uptime()
    });
});

// =====================================================
// WHATSAPP STATUS
// =====================================================

app.get("/api/whatsapp-status", (req, res) => {

    res.json({
        success: true,
        connected: whatsappReady
    });
});

// =====================================================
// WHATSAPP QR PAGE
// =====================================================

app.get("/qr", async (req, res) => {

    if (whatsappReady) {

        return res.send(`
            <!DOCTYPE html>

            <html>

            <head>
                <title>Tech Point WhatsApp</title>

                <style>

                    body {
                        font-family: Arial;
                        background: #f5f5f5;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }

                    .card {
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    }

                    .success {
                        color: green;
                        font-size: 22px;
                    }

                </style>

            </head>

            <body>

                <div class="card">

                    <div class="success">
                        ✅ WhatsApp Connected
                    </div>

                    <p>
                        Tech Point WhatsApp Bot is ready.
                    </p>

                </div>

            </body>

            </html>
        `);
    }

    if (!latestQR) {

        return res.send(`
            <html>

            <head>

                <meta http-equiv="refresh" content="5">

                <title>WhatsApp QR</title>

            </head>

            <body style="
                font-family:Arial;
                text-align:center;
                padding-top:100px;
            ">

                <h2>⏳ WhatsApp QR generate ho raha hai...</h2>

                <p>5 seconds baad page automatically refresh hoga.</p>

            </body>

            </html>
        `);
    }

    try {

        const qrImage = await QRCode.toDataURL(latestQR);

        res.send(`
            <!DOCTYPE html>

            <html>

            <head>

                <title>Tech Point WhatsApp QR</title>

                <meta http-equiv="refresh" content="15">

                <style>

                    body {
                        font-family: Arial;
                        background: #f3f4f6;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }

                    .card {
                        background: white;
                        padding: 30px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    }

                    img {
                        width: 280px;
                        height: 280px;
                        border: 5px solid #eee;
                        border-radius: 12px;
                    }

                </style>

            </head>

            <body>

                <div class="card">

                    <h2>📱 Tech Point WhatsApp</h2>

                    <p>
                        WhatsApp → Linked Devices → Link a Device
                    </p>

                    <img src="${qrImage}" />

                    <p>
                        QR automatically refresh hoga.
                    </p>

                </div>

            </body>

            </html>
        `);

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "QR generate nahi ho paya."
        );
    }
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, email aur password required hain."

            });
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const db = getDB();

        const existingUser = db.users.find(
            user =>
                user.email &&
                user.email.toLowerCase() === cleanEmail
        );

        if (existingUser) {

            return res.status(409).json({

                success: false,

                message:
                    "Ye email already registered hai."

            });
        }

        // Password hash
        const hashedPassword =
            await bcrypt.hash(password, 10);

        const newUser = {

            id: Date.now().toString(),

            name: name.trim(),

            email: cleanEmail,

            phone: phone || "",

            password: hashedPassword,

            createdAt:
                new Date().toISOString()

        };

        db.users.push(newUser);

        saveDB(db);

        console.log(
            "[USER REGISTERED]",
            newUser.email
        );

        res.status(201).json({

            success: true,

            message:
                "Account successfully create ho gaya.",

            user: {

                id: newUser.id,

                name: newUser.name,

                email: newUser.email,

                phone: newUser.phone

            }

        });

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Server error."

        });
    }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email aur password required hain."

            });
        }

        const db = getDB();

        const cleanEmail =
            email.trim().toLowerCase();

        const user = db.users.find(
            u =>
                u.email &&
                u.email.toLowerCase() === cleanEmail
        );

        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Email ya password galat hai."

            });
        }

        let passwordMatch = false;

        // New hashed passwords
        if (
            user.password &&
            user.password.startsWith("$2")
        ) {

            passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

        } else {

            // Old account compatibility
            passwordMatch =
                password === user.password;

            // Upgrade old password
            if (passwordMatch) {

                user.password =
                    await bcrypt.hash(
                        password,
                        10
                    );

                saveDB(db);
            }
        }

        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Email ya password galat hai."

            });
        }

        res.json({

            success: true,

            message:
                "Login successful.",

            user: {

                id: user.id,

                name: user.name,

                email: user.email,

                phone: user.phone

            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Server error."

        });
    }
});

// =====================================================
// HOME SERVICE BOOKING
// =====================================================

app.post("/api/booking", (req, res) => {

    try {

        const {
            name,
            phone,
            model,
            problem,
            service,
            address,
            pickupTime
        } = req.body;

        if (
            !name ||
            !phone ||
            !model ||
            !problem ||
            !address
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Sabhi required fields bharein."

            });
        }

        const jobId =
            "TP-" +
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        const db = getDB();

        const booking = {

            jobId,

            orderId: jobId,

            name,

            phone,

            model,

            problem,

            service:
                service || "Home Pickup",

            address,

            pickupTime:
                pickupTime || "Asap",

            status: "Pending",

            date:
                new Date().toLocaleString("en-IN"),

            createdAt:
                new Date().toISOString()

        };

        db.bookings.push(booking);

        saveDB(db);

        console.log(
            "[BOOKING]",
            jobId
        );

        res.json({

            success: true,

            message:
                "Booking confirmed!",

            jobId,

            booking

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Booking create nahi ho saki."

        });
    }
});

// =====================================================
// REPAIR STATUS
// =====================================================

app.get("/api/status/:query", (req, res) => {

    try {

        const query =
            req.params.query
                .trim()
                .toLowerCase();

        const db = getDB();

        const booking =
            db.bookings.find(b =>

                (
                    b.jobId &&
                    b.jobId.toLowerCase() === query
                )

                ||

                (
                    b.phone &&
                    b.phone.toLowerCase() === query
                )

            );

        if (!booking) {

            return res.status(404).json({

                success: false,

                message:
                    "Galat Job ID ya booking nahi mili."

            });
        }

        res.json({

            success: true,

            jobId: booking.jobId,

            name: booking.name,

            phone: booking.phone,

            model: booking.model,

            problem: booking.problem,

            service: booking.service,

            status:
                booking.status || "Pending",

            date: booking.date

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Server error."

        });
    }
});

// =====================================================
// ADMIN - ALL DATA
// =====================================================

app.get("/api/get-all-data", (req, res) => {

    const db = getDB();

    res.json({

        success: true,

        bookings: db.bookings || [],

        users: db.users || [],

        products: db.products || []

    });
});

// =====================================================
// ADMIN - BOOKINGS
// =====================================================

app.get("/api/admin/bookings", (req, res) => {

    const db = getDB();

    res.json({

        success: true,

        bookings:
            db.bookings || []

    });
});

// =====================================================
// ADMIN - UPDATE STATUS
// =====================================================

app.post("/api/update-status", (req, res) => {

    try {

        const {
            jobId,
            orderId,
            newStatus,
            status
        } = req.body;

        const targetId =
            jobId || orderId;

        const updateStatus =
            newStatus || status;

        if (!targetId || !updateStatus) {

            return res.status(400).json({

                success: false,

                message:
                    "Job ID aur status required hai."

            });
        }

        const db = getDB();

        const booking =
            db.bookings.find(
                b =>
                    b.jobId === targetId ||
                    b.orderId === targetId
            );

        if (!booking) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found."

            });
        }

        booking.status =
            updateStatus;

        booking.updatedAt =
            new Date().toISOString();

        saveDB(db);

        console.log(
            `[STATUS UPDATED] ${targetId} → ${updateStatus}`
        );

        res.json({

            success: true,

            message:
                "Status updated successfully!",

            booking

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Status update nahi ho saka."

        });
    }
});

// =====================================================
// ADMIN OTP - GENERATE
// =====================================================

app.post(
    "/api/admin/generate-otp",
    async (req, res) => {

        try {

            const {
                phone
            } = req.body;

            if (!phone) {

                return
                res.status(400).json({

                    success: false,

                    message:
                        "Mobile number required hai."

                });
            }

            if (
                phone.replace(/\D/g, "") !==
                ADMIN_MOBILE.replace(/\D/g, "")
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Ye Admin Mobile Number nahi hai!"

                });
            }

            currentOTP =
                generateOTP();

            otpCreatedAt =
                Date.now();

            // WhatsApp disconnected
            if (!whatsappReady) {

                console.log(
                    "⚠️ WhatsApp connected nahi hai."
                );

                console.log(
                    "DEV OTP:",
                    currentOTP
                );

                return res.json({

                    success: false,

                    message:
                        "WhatsApp connected nahi hai. Pehle WhatsApp QR scan karein."

                });
            }

            const formattedPhone =
                "91" +
                ADMIN_MOBILE.replace(
                    /\D/g,
                    ""
                ) +
                "@c.us";

            await whatsapp.sendMessage(

                formattedPhone,

                `🔐 *Tech Point Admin Login OTP*

Aapka verification code hai:

*${currentOTP}*

Ye OTP 5 minutes ke liye valid hai.`

            );

            console.log(
                "[OTP SENT]"
            );

            res.json({

                success: true,

                message:
                    "OTP aapke WhatsApp par bhej diya gaya hai."

            });

        } catch (error) {

            console.error(
                "OTP Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "OTP send nahi ho saka."

            });
        }
    }
);

// =====================================================
// ADMIN OTP - VERIFY
// =====================================================

app.post(
    "/api/admin/verify-otp",
    (req, res) => {

        try {

            const {
                userOtp
            } = req.body;

            if (!isOTPValid(userOtp)) {

                return res.json({

                    success: false,

                    message:
                        "OTP galat ya expire ho gaya hai."

                });
            }

            // OTP reset
            currentOTP = null;
            otpCreatedAt = null;

            res.json({

                success: true,

                message:
                    "Admin login successful.",

                token:
                    "techpoint_admin_secret_key"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "OTP verification error."

            });
        }
    }
);

// =====================================================
// PRODUCTS
// =====================================================

// Get products
app.get("/api/products", (req, res) => {

    const db = getDB();

    res.json({

        success: true,

        products:
            db.products || []

    });
});

// Add product
app.post("/api/products", (req, res) => {

    try {

        const {
            name,
            price,
            category,
            description,
            image,
            stock
        } = req.body;

        if (!name || price === undefined) {

            return res.status(400).json({

                success: false,

                message:
                    "Product name aur price required hain."

            });
        }

        const db = getDB();

        const product = {

            id:
                Date.now().toString(),

            name,

            price:
                Number(price),

            category:
                category || "Accessories",

            description:
                description || "",

            image:
                image || "",

            stock:
                Number(stock || 0),

            createdAt:
                new Date().toISOString()

        };

        db.products.push(product);

        saveDB(db);

        res.status(201).json({

            success: true,

            message:
                "Product added successfully.",

            product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Product add nahi ho saka."

        });
    }
});

// =====================================================
// AI CHATBOT
// =====================================================

app.post("/api/ai-chat", (req, res) => {

    const {
        message
    } = req.body;

    const msg =
        (message || "")
            .toLowerCase()
            .trim();

    let reply =
        "Mujhe iska answer samajh nahi aaya. Aap Tech Point se contact kar sakte hain ya Home Service book kar sakte hain.";

    // -----------------------------------------------
    // SOFTWARE
    // -----------------------------------------------

    if (
        msg.includes("hang") ||
        msg.includes("slow") ||
        msg.includes("lag")
    ) {

        reply =
            "Agar phone hang ya slow ho raha hai to storage check karein, unnecessary apps delete karein aur phone restart karein. Problem continue rahe to Tech Point par repair ke liye contact karein.";

    }

    else if (
        msg.includes("storage full") ||
        msg.includes("memory full")
    ) {

        reply =
            "Storage full hone par unused videos/photos delete karein, unnecessary apps remove karein aur apps ka cache clear karein.";

    }

    else if (
        msg.includes("app crash") ||
        msg.includes("app band")
    ) {

        reply =
            "App crash ho raha hai to pehle app update karein. Agar problem continue ho to app ko uninstall karke dobara install karein.";

    }

    else if (
        msg.includes("network") ||
        msg.includes("wifi") ||
        msg.includes("sim")
    ) {

        reply =
            "Network problem ke liye Airplane Mode ON/OFF karein, phone restart karein aur SIM ko dobara check karein.";

    }

    else if (
        msg.includes("battery") ||
        msg.includes("battery drain")
    ) {

        reply =
            "Battery jaldi khatam ho rahi hai to background apps check karein, brightness kam rakhein aur battery health check karayein. Zarurat ho to Tech Point par battery replacement available hai.";

    }

    // -----------------------------------------------
    // REPAIR
    // -----------------------------------------------

    else if (
        msg.includes("display") ||
        msg.includes("screen") ||
        msg.includes("touch")
    ) {

        reply =
            "Ji haan, Tech Point par display, screen aur touch related repair/replacement service available hai.";

    }

    else if (
        msg.includes("charging") ||
        msg.includes("charge")
    ) {

        reply =
            "Charging port repair aur replacement service available hai.";

    }

    else if (
        msg.includes("speaker")
    ) {

        reply =
            "Speaker ki cleaning, repair aur replacement service available hai.";

    }

    else if (
        msg.includes("camera")
    ) {

        reply =
            "Camera problem ke liye Tech Point par camera checking aur repair service available hai.";

    }

    // -----------------------------------------------
    // PRODUCTS
    // -----------------------------------------------

    else if (
        msg.includes("cover") ||
        msg.includes("case")
    ) {

        reply =
            "Tech Point par iPhone, Samsung, Redmi, Realme, Vivo aur dusre popular models ke mobile covers available hain.";

    }

    else if (
        msg.includes("charger")
    ) {

        reply =
            "Different mobile models ke chargers aur charging accessories available hain.";

    }

    else if (
        msg.includes("earphone") ||
        msg.includes("earbuds")
    ) {

        reply =
            "Tech Point par earphones, earbuds aur other mobile accessories available hain.";

    }

    // -----------------------------------------------
    // HOME SERVICE
    // -----------------------------------------------

    else if (
        msg.includes("home service") ||
        msg.includes("pickup") ||
        msg.includes("booking")
    ) {

        reply =
            "Home Service book karne ke liye website ke Home Service page par form fill karein. Booking ke baad aapko Job ID milegi.";

    }

    else if (
        msg.includes("status") ||
        msg.includes("track") ||
        msg.includes("job id")
    ) {

        reply =
            "Repair status check karne ke liye Repair Status page par apni Job ID ya registered phone number enter karein.";

    }

    // -----------------------------------------------
    // LOCATION
    // -----------------------------------------------

    else if (
        msg.includes("address") ||
        msg.includes("location") ||
        msg.includes("kahan")
    ) {

        reply =
            "Tech Point: Bhujpura, New Bijli Ghar ke peeche, Peeple ke ped ke paas, Aligarh.";

    }

    // -----------------------------------------------
    // GREETING
    // -----------------------------------------------

    else if (
        msg === "hi" ||
        msg === "hello" ||
        msg === "hii" ||
        msg.includes("namaste")
    ) {

        reply =
            "Hello 👋 Tech Point me aapka welcome hai! Aap repair, accessories ya Home Service ke baare me pooch sakte hain.";

    }

    res.json({

        success: true,

        reply

    });
});

// =====================================================
// 404 ROUTE
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message:
            "API route nahi mila."

    });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {

    console.error(
        "SERVER ERROR:",
        error
    );

    res.status(500).json({

        success: false,

        message:
            "Internal server error."

    });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("🚀 TECH POINT BACKEND");
    console.log("======================================");
    console.log(
        `🌐 Server: http://localhost:${PORT}`
    );
    console.log(
        `📱 WhatsApp QR: http://localhost:${PORT}/qr`
    );
    console.log(
        `❤️ Health: http://localhost:${PORT}/api/health`
    );
    console.log("======================================");
    console.log("");

});
