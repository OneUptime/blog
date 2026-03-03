# How to Configure Access Control in OpenLDAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, Security, ACL, LDAP

Description: Configure OpenLDAP access control lists (ACLs) on Ubuntu to restrict who can read, write, and modify directory entries and attributes.

---

OpenLDAP's access control system determines who can read, write, add, or delete directory entries and attributes. Without proper access control, you risk exposing sensitive data like hashed passwords to unauthorized readers, or allowing unauthorized modifications to directory entries. This guide covers the ACL syntax, common patterns, and how to apply and verify access rules.

## How OpenLDAP ACLs Work

OpenLDAP evaluates ACLs in order, stopping at the first matching rule. Each rule has two parts:

1. **What** - the resource being protected (`to` clause): an attribute, subtree, or specific entry
2. **Who** - the principal (`by` clause): specific DN, group, anonymous users, authenticated users, or everyone

Basic syntax:

```text
access to <what>
  by <who> <access-level> [control]
  by <who> <access-level> [control]
```

Access levels, from lowest to highest:
- `none` - no access at all
- `disclose` - can see that the entry exists (for error messages)
- `auth` - can use for authentication only (bind operations)
- `compare` - can compare attribute values
- `search` - can use in search filters
- `read` - can read attribute values
- `write` - can modify attributes
- `add` - can add new entries
- `delete` - can delete entries
- `manage` - full management access

## Viewing Current ACLs

```bash
# View ACLs for the main database
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "olcDatabase={1}mdb,cn=config" \
  "(objectClass=olcDatabaseConfig)" \
  olcAccess

# View in a more readable way
sudo ldapsearch -Y EXTERNAL -H ldapi:/// -LLL \
  -b "olcDatabase={1}mdb,cn=config" \
  "(objectClass=*)" olcAccess | \
  grep "olcAccess" | nl
```

## Default ACL Behavior

OpenLDAP ships with a permissive default that allows anyone to read most attributes. The default rule is essentially:

```text
access to *
  by * read
```

You should replace this with stricter rules for production use.

## Common ACL Patterns

### Pattern 1: Protect Passwords

This is the most critical ACL - ensure only authenticated users can change their own password, only admins can write it, and it is usable for authentication:

```ldif
# ACL 0: Protect userPassword
access to attrs=userPassword
  by self write
  by anonymous auth
  by dn="cn=admin,dc=example,dc=com" write
  by dn="cn=replicator,dc=example,dc=com" read
  by * none
```

### Pattern 2: Let Users Edit Their Own Attributes

```ldif
# ACL 1: Allow self-modification of personal attributes
access to attrs=mail,telephoneNumber,mobile,displayName,description
  by self write
  by dn="cn=admin,dc=example,dc=com" write
  by * read
```

### Pattern 3: Protect Shadow Attributes

Shadow account attributes (`shadowLastChange`, `shadowExpire`, etc.) should be restricted:

```ldif
# ACL 2: Shadow attributes - only admin and self
access to attrs=shadowLastChange,shadowExpire,shadowMin,shadowMax,shadowWarning,shadowInactive
  by self write
  by dn="cn=admin,dc=example,dc=com" write
  by anonymous auth
  by * none
```

### Pattern 4: Read-Only Access to Subtrees

```ldif
# ACL 3: HR staff can read People OU but not modify
access to dn.subtree="ou=People,dc=example,dc=com"
  by dn="cn=admin,dc=example,dc=com" write
  by group.exact="cn=hr,ou=Groups,dc=example,dc=com" read
  by self read
  by * none
```

### Pattern 5: Full Catch-All

Always include a catch-all at the end:

```ldif
# ACL last: Default - authenticated users read, others nothing
access to *
  by dn="cn=admin,dc=example,dc=com" write
  by dn="cn=replicator,dc=example,dc=com" read
  by users read
  by * none
```

## Applying ACLs via LDIF

ACLs are configured in `cn=config` using LDIF modifications. The `{N}` prefix in `olcAccess` determines order:

```bash
sudo nano /tmp/acls.ldif
```

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcAccess
olcAccess: {0}to attrs=userPassword
  by self write
  by anonymous auth
  by dn="cn=admin,dc=example,dc=com" write
  by dn="cn=replicator,dc=example,dc=com" read
  by * none
