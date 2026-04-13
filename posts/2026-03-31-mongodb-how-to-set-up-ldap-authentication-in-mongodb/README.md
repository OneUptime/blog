# How to Set Up LDAP Authentication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, LDAP, Security, Enterprise

Description: Configure MongoDB Enterprise to authenticate users against an LDAP directory server, enabling centralized identity management for database access.

---

## Requirements

LDAP authentication requires **MongoDB Enterprise**. It is not available in MongoDB Community Edition. You also need a running LDAP server (Active Directory, OpenLDAP, etc.).

## How MongoDB LDAP Authentication Works

When a user authenticates, MongoDB proxies the credentials to the LDAP server. If LDAP validates the credentials, MongoDB then maps the LDAP user to a MongoDB role based on the user's LDAP groups or attributes. MongoDB itself stores no password.

## Step 1: Configure mongod.conf for LDAP

```yaml
# /etc/mongod.conf
security:
  authorization: enabled
  ldap:
    servers: "ldap.example.com"
    transportSecurity: tls
    bind:
      method: simple
      queryUser: "cn=mongodbService,ou=serviceAccounts,dc=example,dc=com"
      queryPassword: "serviceAccountPassword"
    userToDNMapping:
      '[
        {
          match: "(.+)",
          ldapQuery: "ou=users,dc=example,dc=com??sub?(uid={0})"
        }
      ]'
    authz:
      queryTemplate: >
        {USER}?memberOf?base

setParameter:
  authenticationMechanisms: "PLAIN"
```

## Step 2: Create MongoDB Roles Matching LDAP Groups

MongoDB maps LDAP groups to roles on the `admin` database. Create roles whose names match the LDAP group DNs:

```javascript
use admin

db.createRole({
  role: "cn=dbAdmins,ou=groups,dc=example,dc=com",
  privileges: [],
  roles: [{ role: "readWriteAnyDatabase", db: "admin" }]
});

db.createRole({
  role: "cn=dbReaders,ou=groups,dc=example,dc=com",
  privileges: [],
  roles: [{ role: "readAnyDatabase", db: "admin" }]
});
```

## Step 3: Test the Configuration

Use `mongoldap` (included with MongoDB Enterprise) to test your LDAP configuration before restarting:

```bash
mongoldap \
  --config /etc/mongod.conf \
  --user "alice" \
  --password
```

Output shows what roles MongoDB would assign to the user.

## Step 4: Connect as an LDAP User

Clients connect using the LDAP username and password with the `PLAIN` mechanism:

```bash
mongosh \
  --host mongo.example.com \
  --port 27017 \
  --username alice \
  --password \
  --authenticationMechanism PLAIN \
  --authenticationDatabase '$external'
```

```javascript
// Node.js
const client = new MongoClient("mongodb://alice:password@mongo.example.com:27017", {
  authMechanism: "PLAIN",
  authSource: "$external"
});
```

## LDAP Authorization Without Authentication

MongoDB can also use LDAP for authorization only (to query group membership) while keeping SCRAM-SHA-256 for authentication. This is configured separately via `security.ldap.authz`.

## Summary

MongoDB Enterprise LDAP authentication proxies login credentials to an LDAP server and maps LDAP group membership to MongoDB roles defined in `$external`. Configure `security.ldap` in `mongod.conf` with server details and mapping rules, create roles matching LDAP group DNs, and test with `mongoldap` before deploying.
