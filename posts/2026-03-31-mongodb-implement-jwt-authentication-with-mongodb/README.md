# How to Implement JWT Authentication with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, JWT, Authentication, Security, Node.js

Description: Implement a complete JWT authentication system with MongoDB for user registration, login, token refresh, and token revocation using a denylist pattern.

---

## Introduction

JSON Web Tokens (JWTs) are a stateless authentication mechanism that pairs well with MongoDB. This guide builds a complete authentication system: user registration with bcrypt hashing, JWT issuance on login, protected route middleware, refresh tokens stored in MongoDB, and token revocation.

## Setup

```bash
npm install express bcrypt jsonwebtoken mongodb dotenv
```

## User Registration

```javascript
const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { MongoClient, ObjectId } = require("mongodb")

const app = express()
app.use(express.json())

const mongo = new MongoClient(process.env.MONGODB_URI)
await mongo.connect()
const db = mongo.db("myapp")

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body

    const existing = await db.collection("users").findOne({
      email: email.toLowerCase()
    })
    if (existing) return res.status(409).json({ error: "Email already registered" })

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await db.collection("users").insertOne({
      email: email.toLowerCase(),
      passwordHash,
      name,
      createdAt: new Date()
    })

    res.status(201).json({ userId: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: "Registration failed" })
  }
})
```

## Login and Token Issuance

```javascript
const ACCESS_TOKEN_TTL = "15m"
const REFRESH_TOKEN_TTL = "7d"

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body

  const user = await db.collection("users").findOne({
    email: email.toLowerCase()
  })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" })
  }

  const payload = { sub: user._id.toString(), email: user.email }

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  })

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL
  })

  // Store refresh token in MongoDB
  await db.collection("refreshTokens").insertOne({
    userId: user._id,
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })

  res.json({ accessToken, refreshToken })
})
```

## JWT Middleware

```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) return res.status(401).json({ error: "Access token required" })

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" })
    req.user = decoded
    next()
  })
}

// Protected route example
app.get("/me", authenticateToken, async (req, res) => {
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(req.user.sub) },
    { projection: { passwordHash: 0 } }
  )
  res.json(user)
})
```

## Token Refresh

```javascript
app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required" })

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    // Verify token exists in MongoDB and is not revoked
    const stored = await db.collection("refreshTokens").findOne({
      token: refreshToken,
      userId: new ObjectId(decoded.sub)
    })

    if (!stored) return res.status(403).json({ error: "Refresh token revoked" })

    const newAccessToken = jwt.sign(
      { sub: decoded.sub, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    )

    res.json({ accessToken: newAccessToken })
  } catch {
    res.status(403).json({ error: "Invalid refresh token" })
  }
})
```

## Logout and Token Revocation

```javascript
app.post("/auth/logout", authenticateToken, async (req, res) => {
  const { refreshToken } = req.body

  await db.collection("refreshTokens").deleteOne({
    token: refreshToken,
    userId: new ObjectId(req.user.sub)
  })

  res.json({ success: true })
})
```

Create a TTL index to auto-expire refresh tokens:

```javascript
await db.collection("refreshTokens").createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)
```

## Summary

A complete JWT authentication system with MongoDB uses short-lived access tokens (15 minutes) verified statically by the middleware, and long-lived refresh tokens (7 days) stored in MongoDB for revocation control. The MongoDB refresh token collection doubles as a revocation list - deleting a document on logout immediately invalidates that session. Add a TTL index on `expiresAt` to automatically purge expired tokens and keep the collection lean.
