# How to Disable Unused MongoDB Authentication Mechanisms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authentication, Hardening, Configuration

Description: Learn how to restrict MongoDB to only the authentication mechanisms your deployment uses, reducing attack surface by disabling MONGODB-CR and other unused mechanisms.

---

MongoDB supports multiple authentication mechanisms including SCRAM-SHA-1, SCRAM-SHA-256, MONGODB-CR, GSSAPI (Kerberos), PLAIN (LDAP), and x.509. Disabling mechanisms you do not use reduces the attack surface by eliminating authentication methods that could be exploited or misused.

## List All Supported Mechanisms

MongoDB enables SCRAM-SHA-1 and SCRAM-SHA-256 by default. Check which mechanisms are currently active:

```javascript
db.adminCommand({ getParameter: 1, authenticationMechanisms: 1 })
// Returns: { "authenticationMechanisms": ["SCRAM-SHA-1", "SCRAM-SHA-256"] }
```

## Configure Allowed Mechanisms

Control which mechanisms MongoDB accepts via the `authenticationMechanisms` parameter in `mongod.conf`:

```yaml
security:
  authorization: enabled

setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

This restricts MongoDB to only SCRAM-SHA-256, refusing connection attempts using SCRAM-SHA-1 or any other mechanism.

## Disable SCRAM-SHA-1 (Prefer SHA-256 Only)

SCRAM-SHA-1 is the older mechanism. If your drivers support SCRAM-SHA-256 (MongoDB 4.0+ drivers do), disable SHA-1:

```yaml
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

Test all application clients before removing SCRAM-SHA-1 - older drivers may only support SHA-1.

## Allow Multiple Mechanisms (Enterprise with LDAP and GSSAPI)

In enterprise setups using LDAP and Kerberos alongside internal users, allow only the needed mechanisms:

```yaml
security:
  authorization: enabled
  ldap:
    servers: "ldap.example.com"
    authz:
      queryTemplate: "..."

setParameter:
  authenticationMechanisms: SCRAM-SHA-256,GSSAPI,PLAIN
```

Never include `MONGODB-CR` - it is deprecated and cryptographically weak.

## Apply via Command Line (for Testing)

```bash
mongod \
  --auth \
  --setParameter authenticationMechanisms=SCRAM-SHA-256 \
  --config /etc/mongod.conf
```

## Verify the Configuration

After restarting `mongod`, verify the mechanism list:

```javascript
db.adminCommand({ getParameter: 1, authenticationMechanisms: 1 })
// Should only show: ["SCRAM-SHA-256"]
```

Attempt a connection using a disabled mechanism to confirm it is rejected:

```bash
mongosh --host localhost \
  --authenticationMechanism SCRAM-SHA-1 \
  --username admin --password pass \
  --authenticationDatabase admin
# Should fail: "Authentication mechanism SCRAM-SHA-1 is not enabled"
```

## Remove MONGODB-CR Entirely

`MONGODB-CR` was deprecated in MongoDB 3.6 and removed in 4.0. If you are running an older version, ensure no users still rely on it:

```javascript
// Check for users with MONGODB-CR credentials
use admin
db.system.users.find({ "credentials.MONGODB-CR": { $exists: true } }).count()
```

Upgrade users to SCRAM by updating their password:

```javascript
db.updateUser("olduser", { pwd: "NewSecurePassword!" })
```

This re-creates credentials using the currently enabled mechanisms.

## Summary

Disabling unused MongoDB authentication mechanisms reduces the attack surface of your deployment. Restrict `authenticationMechanisms` to only what your environment uses - typically `SCRAM-SHA-256` for standard deployments, with `GSSAPI` or `PLAIN` added only if Kerberos or LDAP integration is required. Always test driver compatibility before removing SCRAM-SHA-1.
