# How to Secure MongoDB with SCRAM and RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authentication, RBAC, SCRAM, Database

Description: A practical guide to securing MongoDB with SCRAM authentication and Role-Based Access Control, including user management, custom roles, and security best practices.

---

By default, MongoDB installations do not require authentication. This is convenient for development but dangerous in production. A single exposed port can leak your entire database. SCRAM authentication and Role-Based Access Control (RBAC) are your first line of defense.

## Understanding SCRAM Authentication

SCRAM (Salted Challenge Response Authentication Mechanism) is MongoDB's default authentication method since version 3.0. It never sends passwords over the wire, using cryptographic challenges instead.

```mermaid
sequenceDiagram
    participant Client
    participant MongoDB

    Client->>MongoDB: Connect with username
    MongoDB->>Client: Salt + iteration count
    Client->>Client: Compute client proof
    Client->>MongoDB: Client proof
    MongoDB->>MongoDB: Verify proof
    MongoDB->>Client: Server signature
    Client->>Client: Verify server
    Note over Client,MongoDB: Connection authenticated
```

MongoDB supports two SCRAM variants:
- **SCRAM-SHA-1**: Legacy, for older clients
- **SCRAM-SHA-256**: More secure, use this when possible

## Enabling Authentication

### Step 1: Create Admin User Without Auth

First, connect without authentication and create an admin user:

```javascript
// Connect to MongoDB (no auth yet)
mongosh "mongodb://localhost:27017"

// Switch to admin database
use admin

// Create administrator user
db.createUser({
  user: "adminUser",
  pwd: passwordPrompt(),  // Prompts for password
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
});
```

### Step 2: Enable Authentication

Update the MongoDB configuration file:

```yaml
# /etc/mongod.conf
security:
  authorization: enabled

net:
  port: 27017
  bindIp: 127.0.0.1  # Only accept local connections initially
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

### Step 3: Connect with Authentication

```javascript
// Connection string with credentials
mongosh "mongodb://adminUser:password@localhost:27017/admin"

// Or authenticate after connecting
mongosh "mongodb://localhost:27017"
use admin
db.auth("adminUser", passwordPrompt())
```

## Role-Based Access Control Fundamentals

RBAC restricts users to specific actions on specific resources. Users have roles, and roles have privileges.

### Built-in Roles

MongoDB provides common roles out of the box:

**Database User Roles:**
- `read`: Read all non-system collections
- `readWrite`: Read and write all non-system collections

**Database Admin Roles:**
- `dbAdmin`: Schema management, indexing, statistics
- `dbOwner`: Full control of database (combines readWrite, dbAdmin, userAdmin)
- `userAdmin`: Create and modify users and roles

**Cluster Admin Roles:**
- `clusterAdmin`: Full cluster administration
- `clusterManager`: Manage and monitor cluster
- `clusterMonitor`: Read-only access to monitoring tools

**Backup and Restore:**
- `backup`: Back up data
- `restore`: Restore data

**All Database Roles:**
- `readAnyDatabase`: Read any database
- `readWriteAnyDatabase`: Read/write any database
- `userAdminAnyDatabase`: Administer users in any database
- `dbAdminAnyDatabase`: Database admin for all databases

### Creating Users with Specific Roles

```javascript
// Application user with limited access
use myapp
db.createUser({
  user: "appService",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "myapp" }
  ]
});

// Read-only reporting user
db.createUser({
  user: "reportingUser",
  pwd: passwordPrompt(),
  roles: [
    { role: "read", db: "myapp" },
    { role: "read", db: "analytics" }
  ]
});

// Operations team with monitoring access
use admin
db.createUser({
  user: "opsTeam",
  pwd: passwordPrompt(),
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }  // For oplog access
  ]
});
```

## Creating Custom Roles

Built-in roles might be too broad. Custom roles let you define exact permissions.

### Role Structure

```javascript
db.createRole({
  role: "roleName",
  privileges: [
    {
      resource: { db: "mydb", collection: "mycollection" },
      actions: ["find", "insert", "update"]
    }
  ],
  roles: []  // Inherit from other roles
});
```

### Available Actions

Common actions you can grant:
- **Query**: `find`
- **Write**: `insert`, `update`, `remove`
- **Index**: `createIndex`, `dropIndex`
- **Aggregation**: `aggregate` (implied by find)
- **Admin**: `collStats`, `dbStats`, `createCollection`, `dropCollection`

### Example: Order Processing Role

```javascript
// Create role for order processing service
use admin
db.createRole({
  role: "orderProcessor",
  privileges: [
    {
      // Full access to orders collection
      resource: { db: "ecommerce", collection: "orders" },
      actions: ["find", "insert", "update"]
    },
    {
      // Read-only access to products for price validation
      resource: { db: "ecommerce", collection: "products" },
      actions: ["find"]
    },
    {
      // Insert-only access to audit log
      resource: { db: "ecommerce", collection: "audit_log" },
      actions: ["insert"]
    }
  ],
  roles: []
});

