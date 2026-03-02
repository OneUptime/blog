# How to Use ldapsearch for Querying LDAP Directories on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, ldapsearch, OpenLDAP, Directory Services

Description: Master ldapsearch on Ubuntu to query LDAP directories effectively, with practical filter syntax, attribute selection, and real-world examples.

---

`ldapsearch` is the primary command-line tool for querying LDAP directories. Whether you are debugging an authentication issue, auditing group membership, or exploring an unfamiliar directory structure, `ldapsearch` is the tool you reach for first. This guide covers the full syntax with practical examples that cover the most common use cases.

## Basic Syntax

```
ldapsearch [options] [filter] [attributes...]
```

Key options:

| Option | Description |
|--------|-------------|
| `-x` | Simple authentication (not SASL) |
| `-H uri` | LDAP server URI |
| `-D binddn` | Bind DN (who you authenticate as) |
| `-W` | Prompt for password |
| `-w password` | Password on command line (avoid in scripts) |
| `-b basedn` | Search base DN |
| `-s scope` | Search scope: `base`, `one`, `sub` (default) |
| `-L` | LDIF output format (use `-LLL` for clean output) |
| `-z limit` | Maximum entries to return |
| `-l timelimit` | Maximum seconds to wait |
| `-v` | Verbose mode |

## Your First ldapsearch

```bash
# Anonymous search - list base entry
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"

# Authenticated search - list all entries
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)"
```

## Search Scopes

Scope controls how deep the search goes from the base DN:

```bash
# base - search ONLY the base DN entry itself
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"

# one - search immediate children of the base DN (one level down)
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -s one "(objectClass=*)"

# sub - search base DN and all descendants (default)
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -s sub "(objectClass=posixAccount)"
```

## Filter Syntax

LDAP filters use a prefix notation enclosed in parentheses.

### Basic Filters

```bash
# Equality
ldapsearch ... "(uid=jsmith)"

# Presence (attribute exists)
ldapsearch ... "(mail=*)"

# Substring
ldapsearch ... "(cn=John*)"          # starts with John
ldapsearch ... "(cn=*Smith)"         # ends with Smith
ldapsearch ... "(cn=*oh*)"           # contains oh

# Greater than or equal
ldapsearch ... "(uidNumber>=10000)"

# Less than or equal
ldapsearch ... "(uidNumber<=20000)"
```

### Compound Filters

```bash
# AND - user must have uid AND mail
ldapsearch ... "(&(objectClass=inetOrgPerson)(mail=*))"

# OR - find admins or devops group members
ldapsearch ... "(|(memberOf=cn=admins,ou=Groups,dc=example,dc=com)(memberOf=cn=devops,ou=Groups,dc=example,dc=com))"

# NOT - all users except service accounts
ldapsearch ... "(&(objectClass=posixAccount)(!(ou=ServiceAccounts)))"

# Nested - users with mail in example.com who are active
ldapsearch ... "(&(objectClass=inetOrgPerson)(mail=*@example.com)(!(pwdAccountLocked=TRUE)))"
```

## Selecting Specific Attributes

By default, ldapsearch returns all attributes a user is authorized to read. Specify attribute names to limit output:

```bash
# Return only uid and mail
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=posixAccount)" \
  uid mail homeDirectory loginShell

# Return only DNs (useful for counting or piping)
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=posixAccount)" \
  dn

# Return operational attributes (entryUUID, modifyTimestamp, etc.)
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(uid=jsmith)" \
  "+" "*"
# * = all regular attributes, + = all operational attributes
```

## Practical Examples

### List All Users

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(objectClass=posixAccount)" \
  uid cn mail uidNumber gidNumber
```

### Find a User by Email

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(mail=jsmith@example.com)" \
  uid cn dn
```

### List All Groups and Their Members

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=Groups,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(objectClass=posixGroup)" \
  cn memberUid
```

### Find Groups a User Belongs To

```bash
# For posixGroup (memberUid stores username)
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=Groups,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(memberUid=jsmith)" \
  cn

# For groupOfNames (member stores full DN)
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=Groups,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(member=uid=jsmith,ou=People,dc=example,dc=com)" \
  cn
```

### Count Users in a OU

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(objectClass=posixAccount)" \
  dn | grep "^dn:" | wc -l
```

### Check if an Account is Locked

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL \
  "(uid=jsmith)" \
  pwdAccountLocked pwdFailureTime pwdChangedTime
```

### Search Active Directory from Ubuntu

When querying Active Directory rather than OpenLDAP, the syntax is similar but the attributes and base DNs differ:

```bash
# Search AD users
ldapsearch -x -H ldap://dc.corp.example.com \
  -b "dc=corp,dc=example,dc=com" \
  -D "svc-ldap@corp.example.com" \
  -W -LLL \
  "(&(objectClass=user)(sAMAccountName=jsmith))" \
  sAMAccountName cn mail memberOf

# Use GSSAPI (Kerberos) authentication with AD
ldapsearch -Y GSSAPI -H ldap://dc.corp.example.com \
  -b "dc=corp,dc=example,dc=com" \
  "(objectClass=user)" \
  sAMAccountName
```

## Using TLS with ldapsearch

```bash
# StartTLS on port 389
ldapsearch -x -H ldap://ldap.example.com \
  -Z \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)"

# LDAPS on port 636
ldapsearch -x -H ldaps://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)"
```

Configure default TLS behavior in `/etc/ldap/ldap.conf`:

```bash
# Require certificate validation
TLS_REQCERT demand
TLS_CACERT /etc/ssl/certs/ca-certificates.crt

# Or for development/testing, skip validation
TLS_REQCERT never
```

## Formatting Output

### Clean LDIF Output

The `-LLL` flag removes LDIF header comments and extra blank lines:

```bash
ldapsearch -LLL -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(uid=jsmith)"
```

### Extracting Values with grep and awk

```bash
# Extract all email addresses
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL "(objectClass=posixAccount)" mail | \
  grep "^mail:" | awk '{print $2}'

# Extract UIDs as a sorted list
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -LLL "(objectClass=posixAccount)" uid | \
  grep "^uid:" | awk '{print $2}' | sort
```

## Configuring ldap.conf Defaults

To avoid typing the server and base DN every time, set defaults in `/etc/ldap/ldap.conf`:

```bash
sudo nano /etc/ldap/ldap.conf
```

```
BASE    dc=example,dc=com
URI     ldap://ldap.example.com
BINDDN  cn=admin,dc=example,dc=com

TLS_CACERT /etc/ssl/certs/ca-certificates.crt
TLS_REQCERT demand
```

With these defaults, the search becomes:

```bash
# Much shorter command
ldapsearch -x -W "(uid=jsmith)"
```

## Using SASL Authentication

For Kerberos-authenticated searches:

```bash
# Authenticate with Kerberos ticket
kinit jsmith@EXAMPLE.COM

ldapsearch -Y GSSAPI \
  -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  "(objectClass=posixAccount)"

# Authenticate via local socket (root only, on LDAP server)
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "cn=config" "(objectClass=*)"
```

With these techniques, `ldapsearch` becomes a powerful tool for directory administration, debugging, and auditing across both OpenLDAP and Active Directory environments.
