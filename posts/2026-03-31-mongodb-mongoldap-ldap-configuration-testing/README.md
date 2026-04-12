# How to Use mongoldap for LDAP Configuration Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, LDAP, Security, Authentication, Configuration

Description: Learn how to use the mongoldap tool to validate and test your LDAP configuration before enabling it in a live MongoDB deployment.

---

## What Is mongoldap

`mongoldap` is a diagnostic utility included with MongoDB Enterprise that lets you test your LDAP authorization configuration without modifying a running `mongod` instance. It simulates how MongoDB would authenticate a user and resolve their LDAP group memberships, making it an essential tool for validating `mongod.conf` LDAP settings before going live.

Using `mongoldap` reduces the risk of locking yourself out of a database or misconfiguring group-to-role mappings in production.

## Prerequisites

- MongoDB Enterprise installed (mongoldap ships with enterprise)
- Network access to your LDAP server from the MongoDB host
- A test LDAP user account and password
- A `mongod.conf` file with your intended LDAP configuration

## Basic Usage

The minimum invocation requires pointing `mongoldap` at your config file and supplying a username:

```bash
mongoldap \
  --config /etc/mongod.conf \
  --user "cn=alice,ou=users,dc=example,dc=com" \
  --password "alicepassword"
```

`mongoldap` reads the `security.ldap` section from your config file, connects to the LDAP server, and prints the resolved roles. No `mongod` process is required.

## Sample mongod.conf LDAP Section

Here is an example LDAP block that `mongoldap` will read:

```yaml
security:
  authorization: enabled
  ldap:
    servers: "ldap.example.com:389"
    transportSecurity: tls
    bind:
      method: simple
      queryUser: "cn=mongo-svc,ou=service,dc=example,dc=com"
      queryPassword: "servicepassword"
    userToDNMapping:
      '[
        {
          match: "(.+)",
          ldapQuery: "ou=users,dc=example,dc=com??sub?(uid={0})"
        }
      ]'
    authz:
      queryTemplate: "ou=groups,dc=example,dc=com??sub?(&(objectClass=groupOfNames)(member={USER}))"
```

## Interpreting mongoldap Output

A successful run produces output like:

```text
Running MongoDB LDAP authorization validation checks...

Checking that an LDAP server has been specified...
[OK] LDAP server(s) provided in configuration

Connecting to LDAP server at ldap.example.com:389...
[OK] Connected to LDAP server

Attempting to authenticate against the LDAP server...
[OK] Successful authentication performed

Checking if the authenticated user is authorized...
[OK] Successfully acquired the following roles on the 'admin' database:
  [ { role: "readWrite", db: "appdb" } ]
```

If there is a problem, `mongoldap` will print a detailed error such as a failed bind, an empty group result, or an LDAP filter syntax error - far easier to diagnose than sifting through `mongod` logs.

## Testing with Different User Mapping Strategies

MongoDB supports multiple `userToDNMapping` approaches. You can test with a plain username to verify the transformation step resolves the correct DN:

```bash
# Test username-to-DN transformation and authz query
mongoldap \
  --config /etc/mongod.conf \
  --user "alice" \
  --password "alicepassword"
```

To test with a custom LDAP server override without editing the config file:

```bash
mongoldap \
  --config /etc/mongod.conf \
  --ldapServers "ldap2.example.com:636" \
  --ldapTransportSecurity tls \
  --user "alice" \
  --password "alicepassword"
```

## Common Errors and Fixes

| Error | Likely Cause | Fix |
|---|---|---|
| `LDAP bind failed` | Wrong queryUser/queryPassword | Verify service account credentials |
| `No groups found` | Wrong authz query template | Check `member` vs `uniqueMember` attribute |
| `Can't contact LDAP server` | Network/firewall issue | Verify port 389 or 636 access |
| `Invalid DN syntax` | Malformed userToDNMapping | Validate DN strings with `ldapsearch` |

Test your LDAP query directly with `ldapsearch` to isolate filter issues:

```bash
ldapsearch -H ldap://ldap.example.com -D "cn=mongo-svc,ou=service,dc=example,dc=com" \
  -w "servicepassword" \
  -b "ou=groups,dc=example,dc=com" \
  "(&(objectClass=groupOfNames)(member=cn=alice,ou=users,dc=example,dc=com))" dn
```

## Summary

`mongoldap` is your first line of defense when configuring MongoDB LDAP authorization. By running it against your `mongod.conf` LDAP settings before applying them to a live instance, you can validate bind credentials, user-to-DN transformations, group membership queries, and role mappings - all without risking service disruption. Always test with a representative set of users, including edge cases like users who belong to no groups or multiple nested groups.