olcAccess: {1}to attrs=shadowLastChange
  by self write
  by dn="cn=admin,dc=example,dc=com" write
  by anonymous auth
  by * none
olcAccess: {2}to dn.subtree="ou=ServiceAccounts,dc=example,dc=com"
  by dn="cn=admin,dc=example,dc=com" write
  by dn="cn=readonly,dc=example,dc=com" read
  by * none
olcAccess: {3}to *
  by dn="cn=admin,dc=example,dc=com" write
  by dn="cn=replicator,dc=example,dc=com" read
  by dn="cn=readonly,dc=example,dc=com" read
  by self write
  by users read
  by * none
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/acls.ldif
```

## Adding a Single ACL Without Replacing All

To insert a new ACL at a specific position without replacing the entire ruleset:

```ldif
# Insert a new ACL at position 2 (shifting others down)
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcAccess
olcAccess: {2}to dn.exact="ou=Restricted,dc=example,dc=com"
  by dn="cn=admin,dc=example,dc=com" write
  by dn.subtree="cn=SecurityTeam,ou=Groups,dc=example,dc=com" read
  by * none
```

## Group-Based Access Control

Grant access to members of an LDAP group:

```ldif
# Allow members of 'sysadmins' group to write to Computers OU
access to dn.subtree="ou=Computers,dc=example,dc=com"
  by group.exact="cn=sysadmins,ou=Groups,dc=example,dc=com" write
  by dn="cn=admin,dc=example,dc=com" write
  by * none
```

For `groupOfNames` (member is a full DN):

```ldif
access to dn.subtree="ou=People,dc=example,dc=com"
  by group/groupOfNames/member.exact="cn=hr,ou=Groups,dc=example,dc=com" read
  by dn="cn=admin,dc=example,dc=com" write
  by * none
```

## DN-Pattern Based Access

Use `dn.regex` for pattern matching:

```ldif
# Managers can write entries in their department's OU
# DN format: cn=manager,ou=Engineering,dc=example,dc=com
access to dn.regex="ou=([^,]+),dc=example,dc=com"
  by dn.regex="cn=manager,ou=$1,dc=example,dc=com" write
  by * read
```

## Testing ACLs

OpenLDAP includes `slapacl` to test access rules without actually making requests:

```bash
# Test if 'jsmith' can read the userPassword of another user
sudo slapacl -F /etc/ldap/slapd.d \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -b "uid=bwilliams,ou=People,dc=example,dc=com" \
  "userPassword/read"

# Test if anonymous user can read a user's CN
sudo slapacl -F /etc/ldap/slapd.d \
  -D "" \
  -b "uid=jsmith,ou=People,dc=example,dc=com" \
  "cn/read"

# Test if admin can write
sudo slapacl -F /etc/ldap/slapd.d \
  -D "cn=admin,dc=example,dc=com" \
  -b "uid=jsmith,ou=People,dc=example,dc=com" \
  "userPassword/write"
```

Output will be `ALLOWED` or `DENIED`.

## Checking ACLs by Searching with a Regular User

Another practical test - bind as a non-admin user and try to search:

```bash
# As a regular user, try to read another user's password hash
ldapsearch -x -H ldap://localhost \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -W \
  -b "uid=bwilliams,ou=People,dc=example,dc=com" \
  "(objectClass=*)" userPassword

# Should return the entry without userPassword (attribute omitted due to ACL)
```

## Troubleshooting ACL Issues

**User cannot authenticate** - the `userPassword` ACL may be blocking `auth` access for anonymous. Ensure `by anonymous auth` appears before `by * none`.

**Search returns no entries for a regular user** - the user cannot `search` the filter attributes. The bind DN needs at least `search` access.

**Replication failing** - the replication account needs `read` access to `userPassword`. Add `by dn="cn=replicator,..." read` to the password ACL.

Enable access logging to see what is being denied:

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// << EOF
dn: cn=config
changetype: modify
replace: olcLogLevel
olcLogLevel: acl stats
EOF

sudo journalctl -u slapd -f | grep "access"
```

Properly configured ACLs are a fundamental part of LDAP security, ensuring that users and applications can only see and modify exactly what they need.
