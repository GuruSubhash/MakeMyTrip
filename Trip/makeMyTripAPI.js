// ==========================================
// MakeMyTrip REST API (Full Feature Version)
// ==========================================

const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const serverless = require("serverless-http");
const app = express();
app.use(cors());
app.use(express.json());

// ==================================
// IN-MEMORY STATIC DATA
// ==================================
let users = [
  { id: 1, name: "Admin", email: "admin@trip.com", password: bcrypt.hashSync("admin123", 10) },
];

let flights = [
  { id: 1, airline: "IndiGo", from: "Delhi", to: "Mumbai", departureTime: "2025-10-26T09:00:00", arrivalTime: "2025-10-26T11:00:00", price: 5500 },
  { id: 2, airline: "Air India", from: "Bangalore", to: "Chennai", departureTime: "2025-10-26T07:30:00", arrivalTime: "2025-10-26T08:30:00", price: 3200 },
  { id: 3, airline: "SpiceJet", from: "Hyderabad", to: "Pune", departureTime: "2025-10-27T10:00:00", arrivalTime: "2025-10-27T12:00:00", price: 4200 },
  { id: 4, airline: "Vistara", from: "Delhi", to: "Kolkata", departureTime: "2025-10-28T13:00:00", arrivalTime: "2025-10-28T15:30:00", price: 6300 },
  { id: 5, airline: "GoAir", from: "Chennai", to: "Delhi", departureTime: "2025-10-28T06:00:00", arrivalTime: "2025-10-28T08:45:00", price: 5800 },
  { id: 6, airline: "AirAsia", from: "Mumbai", to: "Goa", departureTime: "2025-10-29T09:00:00", arrivalTime: "2025-10-29T10:10:00", price: 3000 },
  { id: 7, airline: "IndiGo", from: "Delhi", to: "Goa", departureTime: "2025-10-29T12:00:00", arrivalTime: "2025-10-29T14:15:00", price: 7200 },
];

let hotels = [
  { id: 1, name: "Taj Palace", city: "Delhi", pricePerNight: 9500, availableRooms: 12, rating: 4.8 },
  { id: 2, name: "Marriott", city: "Mumbai", pricePerNight: 7800, availableRooms: 8, rating: 4.5 },
  { id: 3, name: "Leela Palace", city: "Bangalore", pricePerNight: 10200, availableRooms: 10, rating: 4.9 },
  { id: 4, name: "Novotel", city: "Hyderabad", pricePerNight: 6300, availableRooms: 15, rating: 4.4 },
  { id: 5, name: "Grand Hyatt", city: "Goa", pricePerNight: 8900, availableRooms: 4, rating: 4.6 },
  { id: 6, name: "Holiday Inn", city: "Pune", pricePerNight: 5800, availableRooms: 9, rating: 4.2 },
];

let bookings = [];

// ==================================
// AUTH MIDDLEWARE
// ==================================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ==================================
// AUTH ROUTES
// ==================================
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find((u) => u.email === email))
    return res.status(400).json({ message: "Email already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, name, email, password: hashed };
  users.push(newUser);
  res.json({ message: "Registered successfully", user: { id: newUser.id, name, email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email }, "secret123", { expiresIn: "1d" });
  res.json({ token });
});

app.get("/api/profile", auth, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  res.json({ id: user.id, name: user.name, email: user.email });
});

// ==================================
// FLIGHT ROUTES
// ==================================

// All flights with optional filters
app.get("/api/flights", (req, res) => {
  let { from, to, minPrice, maxPrice, sort } = req.query;
  let result = flights;

  if (from) result = result.filter((f) => f.from.toLowerCase() === from.toLowerCase());
  if (to) result = result.filter((f) => f.to.toLowerCase() === to.toLowerCase());
  if (minPrice) result = result.filter((f) => f.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter((f) => f.price <= parseInt(maxPrice));

  if (sort === "low") result = result.sort((a, b) => a.price - b.price);
  if (sort === "high") result = result.sort((a, b) => b.price - a.price);

  res.json(result);
});

app.get("/api/flights/:id", (req, res) => {
  const flight = flights.find((f) => f.id === parseInt(req.params.id));
  if (!flight) return res.status(404).json({ message: "Flight not found" });
  res.json(flight);
});

app.post("/api/flights", auth, (req, res) => {
  const newFlight = { id: flights.length + 1, ...req.body };
  flights.push(newFlight);
  res.json(newFlight);
});

// ==================================
// HOTEL ROUTES
// ==================================

// All hotels with filters
app.get("/api/hotels", (req, res) => {
  let { city, minPrice, maxPrice, name, sort } = req.query;
  let result = hotels;

  if (city) result = result.filter((h) => h.city.toLowerCase() === city.toLowerCase());
  if (name) result = result.filter((h) => h.name.toLowerCase().includes(name.toLowerCase()));
  if (minPrice) result = result.filter((h) => h.pricePerNight >= parseInt(minPrice));
  if (maxPrice) result = result.filter((h) => h.pricePerNight <= parseInt(maxPrice));

  if (sort === "low") result = result.sort((a, b) => a.pricePerNight - b.pricePerNight);
  if (sort === "high") result = result.sort((a, b) => b.pricePerNight - a.pricePerNight);

  res.json(result);
});

app.get("/api/hotels/:id", (req, res) => {
  const hotel = hotels.find((h) => h.id === parseInt(req.params.id));
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });
  res.json(hotel);
});

app.post("/api/hotels", auth, (req, res) => {
  const newHotel = { id: hotels.length + 1, ...req.body };
  hotels.push(newHotel);
  res.json(newHotel);
});

// ==================================
// BOOKING ROUTES
// ==================================
app.post("/api/bookings", auth, (req, res) => {
  const { type, itemId } = req.body;
  if (!["flight", "hotel"].includes(type))
    return res.status(400).json({ message: "Invalid booking type" });

  const newBooking = {
    id: bookings.length + 1,
    userId: req.user.id,
    type,
    itemId,
    date: new Date().toISOString(),
  };
  bookings.push(newBooking);
  res.json({ message: "Booking confirmed", booking: newBooking });
});

app.get("/api/bookings", auth, (req, res) => {
  const userBookings = bookings
    .filter((b) => b.userId === req.user.id)
    .map((b) => ({
      ...b,
      details:
        b.type === "flight"
          ? flights.find((f) => f.id === b.itemId)
          : hotels.find((h) => h.id === b.itemId),
    }));
  res.json(userBookings);
});

app.delete("/api/bookings/:id", auth, (req, res) => {
  const bookingId = parseInt(req.params.id);
  const index = bookings.findIndex((b) => b.id === bookingId && b.userId === req.user.id);
  if (index === -1) return res.status(404).json({ message: "Booking not found" });
  bookings.splice(index, 1);
  res.json({ message: "Booking cancelled successfully" });
});

// ==================================
// DASHBOARD / STATS
// ==================================
app.get("/api/stats", (req, res) => {
  res.json({
    totalUsers: users.length,
    totalFlights: flights.length,
    totalHotels: hotels.length,
    totalBookings: bookings.length,
  });
});

// ==================================
// ROOT
// ==================================
app.get("/", (req, res) => {
  res.send("🌍 MakeMyTrip REST API (Advanced Static Version) Running...");
});

// ==================================
// START SERVER
// ==================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
