# How to Use SCRAM Authentication with Mongoose and Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Node.js, SCRAM, Authentication

Description: Learn how to configure SCRAM-SHA-256 authentication in a Mongoose and Node.js application, including connection options, error handling, and production best practices.

---

Mongoose is the most popular MongoDB ODM for Node.js. When connecting to an authentication-enabled MongoDB instance, Mongoose uses SCRAM (Salted Challenge Response Authentication Mechanism) by default through the underlying MongoDB Node.js driver.

## Install Dependencies

```bash
npm install mongoose
```

## Basic SCRAM Authentication with Mongoose

Pass credentials in the connection string or as connection options:

```javascript
const mongoose = require("mongoose")

const uri = "mongodb://appuser:SecurePass123@db.example.com:27017/myapp?authSource=admin"

mongoose.connect(uri)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Connection failed:", err))
```

## Explicit SCRAM-SHA-256 Configuration

Specify SCRAM-SHA-256 explicitly in the connection options:

```javascript
const mongoose = require("mongoose")

const uri = process.env.MONGODB_URI

mongoose.connect(uri, {
  authMechanism: "SCRAM-SHA-256",
  authSource: "admin",
  tls: true,
  tlsCAFile: process.env.MONGO_TLS_CA
})
.then(() => console.log("MongoDB connected with SCRAM-SHA-256"))
.catch(console.error)
```

## Using Environment Variables for Credentials

```javascript
const mongoose = require("mongoose")

const {
  MONGO_HOST,
  MONGO_PORT,
  MONGO_USER,
  MONGO_PASS,
  MONGO_DB,
  MONGO_AUTH_SOURCE
} = process.env

const uri = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}`

mongoose.connect(uri, { authMechanism: "SCRAM-SHA-256" })
```

`encodeURIComponent` ensures special characters in the password do not break the URI.

## Connection with Retry Logic

Production applications should handle transient connection failures:

```javascript
const mongoose = require("mongoose")

async function connectWithRetry(uri, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {
        authMechanism: "SCRAM-SHA-256",
        authSource: "admin",
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10
      })
      console.log("MongoDB connected")
      return
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      } else {
        throw err
      }
    }
  }
}

connectWithRetry(process.env.MONGODB_URI)
```

## Define a Schema and Model

Once connected, use Mongoose normally - SCRAM authentication is transparent after the connection is established:

```javascript
const { Schema, model } = require("mongoose")

const orderSchema = new Schema({
  customerId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
})

const Order = model("Order", orderSchema)

// Create a document
const order = new Order({ customerId: "C123", amount: 99.99 })
await order.save()

// Query documents
const orders = await Order.find({ customerId: "C123" })
```

## Handle Authentication Errors

```javascript
mongoose.connection.on("error", err => {
  if (err.message.includes("Authentication failed")) {
    console.error("SCRAM authentication failed - check credentials")
    process.exit(1)
  }
  console.error("MongoDB error:", err)
})

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected - attempting reconnect")
})
```

## Verify Authentication Mechanism in Use

After connecting, check which users are authenticated on the connection:

```javascript
const client = mongoose.connection.getClient()
const result = await client.db("admin").command({ connectionStatus: 1 })
console.log("Authenticated users:", result.authInfo.authenticatedUsers)
```

## Summary

Mongoose uses SCRAM authentication transparently when credentials are provided in the connection string or options. Set `authMechanism: "SCRAM-SHA-256"` explicitly for maximum security, store credentials in environment variables, and implement retry logic with backoff for production connections. Handle `authentication failed` errors specifically to surface credential issues quickly.
