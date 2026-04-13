# How to Build a Real-Time Chat Application with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Real-Time, Chat, Change Stream, Socket.IO

Description: Build a scalable real-time chat application using MongoDB Change Streams and Socket.io to deliver messages instantly across connected clients.

---

## Overview

A real-time chat application requires instant message delivery, persistent message history, and presence tracking. MongoDB is well-suited for chat because of its flexible document model (accommodating different message types), Change Streams for real-time event propagation, and TTL indexes for automatic message expiry. This guide builds a chat backend using Node.js, Socket.io, and MongoDB.

## Data Schema

```javascript
// rooms collection
{
  _id: ObjectId("..."),
  name: "general",
  type: "public",         // public | private | direct
  members: ["userId1", "userId2"],
  createdAt: ISODate("...")
}

// messages collection
{
  _id: ObjectId("..."),
  roomId: ObjectId("..."),
  senderId: "userId1",
  senderName: "Alice",
  content: "Hello, world!",
  type: "text",           // text | image | file | system
  readBy: ["userId1"],
  createdAt: ISODate("2026-03-31T12:00:00Z")
}

// presence collection (TTL - expires after 60s)
{
  _id: ObjectId("..."),
  userId: "userId1",
  status: "online",
  lastSeen: ISODate("..."),
  expireAt: ISODate("...")  // TTL index on this field
}
```

## Step 1 - Set Up MongoDB Indexes

```javascript
// Efficient message retrieval by room
db.messages.createIndex({ roomId: 1, createdAt: -1 })

// Find rooms a user belongs to
db.rooms.createIndex({ members: 1 })

// TTL index for presence (auto-expire after 60 seconds)
db.presence.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })

// Text search on messages
db.messages.createIndex({ content: "text" })
```

## Step 2 - Set Up the Server

```bash
npm init -y
npm install mongodb socket.io express dotenv
```

```javascript
// server.js
require("dotenv").config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const { MongoClient, ObjectId } = require("mongodb")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: "*" }
})

const client = new MongoClient(process.env.MONGODB_URI)
let db

async function initDB() {
  await client.connect()
  db = client.db("chatapp")
  console.log("Connected to MongoDB")
}

module.exports = { app, server, io, getDb: () => db }
```

## Step 3 - Implement Chat Room Logic

```javascript
// rooms.js
const { ObjectId } = require("mongodb")

async function createRoom(db, name, type, creatorId) {
  const room = {
    name,
    type,
    members: [creatorId],
    createdAt: new Date()
  }
  const result = await db.collection("rooms").insertOne(room)
  return { ...room, _id: result.insertedId }
}

async function joinRoom(db, roomId, userId) {
  await db.collection("rooms").updateOne(
    { _id: new ObjectId(roomId) },
    { $addToSet: { members: userId } }
  )
}

async function getMessages(db, roomId, limit = 50, before = null) {
  const query = { roomId: new ObjectId(roomId) }
  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  return db.collection("messages")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
    .then(msgs => msgs.reverse())
}

async function sendMessage(db, roomId, senderId, senderName, content, type = "text") {
  const message = {
    roomId: new ObjectId(roomId),
    senderId,
    senderName,
    content,
    type,
    readBy: [senderId],
    createdAt: new Date()
  }
  const result = await db.collection("messages").insertOne(message)
  return { ...message, _id: result.insertedId }
}
```

## Step 4 - Socket.io Event Handlers

```javascript
// socket-handlers.js
const { ObjectId } = require("mongodb")
const { sendMessage, getMessages, joinRoom } = require("./rooms")

module.exports = function setupSocketHandlers(io, db) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId
    const userName = socket.handshake.auth.userName
    console.log(`User connected: ${userId}`)

    // Update presence
    db.collection("presence").updateOne(
      { userId },
      {
        $set: {
          userId,
          status: "online",
          lastSeen: new Date(),
          expireAt: new Date(Date.now() + 60000)
        }
      },
      { upsert: true }
    )

    // Join a room
    socket.on("room:join", async ({ roomId }) => {
      await joinRoom(db, roomId, userId)
      socket.join(roomId)

      // Send recent message history
      const messages = await getMessages(db, roomId)
      socket.emit("room:history", { roomId, messages })

      // Notify others
      socket.to(roomId).emit("room:user-joined", {
        roomId,
        userId,
        userName
      })
    })

    // Send a message
    socket.on("message:send", async ({ roomId, content }) => {
      try {
        const message = await sendMessage(db, roomId, userId, userName, content)

        // Broadcast to all in room (including sender)
        io.to(roomId).emit("message:new", message)
      } catch (err) {
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    // Mark messages as read
    socket.on("message:read", async ({ roomId }) => {
      await db.collection("messages").updateMany(
        { roomId: new ObjectId(roomId), readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      )
      io.to(roomId).emit("message:read-receipt", { roomId, userId })
    })

    // Typing indicator
    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:update", {
        userId,
        userName,
        isTyping: true
      })
    })

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:update", {
        userId,
        userName,
        isTyping: false
      })
    })

    socket.on("disconnect", () => {
      db.collection("presence").updateOne(
        { userId },
        { $set: { status: "offline", lastSeen: new Date() } }
      )
      console.log(`User disconnected: ${userId}`)
    })
  })
}
```

## Step 5 - Use Change Streams for Cross-Server Sync

When running multiple Socket.io servers, use Change Streams to broadcast:

```javascript
// change-stream-sync.js
async function watchMessages(db, io) {
  const changeStream = db.collection("messages").watch([
    { $match: { operationType: "insert" } }
  ])

  changeStream.on("change", (change) => {
    const message = change.fullDocument
    const roomId = message.roomId.toString()

    // Broadcast to all Socket.io servers via Redis adapter
    // or directly if single-server
    io.to(roomId).emit("message:new", message)
  })
}
```

## Step 6 - Frontend Client (Browser)

```javascript
// client.js
const socket = io("http://localhost:3000", {
  auth: { userId: "user123", userName: "Alice" }
})

// Join a room
socket.emit("room:join", { roomId: "room-abc" })

// Receive history
socket.on("room:history", ({ messages }) => {
  messages.forEach(renderMessage)
})

// Receive new messages
socket.on("message:new", (message) => {
  renderMessage(message)
  socket.emit("message:read", { roomId: message.roomId })
})

// Send a message
document.getElementById("send-btn").addEventListener("click", () => {
  const content = document.getElementById("message-input").value
  socket.emit("message:send", { roomId: currentRoomId, content })
  document.getElementById("message-input").value = ""
})
```

## Summary

Building a real-time chat application with MongoDB combines Change Streams for real-time event propagation, Socket.io for WebSocket connections, and MongoDB's flexible document model for storing messages, rooms, and presence data. TTL indexes automatically expire stale presence records, compound indexes on roomId and createdAt ensure fast message retrieval, and Change Streams enable multi-server broadcasting without a separate message broker.
