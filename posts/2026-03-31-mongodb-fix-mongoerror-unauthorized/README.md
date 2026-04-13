# How to Fix MongoError: Unauthorized in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authorization, Role, Access Control, Error

Description: Learn why MongoDB returns Unauthorized errors and how to fix them by granting the correct roles, checking privileges, and reviewing access control configuration.

---

## Understanding the Error

`MongoServerError: not authorized on <db> to execute command` means the authenticated user exists and the password is correct, but the user lacks the required privileges to perform the requested operation:

```text
MongoServerError: not authorized on mydb to execute command
  { find: "users", filter: {}, lsid: { ... } }
  error code: 13, codeName: 'Unauthorized'
```

This is different from `Authentication failed` (wrong password) - here the user is authenticated but not authorized.

## Step 1: Identify What Role Is Needed

MongoDB uses role-based access control (RBAC). Each operation requires a specific privilege. Common built-in roles:

```text
read             - find, aggregate on a database
readWrite        - find, insert, update, delete
dbAdmin          - createIndex, dropCollection, stats
userAdmin        - createUser, grantRolesToUser
clusterAdmin     - replSetGetStatus, shardCollection
root             - all permissions on all databases
```

Check the current user's roles in `mongosh`:

```javascript
use mydb
db.getUser("myuser")
```

## Step 2: Grant the Missing Role

Connect as an admin user and grant the required role:

```javascript
use admin
db.grantRolesToUser("myuser", [
  { role: "readWrite", db: "mydb" }
])
```

For multiple databases:

```javascript
db.grantRolesToUser("myuser", [
  { role: "readWrite", db: "mydb" },
  { role: "read",      db: "analytics" }
])
```

## Step 3: Create a User With Correct Roles From the Start

```javascript
use admin
db.createUser({
  user: "appuser",
  pwd: "securePassword",
  roles: [
    { role: "readWrite", db: "production" },
    { role: "dbAdmin",   db: "production" }
  ]
})
```

## Step 4: Check Privilege Details

If you are unsure which privilege is missing, use `rolesInfo` to inspect roles:

```javascript
use admin
db.runCommand({ rolesInfo: { role: "readWrite", db: "mydb" }, showPrivileges: true })
```

And check what the user can do:

```javascript
db.runCommand({ usersInfo: "myuser", showPrivileges: true })
```

## Step 5: Custom Roles for Least Privilege

For production, avoid `root` or `readWriteAnyDatabase`. Instead, create custom roles that grant only what is needed:

```javascript
use mydb
db.createRole({
  role: "orderReader",
  privileges: [
    {
      resource: { db: "mydb", collection: "orders" },
      actions: ["find"]
    }
  ],
  roles: []
})

db.grantRolesToUser("reportingUser", [{ role: "orderReader", db: "mydb" }])
```

## Step 6: Atlas - Check Built-in Database Users

In Atlas, verify the database user has the correct built-in role:

1. Go to Database Access in the Atlas UI
2. Edit the user
3. Grant "Atlas admin", "Read and write to any database", or a custom role
4. Save and allow propagation (up to 60 seconds)

## Checking Authorization Is Enabled

```bash
grep "authorization" /etc/mongod.conf
# should show: authorization: enabled
```

If authorization is disabled, all authenticated users have full access - enable it for production:

```yaml
security:
  authorization: enabled
```

## Summary

`Unauthorized` errors mean the user is authenticated but lacks the required role or privilege. Use `db.grantRolesToUser()` to assign the correct roles, create custom roles for least-privilege access, and verify role assignments with `db.getUser()`. For Atlas, update database user roles through the UI.
