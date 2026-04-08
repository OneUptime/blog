# How to Create Custom Roles in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Role, Authorization, Database

Description: Learn how to create custom roles in MongoDB to grant fine-grained, least-privilege access by specifying exact actions on specific collections and databases.

---

When MongoDB's built-in roles are too broad for your use case, custom roles let you define exactly which actions a user can perform on specific collections. This enables precise least-privilege access control for complex multi-team or multi-tenant environments.

## Role Components

A custom role consists of:
- **`privileges`**: a list of resource+actions pairs
- **`roles`**: built-in or custom roles to inherit (optional)

## Create a Basic Custom Role

Create a role that allows only inserting and reading documents in the `events` collection:

```javascript
use myapp
db.createRole({
  role: "eventsWriter",
  privileges: [
    {
      resource: { db: "myapp", collection: "events" },
      actions: ["insert", "find"]
    }
  ],
  roles: []
})
```

## Create a Role with Multiple Resource Permissions

Grant read access to `orders` and write access to `order_logs`:

```javascript
use myapp
db.createRole({
  role: "orderProcessor",
  privileges: [
    {
      resource: { db: "myapp", collection: "orders" },
      actions: ["find", "update"]
    },
    {
      resource: { db: "myapp", collection: "order_logs" },
      actions: ["insert", "find"]
    }
  ],
  roles: []
})
```

## Assign a Custom Role to a User

```javascript
use myapp
db.createUser({
  user: "processor1",
  pwd: "ProcessorPass123",
  roles: [{ role: "orderProcessor", db: "myapp" }]
})
```

Or grant the role to an existing user:

```javascript
db.grantRolesToUser("processor1", [{ role: "orderProcessor", db: "myapp" }])
```

## Inherit from Built-In Roles

Custom roles can inherit privileges from built-in roles and add more on top:

```javascript
use myapp
db.createRole({
  role: "analyticsReader",
  privileges: [
    {
      resource: { db: "myapp", collection: "metrics" },
      actions: ["find"]
    }
  ],
  roles: [
    { role: "read", db: "myapp" }
  ]
})
```

## Common Actions for Custom Roles

| Action | Description |
|---|---|
| `find` | Query documents |
| `insert` | Insert documents |
| `update` | Update documents |
| `remove` | Delete documents |
| `createIndex` | Create indexes |
| `dropCollection` | Drop a collection |
| `listCollections` | List collections in a database |

## View, Modify, and Drop Custom Roles

View a role:

```javascript
db.getRole("orderProcessor", { showPrivileges: true })
```

Add privileges to an existing role:

```javascript
db.grantPrivilegesToRole("orderProcessor", [
  {
    resource: { db: "myapp", collection: "customers" },
    actions: ["find"]
  }
])
```

Drop a custom role:

```javascript
db.dropRole("orderProcessor")
```

Note: dropping a role does not delete users - it only removes the role from their access.

## Database-Scoped vs Cluster-Scoped Roles

Custom roles created in a specific database (e.g., `myapp`) only apply to that database. To create cluster-wide custom roles, create them in the `admin` database:

```javascript
use admin
db.createRole({
  role: "globalMonitor",
  privileges: [
    { resource: { cluster: true }, actions: ["serverStatus"] }
  ],
  roles: []
})
```

## Summary

Custom roles in MongoDB give you precise control over what users can do on specific collections. Define privileges as resource and action pairs, optionally inherit from built-in roles, and assign the roles to users. This approach ensures each service or team member has exactly the access they need and nothing more.
