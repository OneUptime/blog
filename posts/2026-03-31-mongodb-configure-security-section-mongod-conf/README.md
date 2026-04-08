# How to Configure the security Section in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authentication, Authorization, Configuration

Description: Learn how to configure the security section in mongod.conf to enable authentication, authorization, keyFile, and LDAP settings for a hardened MongoDB deployment.

---

The `security` section in `mongod.conf` controls authentication mechanisms, internal cluster authentication, and encryption at rest. Enabling these settings is the first step in hardening any MongoDB deployment against unauthorized access.

## Basic Structure

```yaml
security:
  authorization: enabled
  javascriptEnabled: false
```

By default, MongoDB runs without authentication. Setting `authorization: enabled` requires all clients to authenticate before executing any command.

## Enabling Authentication

Before enabling authorization, create an admin user while access control is still off.

```javascript
use admin
db.createUser({
  user: "dbAdmin",
  pwd: passwordPrompt(),
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
});
```

Then update `mongod.conf` and restart.

```yaml
security:
  authorization: enabled
```

## Configuring Keyfile for Replica Set Authentication

Replica set members use a keyfile to authenticate with each other. Generate the key and set strict permissions.

```bash
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
sudo chown mongodb:mongodb /etc/mongodb/keyfile
```

Reference the keyfile in `mongod.conf`.

```yaml
security:
  keyFile: /etc/mongodb/keyfile
```

When `keyFile` is set, `authorization: enabled` is implied automatically.

## Disabling JavaScript Engine

The server-side JavaScript engine (`$where`, `mapReduce`) is rarely needed in modern applications. Disabling it reduces the attack surface.

```yaml
security:
  javascriptEnabled: false
```

## Configuring SCRAM Authentication Mechanism

MongoDB 4.0 and later support both SCRAM-SHA-1 and SCRAM-SHA-256. Disable SCRAM-SHA-1 to enforce the stronger mechanism using `setParameter` in `mongod.conf`.

```yaml
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

## Enabling Encryption at Rest

For MongoDB Enterprise, enable encrypted storage at rest using the `enableEncryption` field.

```yaml
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/encryption-keyfile
```

Community Edition requires filesystem-level encryption (such as LUKS) instead.

## Verifying Security Configuration

Check the current authorization state at runtime.

```javascript
db.adminCommand({ getCmdLineOpts: 1 }).parsed.security
db.adminCommand({ getParameter: 1, authenticationMechanisms: 1 })
```

## Summary

The `security` section in `mongod.conf` is the foundation of MongoDB access control. Enable `authorization`, use a keyfile for replica set member authentication, disable the JavaScript engine unless required, and restrict SCRAM to SHA-256. Always create an admin user before enabling authorization to avoid locking yourself out of the instance.
