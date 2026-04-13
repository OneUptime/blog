# How to Use Built-In Roles in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authorization, RBAC, Built-In Roles

Description: Learn how to use MongoDB's built-in roles including read, readWrite, dbAdmin, and clusterAdmin to implement role-based access control for database users.

---

## What Are Built-In Roles?

MongoDB provides a set of built-in roles that grant common sets of privileges for database administration and access. You assign these roles to users so each user has only the access they need (principle of least privilege).

## Database-Level Built-In Roles

### read

Grants read-only access to all non-system collections in a specific database:

```javascript
db.createUser({
  user: "reportUser",
  pwd: "securePassword123",
  roles: [{ role: "read", db: "analytics" }]
})
```

Actions granted: `find`, `listCollections`, `listIndexes`, `dbStats`, `collStats`.

### readWrite

Grants read and write access to all non-system collections:

```javascript
db.createUser({
  user: "appUser",
  pwd: "securePassword456",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

Actions granted: everything in `read` plus `insert`, `update`, `remove`, `createCollection`, `dropCollection`, `createIndex`.

### dbAdmin

Grants schema management privileges without data read/write:

```javascript
db.createUser({
  user: "schemaAdmin",
  pwd: "securePassword789",
  roles: [{ role: "dbAdmin", db: "myapp" }]
})
```

Actions granted: `createCollection`, `dropCollection`, `createIndex`, `dropIndex`, `compact`, `validate`, `collMod`, `dbStats`, `listCollections`. Does NOT include `find` or `insert`.

### dbOwner

Combines `readWrite`, `dbAdmin`, and `userAdmin` for full ownership of a database:

```javascript
db.createUser({
  user: "dbOwnerUser",
  pwd: "ownerPassword",
  roles: [{ role: "dbOwner", db: "myapp" }]
})
```

### userAdmin

Grants ability to create and manage users and roles for the database:

```javascript
db.createUser({
  user: "userManager",
  pwd: "managerPassword",
  roles: [{ role: "userAdmin", db: "myapp" }]
})
```

## All-Database Roles (Applied to admin db)

### readAnyDatabase

Grants `read` access across all databases:

```javascript
use admin
db.createUser({
  user: "globalReader",
  pwd: "readPassword",
  roles: [{ role: "readAnyDatabase", db: "admin" }]
})
```

### readWriteAnyDatabase

Grants `readWrite` across all databases:

```javascript
use admin
db.createUser({
  user: "globalWriter",
  pwd: "writePassword",
  roles: [{ role: "readWriteAnyDatabase", db: "admin" }]
})
```

### dbAdminAnyDatabase

Grants `dbAdmin` privileges across all databases.

### userAdminAnyDatabase

Grants ability to manage users across all databases - equivalent to a superuser for access control.

## Cluster-Level Roles

### clusterAdmin

Grants full cluster management privileges including sharding, replica set management, and server status:

```javascript
use admin
db.createUser({
  user: "clusterMgr",
  pwd: "clusterPassword",
  roles: [{ role: "clusterAdmin", db: "admin" }]
})
```

### clusterMonitor

Read-only access to cluster monitoring data (suitable for monitoring tools):

```javascript
use admin
db.createUser({
  user: "monitoringAgent",
  pwd: "monitorPassword",
  roles: [{ role: "clusterMonitor", db: "admin" }]
})
```

### clusterManager

Manages sharding and replica sets without full admin privileges.

### hostManager

Manages and monitors MongoDB servers.

## Superuser Roles

### root

Grants access to all resources - use sparingly:

```javascript
use admin
db.createUser({
  user: "superAdmin",
  pwd: "superSecretPassword",
  roles: [{ role: "root", db: "admin" }]
})
```

## Assigning Multiple Roles

A user can have multiple roles across multiple databases:

```javascript
db.createUser({
  user: "devUser",
  pwd: "devPassword",
  roles: [
    { role: "readWrite", db: "myapp" },
    { role: "read", db: "analytics" },
    { role: "dbAdmin", db: "myapp" }
  ]
})
```

## Updating User Roles

Grant additional roles to an existing user:

```javascript
db.grantRolesToUser("appUser", [
  { role: "dbAdmin", db: "myapp" }
])
```

Revoke a role:

```javascript
db.revokeRolesFromUser("appUser", [
  { role: "dbAdmin", db: "myapp" }
])
```

## Viewing User Roles

```javascript
// View a specific user
db.getUser("appUser")

// View all users in the current database
db.getUsers()

// View in admin database
use admin
db.getUsers()
```

## Role Assignment Guidelines

```text
User Type                 | Recommended Roles
--------------------------|---------------------------
Application backend       | readWrite (specific db)
Reporting/analytics       | read (analytics db)
DBA / schema management   | dbAdmin + readWrite
Backup agent              | backup (built-in)
Monitoring tool           | clusterMonitor
Developer (dev env only)  | dbOwner (dev db only)
Production deployment     | Never use root
```

## Summary

MongoDB's built-in roles provide a complete set of database access permissions following the principle of least privilege. Use `read` for read-only access, `readWrite` for application users, `dbAdmin` for schema management without data access, and `clusterAdmin` for infrastructure management. Assign multiple roles across databases to compose the exact permissions needed, and always prefer granular built-in roles over `root` for production workloads. Use `db.createUser()` to create users with roles and `db.grantRolesToUser()` to modify existing permissions.
