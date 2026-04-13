# How to Implement the Principle of Least Privilege in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Least Privilege, Authorization, Database

Description: Learn how to apply the principle of least privilege in MongoDB by assigning minimal roles, scoping access to specific collections, and regularly auditing user permissions.

---

The principle of least privilege means every user and service account should have only the access required for its specific function. In MongoDB, this means assigning fine-grained roles rather than broad roles like `root` or `readWriteAnyDatabase`, and scoping access to specific databases and collections.

## Identify Access Requirements Per Role

Before creating users, map out what each component needs:

| Component | Actions Needed | Recommended Role |
|---|---|---|
| Read-only dashboard | `find` on specific collections | Custom role with `find` only |
| Application API | `find`, `insert`, `update` | `readWrite` on app DB only |
| Background jobs | `find`, `insert`, `update` | Custom role per job |
| DBA tooling | Index management, stats | `dbAdmin` on specific DB |
| Backups | Read all data | `backup` role or `read` |
| Monitoring | Server stats only | `clusterMonitor` |

## Create Collection-Level Custom Roles

Restrict a service to only the collections it needs:

```javascript
use myapp
db.createRole({
  role: "orderServiceRole",
  privileges: [
    {
      resource: { db: "myapp", collection: "orders" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "myapp", collection: "customers" },
      actions: ["find"]
    }
  ],
  roles: []
})

db.createUser({
  user: "order-service",
  pwd: "OrderServicePass123!",
  roles: [{ role: "orderServiceRole", db: "myapp" }]
})
```

## Avoid Overly Broad Built-In Roles

Do not use these roles for application service accounts:
- `root` - unrestricted access to everything
- `dbOwner` - full control including user management
- `readWriteAnyDatabase` - write access to all databases

Use database-scoped `readWrite` at most for application users.

## Separate Users by Function

Create separate credentials for each service:

```javascript
use admin

// Backup user - only needs to read
db.createUser({
  user: "backup-agent",
  pwd: "BackupPass456!",
  roles: [{ role: "backup", db: "admin" }]
})

// Monitoring user - no data access
db.createUser({
  user: "metrics-agent",
  pwd: "MetricsPass789!",
  roles: [{ role: "clusterMonitor", db: "admin" }]
})

// Application user - limited to one DB
db.createUser({
  user: "api-service",
  pwd: "ApiPass!",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

## Restrict Access to Specific IP Addresses

Combine role restrictions with network controls. In `mongod.conf`:

```yaml
net:
  bindIp: 10.0.1.10,127.0.0.1
```

In MongoDB Atlas, set IP access lists per project to restrict which IPs can connect.

## Audit User Permissions Regularly

List all users and their roles:

```javascript
use admin
db.getUsers()
```

Check a specific user:

```javascript
db.getUser("api-service", { showPrivileges: true })
```

Revoke unused roles:

```javascript
db.revokeRolesFromUser("api-service", [{ role: "dbAdmin", db: "myapp" }])
```

## Use Separate Credentials for Admin Tasks

Never use the application service account for administrative operations. Create a separate admin user accessed only from bastion hosts:

```javascript
use admin
db.createUser({
  user: "dba-admin",
  pwd: "DBAAdminStrongPass!",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }
  ]
})
```

## Summary

Least privilege in MongoDB means granting users only the specific actions they need on specific collections. Create collection-scoped custom roles for application services, use built-in roles like `clusterMonitor` for operational tooling, and maintain separate credentials for each functional component. Regular access audits ensure permissions stay aligned with requirements.
