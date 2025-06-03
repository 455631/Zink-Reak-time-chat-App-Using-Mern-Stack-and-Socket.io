import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  },
  maxHttpBufferSize: 10e6, // 10 MB for larger payloads
  pingTimeout: 60000, // Increase timeout for better connection stability
});

// Used to store online users
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle errors on the socket
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    
    if (userId) {
      delete userSocketMap[userId];
      console.log(`User ${userId} disconnected`);
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Debug socket.io events during development
if (process.env.NODE_ENV !== "production") {
  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err.req, err.code, err.message, err.context);
  });
}

export { io, app, server };