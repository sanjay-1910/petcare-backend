require('./scheduler');
require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
// const fetch = require("node-fetch");


const app = express();
const port = 5002;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.use(cors({
  origin: [
    "http://localhost:5500",
    "https://petcare-frontend-psi.vercel.app",
    "https://petcare-frontend-git-main-pynala-sanjays-projects.vercel.app",
    "https://petcare-frontend-b5lxrjwzx-pynala-sanjays-projects.vercel.app"
  ],
  credentials: false
}));

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// DB Keep-alive ping
setInterval(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ DB keep-alive ping successful');
  } catch (err) {
    console.error('❌ DB keep-alive ping failed:', err.message);
  }
}, 5 * 60 * 1000);

// 🔐 Register
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into DB
    const [result] = await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" } // match login token expiry
    );

    // ✅ Consistent response structure with login
    res.status(201).json({
      success: true,
      userId: userId,
      token: token,
      message: "User registered successfully"
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
});


// 🔐 Login
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) return res.status(400).json({ message: "All fields are required" });

//   try {
//     const [results] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
//     if (results.length === 0) return res.status(401).json({ message: "User not found" });

//     const user = results[0];
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

//     const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });
//     res.status(200).json({ message: "Login successful", token, userId: user.id });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ message: "Database error" });
//   }
// });

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const [results] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

    if (results.length === 0)
      return res.status(401).json({ message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: "Incorrect password" });

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    // ✅ Send full token-based response
    res.json({
      success: true,
      userId: user.id,
      token: token,
      message: "Login successful"
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// 🔐 Logout
app.post("/logout", (req, res) => {
  // Optional: Log the logout attempt
  console.log("Logout request received");

  // Just respond — actual token removal is done on client-side (localStorage)
  res.status(200).json({ success: true, message: "User logged out successfully (client should clear JWT)" });
});


// ✅ Update Profile
// app.post("/updateProfile", authenticateToken, async (req, res) => {
//   const userId = req.user.id;
//   const { name, email, profile_picture } = req.body;

//   try {
//     await db.query("UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?", [name, email, profile_picture, userId]);
//     res.json({ success: true, message: "Profile updated successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Database update failed" });
//   }
// });


app.post("/updateProfile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body; // ❌ removed profile_picture (it's handled separately via file upload)

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  try {
    await db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, userId]);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, message: "Database update failed" });
  }
});


// // ✅ Update Profile Picture
// app.post("/updateProfilePicture", authenticateToken, upload.single("profile_picture"), async (req, res) => {
//   const userId = req.user.id;
//   if (!req.file) return res.status(400).json({ success: false, message: "Invalid data" });

//   try {
//     await db.query("UPDATE users SET profile_picture = ? WHERE id = ?", [req.file.buffer, userId]);
//     res.json({ success: true, message: "Profile picture updated successfully!" });
//   } catch (error) {
//     console.error("Database error:", error);
//     res.status(500).json({ success: false, message: "Database update failed" });
//   }
// });

// // ✅ Get Profile Picture
// app.get("/profilePicture/:userId", async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const [result] = await db.query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
//     if (!result.length || !result[0].profile_picture) return res.status(404).json({ message: "No profile picture found" });

//     res.setHeader("Content-Type", "image/png");
//     res.send(result[0].profile_picture);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error retrieving profile picture" });
//   }
// });

// // ✅ Save Pet Profile
// app.post("/savePetProfile", authenticateToken, async (req, res) => {
//   const userId = req.user.id;
//   const { pet_name, pet_type, pet_breed, pet_age, pet_weight } = req.body;

//   try {
//     await db.query("INSERT INTO pets (user_id, pet_name, pet_type, pet_breed, pet_age, pet_weight) VALUES (?, ?, ?, ?, ?, ?)", [userId, pet_name, pet_type, pet_breed, pet_age, pet_weight]);
//     res.json({ success: true, message: "Pet profile saved successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to save pet profile" });
//   }
// });

// // ✅ Get User + Pet Details
// app.get("/user/:id", async (req, res) => {
//   const userId = req.params.id;
//   try {
//     const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
//     const [petRows] = await db.query("SELECT * FROM pets WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]);
//     if (!userRows.length) return res.status(404).json({ message: "User not found" });

//     res.status(200).json({ user: userRows[0], pets: petRows });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // ✅ Vaccine Appointment
// app.post('/api/schedule-vaccine', authenticateToken, (req, res) => {
//   const userId = req.user.id;
//   const { pet_type, vaccine_name, appointment_date, appointment_time } = req.body;

