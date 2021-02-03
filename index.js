const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const http = require("http");
const { addUser, removeUser, getUser, getUserInRoom } = require("./users");

const router = require("./router");
const { Z_BEST_SPEED } = require("zlib");

const port = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(cors());
app.use(express.static(__dirname + "/build"));
io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    console.log(socket.id);
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });
});

app.use(router);

server.listen(port, () => console.log(`Server has started on port ${port}`));
