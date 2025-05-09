const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require("path");
const http = require('http'); // Required for WebSocket integration
const WebSocket = require('ws');

dotenv.config();
const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Routes
const userAuth = require('./routes/authRoutes');
const emailVerification = require('./routes/emailVerifyRoute');
const userRoutes = require('./routes/usersRoute');
const courseRoutes = require('./routes/courseRoutes.js');
const commentRoutes = require('./routes/commentRoutes.js');
const cartRoutes = require("./routes/cartRoutes.js");
const wishListRoutes = require("./routes/wishListRoutes.js");
const quizesRoutes = require("./routes/quizRoutes.js");
const AssignmentsRoutes = require("./routes/assignmentRoutes.js");
const adminRoutes = require('./routes/adminRoutes');
const { getLatestNotices } = require('./services/noticeService.js');


app.use('/api/auth', userAuth);
app.use("/api", emailVerification);
app.use("/api/users", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", commentRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishListRoutes);
app.use("/api/quizes", quizesRoutes);
app.use("/api/courses", AssignmentsRoutes);
app.use('/api/admin', adminRoutes);

// Sample Route
app.get('/', (req, res) => {
  res.send('Welcome to the LMS Backend');
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server Setup
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  const sendNotices = async () => {
    try {
      const notices = await getLatestNotices();
      ws.send(JSON.stringify({
        type: 'notices',
        data: notices
      }));
    } catch (error) {
      console.error('Error sending notices:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch notices'
      }));
    }
  };

  // Send immediately on connection
  sendNotices();

  // Update every minute (60000ms)
  const interval = setInterval(sendNotices, 60000);

  // Handle incoming messages from client
  ws.on('message', (message) => {
    console.log('Received:', message);
    // You can add message handling logic here
  });

  // Clean up on connection close
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clearInterval(interval);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});