//   if (!pet_type || !vaccine_name || !appointment_date || !appointment_time) {
//     return res.status(400).json({ success: false, message: 'Missing required fields.' });
//   }

//   const sql = `INSERT INTO user_vaccine_schedule (user_id, pet_type, vaccine_name, appointment_date, appointment_time)
//                VALUES (?, ?, ?, ?, ?)`;

//   db.query(sql, [userId, pet_type, vaccine_name, appointment_date, appointment_time], (err) => {
//     if (err) {
//       console.error('Database insert error:', err.message);
//       return res.status(500).json({ success: false, message: 'Database error' });
//     }
//     res.json({ success: true, message: 'Vaccine appointment scheduled successfully' });
//   });
// });


// ✅ Update Profile Picture
app.post("/updateProfilePicture", authenticateToken, upload.single("profile_picture"), async (req, res) => {
  const userId = req.user.id;
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file provided" });
  }

  try {
    await db.query("UPDATE users SET profile_picture = ? WHERE id = ?", [req.file.buffer, userId]);
    res.json({ success: true, message: "Profile picture updated successfully!" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: "Database update failed" });
  }
});

// ✅ Serve Profile Picture
app.get("/profilePicture/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [result] = await db.query("SELECT profile_picture FROM users WHERE id = ?", [userId]);

    if (!result.length || !result[0].profile_picture) {
      return res.status(404).json({ success: false, message: "No profile picture found" });
    }

    res.setHeader("Content-Type", "image/png");
    res.send(result[0].profile_picture);
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).json({ success: false, message: "Error retrieving profile picture" });
  }
});

// ✅ Save Pet Profile (authenticated)
app.post("/savePetProfile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { pet_name, pet_type, pet_breed, pet_age, pet_weight } = req.body;

  if (!pet_name || !pet_type || !pet_breed || !pet_age || !pet_weight) {
    return res.status(400).json({ success: false, message: "All pet fields are required." });
  }

  try {
    await db.query(
      "INSERT INTO pets (user_id, pet_name, pet_type, pet_breed, pet_age, pet_weight) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, pet_name, pet_type, pet_breed, pet_age, pet_weight]
    );

    res.json({ success: true, message: "Pet profile saved successfully" });
  } catch (error) {
    console.error("Pet profile save error:", error);
    res.status(500).json({ success: false, message: "Failed to save pet profile" });
  }
});

// ✅ Get User + Pet Data (authenticated)
app.get("/user/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [petRows] = await db.query("SELECT * FROM pets WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]);

    res.status(200).json({
      success: true,
      user: userRows[0],
      pets: petRows
    });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Vaccine Appointment Scheduling (authenticated)
app.post("/api/schedule-vaccine", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { pet_type, vaccine_name, appointment_date, appointment_time } = req.body;

  if (!pet_type || !vaccine_name || !appointment_date || !appointment_time) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const sql = `
    INSERT INTO user_vaccine_schedule (user_id, pet_type, vaccine_name, appointment_date, appointment_time)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    await db.query(sql, [userId, pet_type, vaccine_name, appointment_date, appointment_time]);
    res.json({ success: true, message: "Vaccine appointment scheduled successfully" });
  } catch (error) {
    console.error("Vaccine schedule error:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});


const fetch = require("node-fetch"); // ✅ Proper fetch import
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Autocomplete route
app.get('/api/places/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.status(400).json({ error: 'Input parameter is required' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error_message) {
      return res.status(400).json({ error: data.error_message });
    }

    res.json(data);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch autocomplete suggestions' });
  }
});

// Veterinary hospital search
app.post('/api/search/veterinary', async (req, res) => {
  const { location, placeId } = req.body;
  if (!location && !placeId) {
    return res.status(400).json({ error: 'Location or place ID is required' });
  }

  try {
    let searchUrl;

    if (placeId) {
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`;
      const placeDetailsResponse = await fetch(placeDetailsUrl);
      const placeDetailsData = await placeDetailsResponse.json();

      if (placeDetailsData.result && placeDetailsData.result.geometry) {
        const { lat, lng } = placeDetailsData.result.geometry.location;
        searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=veterinary_care&key=${GOOGLE_API_KEY}`;
      } else {
        return res.status(400).json({ error: 'Unable to get location coordinates' });
      }
    } else {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=veterinary+hospitals+near+${encodeURIComponent(location)}&key=${GOOGLE_API_KEY}`;
    }

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.error_message) {
      return res.status(400).json({ error: data.error_message });
    }

    const processedResults = data.results.map(place => ({
      ...place,
      photo_url: place.photos && place.photos[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
        : null
    }));

    res.json({ ...data, results: processedResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search veterinary hospitals' });
  }
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
