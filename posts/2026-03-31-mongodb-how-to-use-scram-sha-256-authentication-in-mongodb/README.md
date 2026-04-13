# How to Use SCRAM-SHA-256 Authentication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, SCRAM, Security, User Management

Description: Configure SCRAM-SHA-256 as the MongoDB authentication mechanism for strong password-based security with cryptographic challenge-response.

---

## What Is SCRAM-SHA-256

SCRAM (Salted Challenge Response Authentication Mechanism) with SHA-256 is the default and recommended authentication mechanism for MongoDB since version 4.0. It prevents password transmission in plaintext - instead using a cryptographic challenge-response protocol where the server never learns the actual password.

MongoDB supports two SCRAM variants:
- `SCRAM-SHA-1` - Legacy, uses SHA-1
- `SCRAM-SHA-256` - Current default, uses SHA-256

## Creating a User with SCRAM-SHA-256

When you create a user in MongoDB 4.0+, SCRAM-SHA-256 is used by default:

```javascript
use admin

db.createUser({
  user: "appUser",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "myapp" }],
  mechanisms: ["SCRAM-SHA-256"]
});
```

Specifying `mechanisms: ["SCRAM-SHA-256"]` explicitly disables SCRAM-SHA-1 for this user.

## Configuring the Server Default Mechanism

Set the server's default authentication mechanisms in `mongod.conf`:

```yaml
security:
  authorization: enabled
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

This prevents clients from falling back to SCRAM-SHA-1.

## Connecting with SCRAM-SHA-256

Most drivers use SCRAM-SHA-256 automatically. To explicitly specify it in a connection string:

```javascript
const client = new MongoClient(
  "mongodb://appUser:password@host:27017/myapp" +
  "?authMechanism=SCRAM-SHA-256&authSource=admin"
);
```

Or in the options object:

```javascript
const client = new MongoClient("mongodb://host:27017", {
  auth: { username: "appUser", password: "password" },
  authMechanism: "SCRAM-SHA-256",
  authSource: "admin"
});
```

## Upgrading Existing Users to SCRAM-SHA-256

To upgrade an existing user from SCRAM-SHA-1 to SCRAM-SHA-256 only:

```javascript
db.updateUser("existingUser", {
  mechanisms: ["SCRAM-SHA-256"],
  pwd: passwordPrompt()
});
```

Note: changing mechanisms requires re-setting the password.

## Verifying the Authentication Mechanism in Use

Check what mechanisms a user has configured:

```javascript
use admin
db.getUser("appUser")
```

The output includes a `mechanisms` array showing which SCRAM variants are enabled for that user.

## Forcing SCRAM-SHA-256 Cluster-Wide

For the strongest security, set the parameter on each mongod and disable SCRAM-SHA-1:

```javascript
db.adminCommand({
  setParameter: 1,
  authenticationMechanisms: ["SCRAM-SHA-256"]
});
```

Then update all users and client connection strings before making this change permanent.

## Summary

SCRAM-SHA-256 is the default and recommended MongoDB authentication mechanism, providing strong password-based security without transmitting credentials in plaintext. Create users with `mechanisms: ["SCRAM-SHA-256"]` to enforce the stronger variant, configure `authenticationMechanisms` in `mongod.conf` to prevent fallback to SHA-1, and update client connection strings to specify `authMechanism=SCRAM-SHA-256`.
