# How to Build a Real-Time Notification System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Notification, Change Stream, Real-Time, WebSocket

Description: Build a scalable real-time notification system using MongoDB Change Streams to push updates to users as events occur in your application.

---

## Overview

A notification system needs to store notification records, deliver them in real-time to connected users, and track read/unread status. MongoDB is a natural fit: Change Streams trigger delivery when a notification document is inserted, and TTL indexes can automatically purge old notifications. This guide builds a full notification system with MongoDB, Node.js, and Server-Sent Events (SSE).

## Data Schema

```javascript
// notifications collection
{
  _id: ObjectId("..."),
  userId: "user-123",
  type: "order_shipped",       // order_shipped | mention | like | comment | system
  title: "Your order has shipped",
  body: "Order #12345 is on its way",
  data: {                      // extra payload for deep linking
    orderId: "order-12345",
    trackingUrl: "https://track.example.com/12345"
  },
  read: false,
  createdAt: ISODate("2026-03-31T12:00:00Z"),
  expiresAt: ISODate("2026-04-30T12:00:00Z")  // TTL
}
```

## Step 1 - Create Indexes

```javascript
// Fetch unread notifications for a user (most important query)
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 })

// TTL index - auto-delete notifications after 30 days
db.notifications.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

// Unread count per user
db.notifications.createIndex({ userId: 1, read: 1 })
```

## Step 2 - Notification Service

```javascript
// notification-service.js
const { MongoClient, ObjectId } = require("mongodb")

class NotificationService {
  constructor(db) {
    this.db = db
    this.collection = db.collection("notifications")
  }

  async create(userId, type, title, body, data = {}) {
    const notification = {
      userId,
      type,
      title,
      body,
      data,
      read: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
    const result = await this.collection.insertOne(notification)
    return { ...notification, _id: result.insertedId }
  }

  async getForUser(userId, limit = 20, skip = 0) {
    return this.collection.find(
      { userId },
      { sort: { createdAt: -1 }, limit, skip }
    ).toArray()
  }

  async getUnreadCount(userId) {
    return this.collection.countDocuments({ userId, read: false })
  }

  async markAsRead(userId, notificationId) {
    return this.collection.updateOne(
      { _id: new ObjectId(notificationId), userId },
      { $set: { read: true } }
    )
  }

  async markAllAsRead(userId) {
    return this.collection.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    )
  }

  async delete(userId, notificationId) {
    return this.collection.deleteOne({
      _id: new ObjectId(notificationId),
      userId
    })
  }
}

module.exports = NotificationService
```

## Step 3 - Real-Time Delivery with Change Streams

```javascript
// notification-stream.js
class NotificationStreamManager {
  constructor(db) {
    this.db = db
    this.userStreams = new Map() // userId -> Set of SSE response objects
    this.changeStream = null
  }

  async start() {
    const pipeline = [
      {
        $match: {
          operationType: "insert",
          "fullDocument.userId": { $exists: true }
        }
      }
    ]

    this.changeStream = this.db.collection("notifications").watch(pipeline, {
      fullDocument: "required"
    })

    this.changeStream.on("change", (change) => {
      const notification = change.fullDocument
      const { userId } = notification

      // Push to all connected clients for this user
      const userConnections = this.userStreams.get(userId)
      if (userConnections) {
        const payload = JSON.stringify(notification)
        for (const res of userConnections) {
          res.write(`data: ${payload}\n\n`)
        }
      }
    })

    console.log("Notification change stream started")
  }

  addConnection(userId, res) {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Set())
    }
    this.userStreams.get(userId).add(res)
  }

  removeConnection(userId, res) {
    const connections = this.userStreams.get(userId)
    if (connections) {
      connections.delete(res)
      if (connections.size === 0) {
        this.userStreams.delete(userId)
      }
    }
  }
}
```

## Step 4 - SSE Endpoint (Express)

```javascript
// routes/notifications.js
const express = require("express")
const router = express.Router()

router.get("/stream", authenticate, (req, res) => {
  const userId = req.user.id

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.flushHeaders()

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`)

  // Register connection
  streamManager.addConnection(userId, res)

  // Send current unread count on connect
  notificationService.getUnreadCount(userId).then(count => {
    res.write(`data: ${JSON.stringify({ type: "unread_count", count })}\n\n`)
  })

  // Clean up on disconnect
  req.on("close", () => {
    streamManager.removeConnection(userId, res)
  })
})

router.get("/", authenticate, async (req, res) => {
  const { limit = 20, skip = 0 } = req.query
  const notifications = await notificationService.getForUser(
    req.user.id,
    parseInt(limit),
    parseInt(skip)
  )
  res.json(notifications)
})

router.patch("/:id/read", authenticate, async (req, res) => {
  await notificationService.markAsRead(req.user.id, req.params.id)
  res.json({ success: true })
})

router.patch("/read-all", authenticate, async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id)
  res.json({ updated: result.modifiedCount })
})
```

## Step 5 - Trigger Notifications from Business Logic

```javascript
// order-service.js
async function shipOrder(db, orderId) {
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) })

  // Update order status
  await db.collection("orders").updateOne(
    { _id: new ObjectId(orderId) },
    { $set: { status: "shipped", shippedAt: new Date() } }
  )

  // Create notification - Change Stream will deliver it in real-time
  await notificationService.create(
    order.userId,
    "order_shipped",
    "Your order has shipped!",
    `Order #${order.orderNumber} is on its way. Expected delivery: 3-5 business days.`,
    {
      orderId: orderId,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber
    }
  )
}
```

## Step 6 - Frontend SSE Client

```javascript
// notifications-client.js
class NotificationClient {
  constructor(authToken) {
    this.authToken = authToken
    this.eventSource = null
  }

  connect() {
    // Close any existing connection before reconnecting
    if (this.eventSource) {
      this.eventSource.close()
    }

    // EventSource does not support custom headers, so pass the token
    // as a query parameter. The server must read it from the query string.
    this.eventSource = new EventSource(
      `/api/notifications/stream?token=${encodeURIComponent(this.authToken)}`
    )

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "connected") {
        console.log("Connected to notification stream")
      } else if (data.type === "unread_count") {
        updateUnreadBadge(data.count)
      } else if (data.userId) {
        // It's a notification document
        showToast(data.title, data.body)
        incrementUnreadBadge()
      }
    }

    this.eventSource.onerror = () => {
      this.eventSource.close()
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000)
    }
  }
}

const notifClient = new NotificationClient(localStorage.getItem("token"))
notifClient.connect()
```

## Summary

A MongoDB-backed notification system uses Change Streams to watch for newly inserted notification documents and push them to connected clients via Server-Sent Events in real-time. The system is stateful at the stream level (each server maintains user-to-connection mappings) and persistent at the database level (notifications stored with TTL expiry). Separating notification creation from delivery through Change Streams decouples business logic from the delivery mechanism, making it easy to add email or push channels alongside the real-time stream.
