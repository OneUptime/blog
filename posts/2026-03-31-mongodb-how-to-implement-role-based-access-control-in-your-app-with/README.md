# How to Implement Role-Based Access Control in Your App with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, RBAC, Security, Access Control, Authentication

Description: Implement role-based access control (RBAC) in your application using MongoDB to manage user permissions at the database and application level.

---

## Overview

Role-Based Access Control (RBAC) restricts system access based on roles assigned to users. MongoDB supports RBAC natively at the database level, and your application can layer its own RBAC on top. This guide covers both MongoDB's built-in RBAC for securing database access and implementing application-level RBAC to control what users can do within your app.

## Part 1 - MongoDB Built-In RBAC

### Create Custom Roles

```javascript
use myapp

// Create a read-only role for analysts
db.createRole({
  role: "analyst",
  privileges: [
    {
      resource: { db: "myapp", collection: "orders" },
      actions: ["find"]
    },
    {
      resource: { db: "myapp", collection: "products" },
      actions: ["find"]
    },
    {
      resource: { db: "myapp", collection: "" },
      actions: ["listCollections"]
    }
  ],
  roles: []
})

// Create an editor role
db.createRole({
  role: "editor",
  privileges: [
    {
      resource: { db: "myapp", collection: "products" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "myapp", collection: "categories" },
      actions: ["find", "insert", "update", "remove"]
    }
  ],
  roles: []
})

// Create an admin role that extends editor
db.createRole({
  role: "appAdmin",
  privileges: [],
  roles: ["editor", { role: "readWrite", db: "myapp" }]
})
```

### Create Users with Roles

```javascript
db.createUser({
  user: "alice",
  pwd: "AlicePassword123!",
  roles: [{ role: "editor", db: "myapp" }]
})

db.createUser({
  user: "bob",
  pwd: "BobPassword456!",
  roles: [{ role: "analyst", db: "myapp" }]
})
```

### Verify Role Permissions

```javascript
// Check privileges for a role
db.getRole("editor", { showPrivileges: true })

// Check current user's privileges
db.runCommand({ connectionStatus: 1, showPrivileges: true })
```

## Part 2 - Application-Level RBAC

### Schema Design for RBAC

```javascript
// users collection
{
  _id: ObjectId("..."),
  email: "alice@example.com",
  passwordHash: "...",
  roles: ["editor", "viewer"],
  createdAt: ISODate("...")
}

// roles collection
{
  _id: ObjectId("..."),
  name: "editor",
  permissions: [
    "products:read",
    "products:write",
    "categories:read",
    "categories:write"
  ]
}

// permissions reference
const PERMISSIONS = {
  "products:read":    { resource: "products",   action: "read" },
  "products:write":  { resource: "products",   action: "write" },
  "orders:read":     { resource: "orders",     action: "read" },
  "orders:write":    { resource: "orders",     action: "write" },
  "users:admin":     { resource: "users",      action: "admin" }
}
```

### RBAC Middleware (Node.js/Express)

```javascript
const { MongoClient, ObjectId } = require("mongodb")
const jwt = require("jsonwebtoken")

class RBACService {
  constructor(db) {
    this.db = db
    this.permissionCache = new Map()
  }

  async getUserPermissions(userId) {
    const cacheKey = userId.toString()
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)
    }

    const user = await this.db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { roles: 1 } }
    )

    if (!user) return new Set()

    const roles = await this.db.collection("roles").find(
      { name: { $in: user.roles } },
      { projection: { permissions: 1 } }
    ).toArray()

    const permissions = new Set(
      roles.flatMap(r => r.permissions)
    )

    // Cache for 5 minutes
    this.permissionCache.set(cacheKey, permissions)
    setTimeout(() => this.permissionCache.delete(cacheKey), 5 * 60 * 1000)

    return permissions
  }

  async can(userId, permission) {
    const permissions = await this.getUserPermissions(userId)
    return permissions.has(permission)
  }
}

// Express middleware factory
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1]
      if (!token) return res.status(401).json({ error: "Unauthorized" })

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const hasPermission = await rbacService.can(decoded.userId, permission)

      if (!hasPermission) {
        return res.status(403).json({ error: "Forbidden" })
      }

      req.user = decoded
      next()
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" })
    }
  }
}

// Usage in routes
const express = require("express")
const router = express.Router()

router.get("/products", requirePermission("products:read"), async (req, res) => {
  const products = await db.collection("products").find({}).toArray()
  res.json(products)
})

router.post("/products", requirePermission("products:write"), async (req, res) => {
  const result = await db.collection("products").insertOne(req.body)
  res.status(201).json(result)
})

router.delete("/products/:id", requirePermission("users:admin"), async (req, res) => {
  await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) })
  res.status(204).end()
})
```

### Assign and Revoke Roles

```javascript
// Assign a role to a user
async function assignRole(db, userId, roleName) {
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $addToSet: { roles: roleName } }
  )
}

// Revoke a role from a user
async function revokeRole(db, userId, roleName) {
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { roles: roleName } }
  )
}

// Get all users with a specific role
async function getUsersByRole(db, roleName) {
  return db.collection("users").find(
    { roles: roleName },
    { projection: { email: 1, roles: 1 } }
  ).toArray()
}
```

### Add Indexes for RBAC Queries

```javascript
// Index for role lookups
db.users.createIndex({ roles: 1 })
db.users.createIndex({ email: 1 }, { unique: true })
db.roles.createIndex({ name: 1 }, { unique: true })
```

## Summary

Implementing RBAC with MongoDB involves two layers: MongoDB's built-in role system for securing database-level access with custom roles and privileges, and application-level RBAC for controlling what authenticated users can do within your app. Store roles and permissions in MongoDB collections, cache permission lookups in memory to reduce database round trips, and use Express middleware to enforce permissions declaratively on each route.