// Create user with custom role
use ecommerce
db.createUser({
  user: "orderService",
  pwd: passwordPrompt(),
  roles: [
    { role: "orderProcessor", db: "admin" }
  ]
});
```

### Example: Collection-Level Read Access

```javascript
// Role that can only read specific collections
use admin
db.createRole({
  role: "limitedAnalyst",
  privileges: [
    {
      resource: { db: "analytics", collection: "page_views" },
      actions: ["find"]
    },
    {
      resource: { db: "analytics", collection: "user_sessions" },
      actions: ["find"]
    }
  ],
  roles: []
});
```

## Managing Users

### View Existing Users

```javascript
// List users in current database
use myapp
db.getUsers()

// View specific user
db.getUser("appService")
```

### Modify User Roles

```javascript
// Grant additional roles
db.grantRolesToUser("appService", [
  { role: "dbAdmin", db: "myapp" }
]);

// Revoke roles
db.revokeRolesFromUser("appService", [
  { role: "dbAdmin", db: "myapp" }
]);

// Update all roles at once
db.updateUser("appService", {
  roles: [
    { role: "readWrite", db: "myapp" },
    { role: "read", db: "analytics" }
  ]
});
```

### Change Passwords

```javascript
// Change another user's password (requires userAdmin)
db.changeUserPassword("appService", passwordPrompt());

// User changes their own password
db.updateUser("appService", { pwd: passwordPrompt() });
```

### Remove Users

```javascript
use myapp
db.dropUser("oldUser")
```

## Application Connection Strings

Include credentials in your connection string:

```javascript
// Node.js example
const { MongoClient } = require('mongodb');

// Credentials in connection string (not recommended for production)
const uri = "mongodb://appService:password@mongo1.example.com:27017,mongo2.example.com:27017/myapp?authSource=myapp&replicaSet=rs0";

// Better: Use environment variables
const uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/myapp?authSource=myapp`;

const client = new MongoClient(uri);
```

### Connection String Options

- `authSource`: Database where user is defined
- `authMechanism`: SCRAM-SHA-256 (preferred) or SCRAM-SHA-1

```javascript
const uri = "mongodb://user:pass@host:27017/mydb?authSource=admin&authMechanism=SCRAM-SHA-256";
```

## Security Best Practices

### 1. Principle of Least Privilege

```javascript
// BAD: Giving application full admin access
db.createUser({
  user: "app",
  pwd: "password",
  roles: ["root"]  // Too much power
});

// GOOD: Only what the application needs
db.createUser({
  user: "app",
  pwd: "password",
  roles: [
    { role: "readWrite", db: "myapp" }  // Just this database
  ]
});
```

### 2. Separate Users for Different Services

```javascript
// Each service gets its own user
db.createUser({ user: "apiService", pwd: "...", roles: [...] });
db.createUser({ user: "workerService", pwd: "...", roles: [...] });
db.createUser({ user: "reportingService", pwd: "...", roles: [...] });
```

### 3. Rotate Credentials Regularly

```javascript
// Script to rotate application credentials
db.changeUserPassword("apiService", newPassword);
// Update application configuration
// Monitor for authentication failures
```

### 4. Enable Audit Logging

```yaml
# mongod.conf
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: ["authCheck", "authenticate"] } }'
```

### 5. Network Security

```yaml
# mongod.conf
net:
  bindIp: 10.0.0.1  # Internal IP only
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb.pem
```

## Troubleshooting Authentication

### Common Errors

**Error: "Authentication failed"**
- Check username and password
- Verify authSource matches where user was created
- Confirm user has correct roles for the database

**Error: "not authorized on database"**
- User exists but lacks required role
- Grant missing role: `db.grantRolesToUser(...)`

### Debug Authentication

```javascript
// Check current user
db.runCommand({ connectionStatus: 1 })

// View user's effective privileges
db.runCommand({
  usersInfo: { user: "appService", db: "myapp" },
  showPrivileges: true
})
```

---

Security is not optional. Enable authentication, follow the principle of least privilege, and create custom roles that match your application's actual needs. The few minutes spent setting up proper authentication can prevent catastrophic data breaches.
