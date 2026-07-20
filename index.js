const express = require("express")
const bodyParser = require("body-parser")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors");
const app = express()

app.use(bodyParser.json())

app.use(cors({origin: [
    "http://localhost:5173",
    "https://vedio-call-peach.vercel.app",
  ],
  credentials: true,
}));

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://vedio-call-peach.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const emailToSocketMapping = new Map()
const socketToEmailMapping = new Map()
const socketToRoomMapping = new Map();////////////////


io.on("connection", (socket) => {
  console.log("New Connection")

  socket.on("joined-room", ({ email, room_id }) => {
    console.log("user", email, "joined room", room_id);


     const room = io.sockets.adapter.rooms.get(room_id);
      if (room && room.size >= 2) {          //to check whether there are more than two person or not
        socket.emit("room-full")
        return
      }

    emailToSocketMapping.set(email, socket.id)
    socketToEmailMapping.set(socket.id, email)

    socket.join(room_id)
    socketToRoomMapping.set(socket.id, room_id)//////////////////

    socket.emit("joined-room", { room_id, email })

    socket.broadcast.to(room_id).emit("user-joined", { email })
  })

  socket.on("call-user", ({ email, offer }) => {
    const fromEmail = socketToEmailMapping.get(socket.id)
    const socketId = emailToSocketMapping.get(email)

    if (socketId) {
      socket.to(socketId).emit("incoming-call", {
        from: fromEmail,
        offer,
      })
    }
  })

  socket.on("call-accepted", ({ email, ans }) => {
    const socketId = emailToSocketMapping.get(email);

    if (socketId) {
      socket.to(socketId).emit("call-accepted", { ans });
    }
  })
///////////////////////////////////////////////////////////////////////////////
  socket.on("leave_room", () => {
  const roomId = socketToRoomMapping.get(socket.id);

  if (roomId) {
    socket.leave(roomId);
     socket.to(roomId).emit("user-left")////////////////
    socketToRoomMapping.delete(socket.id);
  }

  const email = socketToEmailMapping.get(socket.id);

  if (email) {
    emailToSocketMapping.delete(email);
  }

  socketToEmailMapping.delete(socket.id);
});/////////////////////////////////////////////////////////////////////////
})

const PORT = process.env.PORT || 8000;


app.get("/", (req, res) => {
  res.send("Socket.IO server is running");
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})