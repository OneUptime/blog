# How to Use Built-In Roles in MongoDB (read, readWrite, dbAdmin)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Role, Authorization, Database

Description: Learn MongoDB built-in roles including read, readWrite, dbAdmin, and clusterAdmin, what privileges each grants, and how to assign them for least-privilege access.

---

MongoDB ships with a set of built-in roles that cover the most common access patterns. Using built-in roles is faster than creating custom roles for standard use cases, and they are well-documented and predictable.

## Database-Level Roles

These roles apply to a specific database:

| Role | Privileges |
|---|---|
| `read` | Read data in the database and its collections |
| `readWrite` | Read and write data; manage indexes |
| `dbAdmin` | Administrative tasks: index management, schema stats, but no user management |
| `dbOwner` | All `readWrite` + `dbAdmin` + `userAdmin` privileges |
| `userAdmin` | Create and manage users and roles on the database |

## Cluster-Level Roles

These apply across the entire MongoDB deployment:

| Role | Privileges |
|---|---|
| `clusterMonitor` | Read-only access to cluster monitoring tools |
| `clusterManager` | Management of sharding and replication |
| `clusterAdmin` | Full cluster management |
| `readAnyDatabase` | `read` on all databases |
| `readWriteAnyDatabase` | `readWrite` on all databases |
| `dbAdminAnyDatabase` | `dbAdmin` on all databases |
| `userAdminAnyDatabase` | `userAdmin` on all databases |
| `root` | Full unrestricted access - use sparingly |

## Create a User with read Role

Assign read-only access to an application monitoring user:

```javascript
use myapp
db.createUser({
  user: "reporting",
  pwd: "SecurePassword123",
  roles: [{ role: "read", db: "myapp" }]
})
```

## Create a User with readWrite Role

Assign read-write access for an application service account:

```javascript
use myapp
db.createUser({
  user: "appservice",
  pwd: "SecurePassword456",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

## Create a DBA User with dbAdmin Role

Assign administrative access without data read/write for a DBA:

```javascript
use myapp
db.createUser({
  user: "dba",
  pwd: "DBAdminPass789",
  roles: [
    { role: "dbAdmin", db: "myapp" },
    { role: "clusterMonitor", db: "admin" }
  ]
})
```

## Assign Multiple Roles Across Databases

A user can hold roles on multiple databases:

```javascript
use admin
db.createUser({
  user: "crossdb",
  pwd: "CrossDbPass",
  roles: [
    { role: "readWrite", db: "app1" },
    { role: "read", db: "app2" },
    { role: "dbAdmin", db: "app1" }
  ]
})
```

## View a User's Roles

```javascript
use myapp
db.getUser("appservice")
```

Or from `mongosh`:

```javascript
db.runCommand({ usersInfo: { user: "appservice", db: "myapp" } })
```

## Grant or Revoke Roles

Add roles to an existing user:

```javascript
use myapp
db.grantRolesToUser("reporting", [{ role: "readWrite", db: "myapp" }])
```

Remove roles:

```javascript
db.revokeRolesFromUser("reporting", [{ role: "readWrite", db: "myapp" }])
```

## Follow Least Privilege

Assign the minimum role needed:
- Read-only APIs get `read`
- Application services get `readWrite`
- DBA tools get `dbAdmin`
- Only infrastructure automation should have `clusterAdmin` or `root`

Avoid assigning `root` to application service accounts.

## Summary

MongoDB's built-in roles cover the most common access patterns - `read`, `readWrite`, `dbAdmin`, `userAdmin`, and cluster-level roles. Assign the least-privileged role that meets the user's needs, combine roles when necessary, and use specific roles like `dbAdmin` rather than `root` for database administration tasks.
