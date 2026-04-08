# How to Use MongoDB Change Streams with Socket.io

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Socket, Change Stream, Real-Time, Node

Description: Learn how to push MongoDB document changes to browser clients in real time using change streams as an event source and Socket.io for WebSocket delivery.

---

MongoDB change streams give you a reactive feed of database changes. Pairing them with Socket.io lets you push those changes to browser clients over WebSockets with minimal infrastructure. This is ideal for live feeds, collaborative tools, and dashboards.

## Installing Dependencies

```bash
npm install express socket.io mongoose jsonwebtoken
```

## Setting Up the Express and Socket.io Server

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
  httpServer.listen(3000, () => console.log('Server listening on port 3000'));
});
```

## Defining the Mongoose Model

```javascript
const orderSchema = new mongoose.Schema({
  customerId: mongoose.Schema.Types.ObjectId,
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered'] },
  total: Number,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    price: Number,
  }],
  updatedAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);
```

## Watching a Collection with Change Streams

```javascript
function watchOrders() {
  const pipeline = [
    {
      $match: {
        operationType: { $in: ['insert', 'update', 'replace', 'delete'] },
      },
    },
  ];

  const stream = Order.watch(pipeline, { fullDocument: 'updateLookup' });

  stream.on('change', (change) => {
    const { operationType, fullDocument, documentKey } = change;

    if (operationType === 'insert' || operationType === 'update' || operationType === 'replace') {
      // Emit to a room named after the customer
      const customerId = fullDocument.customerId.toString();
      io.to(`customer:${customerId}`).emit('order:update', {
        type: operationType,
        order: {
          id: fullDocument._id.toString(),
          status: fullDocument.status,
          total: fullDocument.total,
          updatedAt: fullDocument.updatedAt,
        },
      });

      // Also emit to an admin room
      io.to('admins').emit('order:update', { type: operationType, order: fullDocument });
    }

    if (operationType === 'delete') {
      io.to('admins').emit('order:delete', { id: documentKey._id.toString() });
    }
  });

  stream.on('error', (err) => {
    console.error('Change stream error:', err.message);
    // Reconnect after a delay
    setTimeout(watchOrders, 5000);
  });
}

mongoose.connection.once('open', watchOrders);
```

## Handling Socket.io Client Rooms

```javascript
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  // Verify JWT on connection
  const token = socket.handshake.auth.token;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    socket.role = payload.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  // Join customer-specific room
  socket.join(`customer:${socket.userId}`);

  // Admin users join the admin room
  if (socket.role === 'admin') {
    socket.join('admins');
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
```

## Browser Client

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('accessToken') },
});

socket.on('order:update', ({ type, order }) => {
  console.log(`Order ${order.id} ${type}:`, order.status);
  updateOrderInUI(order);
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

## Summary

MongoDB change streams deliver database events to your Node.js server, and Socket.io fans them out to the right browser clients via rooms. Use `fullDocument: 'updateLookup'` to receive the complete document after updates. Scope Socket.io rooms by user ID or role to avoid broadcasting sensitive data to unintended clients, and implement a reconnect strategy for the change stream to handle replica set failovers.
