# How to Configure MongoDB SCRAM Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, SCRAM, Authentication, Security, User Management

Description: Learn how to configure SCRAM-SHA-1 and SCRAM-SHA-256 authentication in MongoDB, create users with specific mechanisms, and enforce secure password authentication.

---

## Introduction

SCRAM (Salted Challenge Response Authentication Mechanism) is the default authentication mechanism in MongoDB. It allows clients to authenticate without transmitting passwords in plaintext. MongoDB supports two variants: SCRAM-SHA-1 (legacy, for compatibility) and SCRAM-SHA-256 (recommended, stronger hashing). Understanding how to configure and enforce SCRAM helps you ensure secure, password-based access.

## SCRAM Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server as mongod

    Client->>Server: ClientFirst message (username + client nonce)
    Server->>Server: Look up user's salt and iteration count
    Server-->>Client: ServerFirst message (server nonce + salt + iterations)
    Client->>Client: Compute PBKDF2 proof using password + salt
    Client->>Server: ClientFinal message (client proof)
    Server->>Server: Verify proof against stored credential
    Server-->>Client: ServerFinal message (server signature)
    Client->>Client: Verify server signature
    Note over Client,Server: Authentication complete - no password sent
```

## Step 1: Enable Authentication in mongod.conf

```yaml
security:
  authorization: enabled

setParameter:
  authenticationMechanisms: SCRAM-SHA-1,SCRAM-SHA-256
```

Restart mongod:

```bash
sudo systemctl restart mongod
```

## Step 2: Create the First Admin User

Before enabling authentication, create an admin user:

```bash
# Connect without authentication
mongosh --port 27017
```

```javascript
use admin
db.createUser({
  user: "superAdmin",
  pwd: "str0ngPa$$w0rd",
  roles: [{ role: "root", db: "admin" }],
  mechanisms: ["SCRAM-SHA-256"]   // Restrict to SHA-256 only
})
```

## Step 3: Create Users with Specific Mechanisms

```javascript
use ecommerce

// SCRAM-SHA-256 only (recommended for new users)
db.createUser({
  user: "appUser",
  pwd: "appPassword123!",
  roles: [{ role: "readWrite", db: "ecommerce" }],
  mechanisms: ["SCRAM-SHA-256"]
})

// Both mechanisms (for legacy client compatibility)
db.createUser({
  user: "legacyApp",
  pwd: "legacyPassword",
  roles: [{ role: "read", db: "ecommerce" }],
  mechanisms: ["SCRAM-SHA-1", "SCRAM-SHA-256"]
})
```

## Step 4: Verify User Mechanisms

```javascript
use ecommerce
db.getUser("appUser", { showCredentials: false })
// Returns user info including: "mechanisms": ["SCRAM-SHA-256"]

// Show all users and their mechanisms (from admin)
use admin
db.system.users.find(
  {},
  { user: 1, db: 1, mechanisms: 1 }
).forEach(u => printjson(u))
```

## Step 5: Enforce SCRAM-SHA-256 Only

To prevent weaker SCRAM-SHA-1 from being used, remove it from the allowed mechanisms list:

```yaml
# /etc/mongod.conf
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

This requires all users to have `SCRAM-SHA-256` credentials. Users created with only `SCRAM-SHA-1` credentials will not be able to authenticate.

## Step 6: Migrate Existing Users to SCRAM-SHA-256

Upgrade existing user credentials to add SCRAM-SHA-256:

```javascript
// Update an existing user to use SHA-256 only
db.updateUser("existingUser", {
  pwd: "newStrongerPassword",
  mechanisms: ["SCRAM-SHA-256"]
})

// Bulk update: add SCRAM-SHA-256 to all users in a database
use myDatabase
db.getUsers().forEach(u => {
  if (!u.mechanisms.includes("SCRAM-SHA-256")) {
    print("Upgrading user:", u.user)
    db.updateUser(u.user, {
      pwd: passwordPrompt(),   // Password required when adding a new mechanism
      mechanisms: ["SCRAM-SHA-256"]
    })
  }
})
```

## Step 7: Authenticate Using mongosh

```bash
# Authenticate with SCRAM-SHA-256
mongosh "mongodb://appUser:appPassword123!@localhost:27017/ecommerce?authMechanism=SCRAM-SHA-256"

# Or interactively
mongosh --username appUser --authenticationDatabase ecommerce
# Prompts for password
```

## Step 8: Authenticate with the Driver

```javascript
// Node.js driver
const { MongoClient } = require("mongodb")

const client = new MongoClient(
  "mongodb://appUser:appPassword123%21@localhost:27017/ecommerce",
  {
    authMechanism: "SCRAM-SHA-256",
    authSource: "ecommerce"
  }
)
```

```properties
# Spring Boot application.properties
spring.data.mongodb.uri=mongodb://appUser:appPassword123!@localhost:27017/ecommerce?authMechanism=SCRAM-SHA-256
```

## SCRAM-SHA-256 vs SCRAM-SHA-1

| Feature | SCRAM-SHA-1 | SCRAM-SHA-256 |
|---|---|---|
| Hash algorithm | SHA-1 (legacy) | SHA-256 |
| PBKDF2 iterations | 10,000 | 15,000 |
| Compatibility | MongoDB 3.0+ | MongoDB 4.0+ |
| Recommended | No (legacy only) | Yes |

## Checking Authentication Attempts

```javascript
// Enable audit log or check the profiler for auth events
db.setProfilingLevel(2)

// After some time, check for auth operations
db.system.profile.find({
  op: "command",
  "command.saslStart": { $exists: true }
}).sort({ ts: -1 }).limit(5)
```

## Changing a User Password

```javascript
use ecommerce
db.changeUserPassword("appUser", "newSecurePassword456!")

// Or via updateUser
db.updateUser("appUser", { pwd: "newSecurePassword456!" })
```

## Summary

MongoDB SCRAM authentication uses PBKDF2 to derive a stored credential from the password, so the password is never transmitted or stored in plaintext. Use `SCRAM-SHA-256` for all new users - specify the mechanism explicitly in `db.createUser()`. Enforce SHA-256 by setting `authenticationMechanisms: SCRAM-SHA-256` in the `setParameter` section of `mongod.conf`. Migrate existing users by updating their stored credentials with `db.updateUser()`. Always create an admin user before enabling authorization and keep a secure emergency admin with known credentials.
