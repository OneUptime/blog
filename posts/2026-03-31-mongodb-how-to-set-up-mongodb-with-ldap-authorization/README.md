# How to Set Up MongoDB with LDAP Authorization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, LDAP, Authorization, Security, Enterprise

Description: Learn how to configure MongoDB Enterprise to use LDAP for user authorization, mapping LDAP groups to MongoDB roles for centralized access control.

---

## Overview

MongoDB Enterprise supports two LDAP integration modes:
- **LDAP Authentication** - MongoDB proxies the authentication request to the LDAP server
- **LDAP Authorization** - MongoDB queries LDAP for the user's groups and maps them to MongoDB roles

This guide covers LDAP authorization, where MongoDB still authenticates users (via SCRAM or Kerberos) but fetches role assignments from LDAP group membership.

## Prerequisites

- MongoDB Enterprise 3.4 or later
- An LDAP server (Active Directory, OpenLDAP)
- Network connectivity from mongod to the LDAP server
- `mongoldap` utility (included with Enterprise) for testing

## mongod.conf Configuration

```yaml
security:
  authorization: enabled
  ldap:
    servers: "ldap.company.com"
    transportSecurity: tls
    bind:
      method: simple
      queryUser: "cn=mongobind,ou=service,dc=company,dc=com"
      queryPassword: "bindPassword"
    userToDNMapping:
      '[
        {
          match: "(.+)",
          ldapQuery: "ou=users,dc=company,dc=com??sub?(uid={0})"
        }
      ]'
    authz:
      queryTemplate: "{USER}?memberOf?base"

setParameter:
  authenticationMechanisms: PLAIN
```

Key fields explained:
- `servers` - LDAP server hostname or IP
- `userToDNMapping` - transforms the MongoDB username into an LDAP Distinguished Name
- `authz.queryTemplate` - the LDAP query used to fetch group membership
- `authenticationMechanisms: PLAIN` - required for LDAP password pass-through

## Creating Role Mappings

In MongoDB, create roles that map to LDAP group DNs. The role name must exactly match the LDAP group DN:

```javascript
// Create a readOnly role for the LDAP group "cn=dbReaders,ou=groups,dc=company,dc=com"
db.adminCommand({
  createRole: "cn=dbReaders,ou=groups,dc=company,dc=com",
  privileges: [],
  roles: [{ role: "read", db: "mydb" }]
});

// Create a readWrite role for LDAP group "cn=dbWriters,..."
db.adminCommand({
  createRole: "cn=dbWriters,ou=groups,dc=company,dc=com",
  privileges: [],
  roles: [{ role: "readWrite", db: "mydb" }]
});

// Create a DBA role for LDAP group admins
db.adminCommand({
  createRole: "cn=dbAdmins,ou=groups,dc=company,dc=com",
  privileges: [],
  roles: [{ role: "dbAdmin", db: "mydb" }, { role: "clusterMonitor", db: "admin" }]
});
```

## Testing with mongoldap

Before restarting mongod, validate your LDAP configuration:

```bash
mongoldap \
  --config /etc/mongod.conf \
  --user "jdoe" \
  --password "userPassword"
```

Expected output:

```text
Parsing MongoDB Configuration File...
Running MongoDB LDAP authorization validation checks...
Successfully authenticated with LDAP

Querying LDAP for groups of user 'jdoe'...
Successfully acquired the following roles:
  cn=dbReaders,ou=groups,dc=company,dc=com@admin
```

## Connecting as an LDAP User

Users connect using their LDAP credentials with the `$external` authentication database:

```bash
mongosh \
  --host localhost \
  --port 27017 \
  --authenticationMechanism PLAIN \
  --authenticationDatabase '$external' \
  --username jdoe \
  --password 'userPassword'
```

Node.js connection string:

```javascript
const uri = "mongodb://jdoe:userPassword@localhost:27017/?authSource=$external&authMechanism=PLAIN";
const client = new MongoClient(uri);
```

## TLS Configuration for LDAP

Always use TLS for LDAP connections in production. MongoDB supports two approaches:

**STARTTLS (port 389)** - upgrades a plaintext connection to TLS:

```yaml
security:
  ldap:
    servers: "ldap.company.com:389"
    transportSecurity: tls
```

**LDAPS (port 636)** - implicit TLS from the start, common with Active Directory:

```yaml
security:
  ldap:
    servers: "ldaps://ldap.company.com:636"
    transportSecurity: none
```

When using `ldaps://`, set `transportSecurity: none` because TLS is already handled by the LDAPS protocol. MongoDB uses the operating system's CA certificate store to verify the LDAP server certificate. On Linux, configure `TLS_CACERT` in `/etc/openldap/ldap.conf` to specify a custom CA certificate.

## Refreshing LDAP Group Cache

MongoDB caches LDAP authorization results. If group membership changes, the cache must expire:

```yaml
setParameter:
  ldapUserCacheInvalidationInterval: 30  # seconds (default 30)
```

Force immediate cache invalidation:

```javascript
db.adminCommand({ invalidateUserCache: 1 });
```

## Troubleshooting

Enable verbose LDAP logging:

```javascript
db.adminCommand({ setParameter: 1, logLevel: 2 });
```

Check logs for `LDAP` tagged lines to trace query templates and bind operations.

## Summary

MongoDB LDAP authorization centralizes access control by fetching group membership from LDAP and mapping group DNs to MongoDB roles. Configure `userToDNMapping` to translate usernames to LDAP DNs, define `authz.queryTemplate` to fetch groups, and create MongoDB roles whose names match LDAP group DNs exactly. Use `mongoldap` to validate the configuration before deploying to production.
