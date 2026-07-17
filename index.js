const express = require("express");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

// socket.io needs a proper CORS options object, not a boolean.
// `cors: true` is not a valid option and can cause the browser's
// WebSocket/polling handshake from your frontend (e.g. localhost:3000
// or 5173) to be rejected.
const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})
const app = express()

app.use(bodyParser.json())

const emailToSocketMapping = new Map()
const socketToEmailMapping = new Map()

io.on("connection", socket => {
    console.log("New Connection")                   //signaling server (handling events on server)
    socket.on("joined-room", (data) => {
        const { email, room_id } = data
        console.log("user", email, "joined room", room_id)
        emailToSocketMapping.set(email, socket.id)
        socketToEmailMapping.set(socket.id, email)
        socket.join(room_id)
        socket.emit("joined-room", { room_id, email })
        socket.broadcast.to(room_id).emit("user-joined", { email })
    })
    socket.on('call-user', (data) => {
        const { email, offer } = data
        const fromEmail = socketToEmailMapping.get(socket.id)
        const socketId = emailToSocketMapping.get(email)
        socket.to(socketId).emit('incoming-call', { from: fromEmail, offer })
        console.log("call user and incoming call emitted")
    })
    socket.on("call-accepted", (data) => {
        const { email, ans } = data
        const socketId = emailToSocketMapping.get(email)
        socket.to(socketId).emit("call-accepted", { ans })
    })

    socket.on("disconnect", () => {
        const email = socketToEmailMapping.get(socket.id)
        if (email) {
            emailToSocketMapping.delete(email)
        }
        socketToEmailMapping.delete(socket.id)
    })
})

app.listen(8000, () => { console.log("Server is running on port 8000") })
io.listen(8001)

