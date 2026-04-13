# How to Build a Notification System with MongoDB Atlas Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Trigger, Notification, App Service

Description: Build a real-time notification system using MongoDB Atlas database triggers that automatically send alerts when data changes in your collections.

---

## Overview

A notification system powered by Atlas triggers consists of:
1. A `notifications` collection to store notification records
2. Database triggers on source collections that detect relevant changes
3. Functions that create notification documents and dispatch them via email, SMS, or push

## Prerequisites

- MongoDB Atlas cluster with App Services enabled
- An external messaging service (SendGrid, Twilio, Firebase, etc.)

## Step 1: Design the Notifications Collection

```javascript
// notifications collection schema
{
  _id: ObjectId,
  userId: ObjectId,          // recipient
  type: String,              // "ORDER_SHIPPED", "PAYMENT_FAILED", etc.
  title: String,
  message: String,
  read: Boolean,             // false by default
  metadata: Object,          // flexible extra data
  createdAt: Date,
  sentAt: Date               // when dispatched to external service
}
```

Create the collection and a TTL index to auto-delete old notifications:

```javascript
db.notifications.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }  // 30 days
)

db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 })
```

## Step 2: Create a Shared Notification Helper Function

In App Services, create a named function `createNotification`:

```javascript
// functions/createNotification.js
exports = async function(userId, type, title, message, metadata = {}) {
  const mongodb = context.services.get("mongodb-atlas");
  const notifications = mongodb.db("appdb").collection("notifications");

  const notification = {
    userId: new BSON.ObjectId(userId.toString()),
    type,
    title,
    message,
    read: false,
    metadata,
    createdAt: new Date(),
    sentAt: null
  };

  const result = await notifications.insertOne(notification);
  return result.insertedId;
};
```

## Step 3: Create a Trigger for Order Events

```javascript
// Trigger: onOrderStatusChange
// Collection: orders, Operation: UPDATE

exports = async function(changeEvent) {
  const { fullDocument, updateDescription } = changeEvent;

  // Only react to status changes
  if (!updateDescription.updatedFields.hasOwnProperty("status")) {
    return;
  }

  const order = fullDocument;
  const status = order.status;

  const messages = {
    CONFIRMED:  { title: "Order Confirmed",  msg: `Your order #${order.orderNumber} is confirmed.` },
    SHIPPED:    { title: "Order Shipped",     msg: `Order #${order.orderNumber} is on its way!` },
    DELIVERED:  { title: "Order Delivered",   msg: `Order #${order.orderNumber} has been delivered.` }
  };

  if (!messages[status]) return;

  const { title, msg } = messages[status];

  // Create in-app notification
  await context.functions.execute("createNotification",
    order.userId,
    `ORDER_${status}`,
    title,
    msg,
    { orderId: order._id.toString(), orderNumber: order.orderNumber }
  );

  // Send email via SendGrid
  await sendEmail(order.customerEmail, title, msg);
};

async function sendEmail(to, subject, body) {
  const http = context.http;
  await http.post({
    url: "https://api.sendgrid.com/v3/mail/send",
    headers: {
      "Authorization": [`Bearer ${context.values.get("SENDGRID_API_KEY")}`],
      "Content-Type": ["application/json"]
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@myshop.com" },
      subject,
      content: [{ type: "text/plain", value: body }]
    })
  });
}
```

## Step 4: Create a Trigger for Payment Failures

```javascript
// Trigger: onPaymentFailed
// Collection: payments, Operation: INSERT
// Match Expression: { "fullDocument.status": "FAILED" }

exports = async function(changeEvent) {
  const payment = changeEvent.fullDocument;

  await context.functions.execute("createNotification",
    payment.userId,
    "PAYMENT_FAILED",
    "Payment Failed",
    `Your payment of $${payment.amount} failed. Please update your payment method.`,
    {
      paymentId: payment._id.toString(),
      amount: payment.amount,
      reason: payment.failureReason
    }
  );

  // Send SMS via Twilio for high-value failures
  if (payment.amount > 100) {
    await sendSMS(payment.userPhone,
      `Your $${payment.amount} payment failed. Log in to resolve.`);
  }
};

async function sendSMS(to, body) {
  const http = context.http;
  const accountSid = context.values.get("TWILIO_ACCOUNT_SID");
  const authToken = context.values.get("TWILIO_AUTH_TOKEN");

  await http.post({
    url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    headers: {
      "Authorization": [`Basic ${btoa(accountSid + ":" + authToken)}`],
      "Content-Type": ["application/x-www-form-urlencoded"]
    },
    body: `To=${encodeURIComponent(to)}&From=%2B15551234567&Body=${encodeURIComponent(body)}`
  });
}
```

## Step 5: Read Notifications in Your Application

```javascript
// Get unread notifications for a user
async function getUnreadNotifications(userId) {
  return db.notifications.find(
    { userId: new ObjectId(userId), read: false }
  ).sort({ createdAt: -1 }).limit(20).toArray();
}

// Mark notifications as read
async function markAsRead(userId, notificationIds) {
  await db.notifications.updateMany(
    {
      userId: new ObjectId(userId),
      _id: { $in: notificationIds.map(id => new ObjectId(id)) }
    },
    { $set: { read: true } }
  );
}
```

## Step 6: Real-Time Delivery with Change Streams

Push new notifications to connected clients using change streams:

```javascript
// Server-side: watch for new notifications for a user
const pipeline = [
  {
    $match: {
      "fullDocument.userId": userId,
      operationType: "insert"
    }
  }
];

const changeStream = db.collection("notifications").watch(pipeline, {
  fullDocument: "updateLookup"
});

changeStream.on("change", (change) => {
  const notification = change.fullDocument;
  socketio.to(userId.toString()).emit("notification", notification);
});
```

## Summary

Build a notification system in Atlas by combining database triggers that detect changes across source collections, shared helper functions that create notification documents, and external service integrations for email and SMS delivery. Store notifications in a dedicated collection with TTL and user indexes, then serve them to clients via standard queries or push them in real time using change streams.
