const { Server } = require("socket.io");

let io;
// We store sockets mapped by user ID to easily push notifications to specific users
const userSockets = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // When a user connects, they should emit their user ID to be registered
    socket.on("register", (userId) => {
      if (userId) {
        userSockets.set(userId, socket.id);
        console.log(`Socket user registered: ${userId} (${socket.id})`);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`Socket user disconnected: ${userId}`);
          break;
        }
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIo,
  emitToUser,
};
