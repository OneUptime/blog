# How to Enable Authentication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, Security, Operation, User Management

Description: Enable MongoDB authentication to require username and password for all connections, securing your database from unauthorized access.

---

## Default State - No Authentication

By default, MongoDB allows connections from localhost without authentication. This is only safe for development. Production deployments must enable authentication before exposing MongoDB to any network.

## Step 1: Create the First Admin User

Before enabling authentication, create an admin user. The localhost exception allows you to connect from `localhost` and create the first user when no users exist in the system.

```bash
# Connect to MongoDB without auth
mongosh --host localhost --port 27017
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),  // Prompts securely - do not hard-code
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "clusterAdmin", db: "admin" }
  ]
});
```

## Step 2: Enable Authentication in mongod.conf

Add the security section to your configuration file:

```yaml
# /etc/mongod.conf
security:
  authorization: enabled
```

Or pass it as a command-line flag instead of editing the config file:

```bash
mongod --auth
```

## Step 3: Restart mongod

```bash
sudo systemctl restart mongod
```

## Step 4: Verify Authentication Works

Try connecting without credentials - should fail:

```bash
mongosh --host localhost --port 27017
```

```javascript
db.runCommand({ connectionStatus: 1 })
// Returns: { authInfo: { authenticatedUsers: [], authenticatedUserRoles: [] }, ok: 1 }
// Empty arrays confirm you are not authenticated
```

Connect with credentials:

```bash
mongosh --host localhost --port 27017 \
  --username admin \
  --password \
  --authenticationDatabase admin
```

## Step 5: Create Application-Specific Users

Create users with minimal privileges for each application:

```javascript
use myapp

db.createUser({
  user: "appUser",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "myapp" }
  ]
});
```

## Keyfile Authentication for Replica Sets

For replica sets, members authenticate each other using a keyfile. Generate and distribute it:

```bash
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

```yaml
security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile
```

## Summary

Enable MongoDB authentication by creating an admin user while auth is disabled, then setting `security.authorization: enabled` in `mongod.conf` and restarting. Create application-specific users with minimal roles. For replica sets, distribute a shared keyfile so members can authenticate each other.
