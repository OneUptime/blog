# How to Use the connectionStatus Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Command, Authentication, Security, Administration

Description: Learn how to use MongoDB's connectionStatus command to inspect the authenticated user, roles, and privileges for the current database connection.

---

## What Is connectionStatus?

`connectionStatus` is a MongoDB command that returns information about the currently authenticated user for the active connection. It is the fastest way to confirm which user is logged in, what roles they hold, and what privileges are available - without querying the `admin` database directly.

It is particularly useful during development, debugging, and security audits to verify that applications are connecting with the intended credentials.

## Running connectionStatus

From `mongosh`:

```javascript
db.runCommand({ connectionStatus: 1 })
```

Or equivalently:

```javascript
db.adminCommand({ connectionStatus: 1 })
```

The command can be run against any database and does not require special privileges beyond being connected.

## Reading the Output

```json
{
  "authInfo": {
    "authenticatedUsers": [
      {
        "user": "appUser",
        "db": "myapp"
      }
    ],
    "authenticatedUserRoles": [
      { "role": "readWrite", "db": "myapp" },
      { "role": "read", "db": "reporting" }
    ]
  },
  "ok": 1
}
```

Key fields:

- `authenticatedUsers` - list of users authenticated on this connection, including the database they authenticated against
- `authenticatedUserRoles` - all roles granted to those users, including roles inherited from other databases

If `authenticatedUsers` is empty, the connection is unauthenticated.

## Getting Full Privilege Detail

Pass `showPrivileges: true` to also include the resolved privilege actions:

```javascript
db.runCommand({ connectionStatus: 1, showPrivileges: true })
```

The response adds an `authenticatedUserPrivileges` array with resource-action pairs:

```json
{
  "authInfo": {
    "authenticatedUsers": [{ "user": "appUser", "db": "myapp" }],
    "authenticatedUserRoles": [{ "role": "readWrite", "db": "myapp" }],
    "authenticatedUserPrivileges": [
      {
        "resource": { "db": "myapp", "collection": "" },
        "actions": ["changeStream", "collStats", "convertToCapped", "createCollection", "createIndex", "dbHash", "dbStats", "dropCollection", "dropIndex", "find", "insert", "killCursors", "listCollections", "listIndexes", "remove", "renameCollectionSameDB", "update"]
      }
    ]
  },
  "ok": 1
}
```

Use this to audit whether an application account has more or fewer privileges than intended.

## Verifying Connection Credentials in Scripts

In a startup health check script, confirm the application connects as the expected user:

```javascript
const status = db.runCommand({ connectionStatus: 1 });
const users = status.authInfo.authenticatedUsers;

if (users.length === 0) {
  throw new Error("Connection is unauthenticated. Check credentials.");
}

const expected = "appUser";
if (users[0].user !== expected) {
  throw new Error(`Expected user '${expected}', got '${users[0].user}'`);
}

print("Authentication verified: " + users[0].user + "@" + users[0].db);
```

## Checking Roles Before Running Admin Operations

Before executing a privileged operation, verify the current user holds the required role:

```javascript
function hasRole(roleName, dbName) {
  const status = db.runCommand({ connectionStatus: 1 });
  return status.authInfo.authenticatedUserRoles.some(
    r => r.role === roleName && r.db === dbName
  );
}

if (!hasRole("dbAdmin", "myapp")) {
  throw new Error("This script requires the dbAdmin role on myapp.");
}
```

## Using connectionStatus in Application Code

In Node.js with the MongoDB driver:

```javascript
const { MongoClient } = require("mongodb");

async function verifyAuth(uri) {
  const client = new MongoClient(uri);
  await client.connect();
  const result = await client.db("admin").command({ connectionStatus: 1 });
  const { authenticatedUsers, authenticatedUserRoles } = result.authInfo;

  console.log("Connected as:", authenticatedUsers.map(u => `${u.user}@${u.db}`));
  console.log("Roles:", authenticatedUserRoles.map(r => `${r.role}@${r.db}`));
  await client.close();
}

verifyAuth("mongodb://appUser:secret@mongo1:27017/myapp?authSource=myapp");
```

## Summary

`connectionStatus` provides an instant, lightweight way to inspect the authenticated identity and roles for the current connection. Use it to validate credentials, audit privilege assignments, and write defensive checks in scripts before executing sensitive operations.
