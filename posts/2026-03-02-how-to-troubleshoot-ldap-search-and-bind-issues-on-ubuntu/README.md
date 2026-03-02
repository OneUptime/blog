# How to Troubleshoot LDAP Search and Bind Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, Troubleshooting, OpenLDAP, Authentication

Description: Diagnose and fix common LDAP search and bind failures on Ubuntu, including credential errors, TLS problems, and connectivity issues.

---

LDAP issues tend to surface at the worst time - users cannot log in, applications cannot authenticate, and the error messages are often cryptic. This guide covers a systematic approach to diagnosing LDAP search and bind problems on Ubuntu, from basic connectivity checks to deep-diving into slapd logs.

## Understanding LDAP Operations

Two fundamental LDAP operations are involved in almost every authentication flow:

- **Bind** - authenticating to the directory server (like a login). A "simple bind" sends a DN and password; an anonymous bind sends neither.
- **Search** - querying the directory for entries matching a filter. Most applications first search for the user's DN, then bind with that DN and the provided password.

Failures in either operation are common sources of authentication problems.

## Basic Connectivity Check

Before assuming LDAP configuration is the issue, verify basic network connectivity:

```bash
# Test TCP connectivity to LDAP port
nc -zv ldap.example.com 389

# Test LDAPS port
nc -zv ldap.example.com 636

# Test with ldapsearch (anonymous)
ldapsearch -x -H ldap://ldap.example.com -b "" -s base "(objectClass=*)" namingContexts
```

If the anonymous search returns the naming context (e.g., `dc=example,dc=com`), the server is reachable and responding. If this fails, the issue is network or server-level, not LDAP configuration.

## Error Code Reference

LDAP errors are returned as result codes. The most common ones:

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| 0 | Success | |
| 1 | Operations error | Server-side error; check slapd logs |
| 4 | Size limit exceeded | Too many results; add filter or increase sizelimit |
| 32 | No such object | Base DN does not exist |
| 34 | Invalid DN syntax | Malformed DN string |
| 49 | Invalid credentials | Wrong password |
| 50 | Insufficient access | ACL denied the operation |
| 51 | Server busy | Server overloaded |
| 52 | Server unavailable | Server shutting down or not running |

## Diagnosing Bind Failures (Error 49)

Error 49 "Invalid credentials" is one of the most common issues:

```bash
# Test an explicit bind
ldapwhoami -x -H ldap://ldap.example.com \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -W

# Test the admin bind
ldapwhoami -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W
```

Common causes:
1. **Wrong DN format** - check whether the application uses `uid=user,ou=People,dc=...` or `cn=user,dc=...`
2. **Password with special characters** - shell escaping issues when passing passwords via command line
3. **Account locked or expired** - check `pwdAccountLocked` and shadow attributes
4. **Password stored with wrong scheme** - e.g., plain text when the client expects hashed

Check the user's stored password scheme:

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "ou=People,dc=example,dc=com" \
  "(uid=jsmith)" userPassword
```

The value should start with `{SSHA}`, `{SHA}`, or similar. If it shows plaintext, reset with `slappasswd`:

```bash
# Generate a proper hash
slappasswd -s "NewPassword123!"

# Then modify the user
ldapmodify -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W << EOF
dn: uid=jsmith,ou=People,dc=example,dc=com
changetype: modify
replace: userPassword
userPassword: {SSHA}NewHashHere
EOF
```

## Diagnosing Search Failures

### Error 32 - No Such Object

The base DN you are searching from does not exist:

```bash
# Verify the base DN exists
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"
```

If this fails, the base DN is missing or the DN is typed incorrectly. Check spacing and commas - `dc=example, dc=com` (with a space) is different from `dc=example,dc=com`.

### Error 50 - Insufficient Access

The bind account does not have permission to search:

```bash
# Check what ACLs are configured
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "olcDatabase={1}mdb,cn=config" \
  "(objectClass=olcDatabaseConfig)" olcAccess
```

Test with the admin account to confirm data exists, then try with the restricted account to isolate the permission issue.

### Empty Results with No Error

The search succeeds but returns no entries. Check the filter:

```bash
# Search with a broad filter first
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "dc=example,dc=com" \
  "(objectClass=*)" dn

# Then narrow with the specific filter your application uses
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "dc=example,dc=com" \
  "(uid=jsmith)" dn
```

If `(objectClass=*)` returns entries but `(uid=jsmith)` does not, either the attribute name or value is wrong. Check the actual attribute name in the directory.

## TLS Troubleshooting

### Certificate Errors

```bash
# Test TLS handshake
openssl s_client -connect ldap.example.com:636 2>&1 | head -30

# Test StartTLS
openssl s_client -connect ldap.example.com:389 -starttls ldap 2>&1 | head -30
```

Common TLS errors:

**"certificate verify failed"** - client does not trust the CA:
```bash
# Temporarily bypass certificate validation to confirm this is the issue
ldapsearch -x -H ldaps://ldap.example.com \
  -o TLS_REQCERT=never \
  -b "dc=example,dc=com" "(objectClass=*)"
```

If the bypass works, install the CA cert on the client:
```bash
sudo cp ldap-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**"unknown protocol"** - client is connecting to LDAPS when the server is only doing StartTLS, or vice versa.

**"Connection timed out"** - firewall blocking port 636. Check with `nc -zv ldap.example.com 636`.

## Enabling slapd Debug Logging

For detailed server-side logging:

```bash
# View live slapd logs
sudo journalctl -u slapd -f

# Enable stats logging (level 256)
sudo ldapmodify -Y EXTERNAL -H ldapi:/// << EOF
dn: cn=config
changetype: modify
replace: olcLogLevel
olcLogLevel: stats
EOF
```

Log levels useful for debugging:

| Level | Name | Content |
|-------|------|---------|
| 64 | filter | Filter processing |
| 128 | config | Configuration processing |
| 256 | stats | Connection, operations, results |
| 512 | stats2 | Sent entries |
| 1024 | shell | Shell backend stats |
| 32768 | none | Only emergency messages |

Combine levels: `olcLogLevel: 256 64` for stats plus filter processing.

## Client-Side Debugging with SSSD

If the issue is with SSSD specifically:

```bash
# Enable debug in sssd.conf
sudo nano /etc/sssd/sssd.conf
# Add under [domain/example.com]:
# debug_level = 7

sudo systemctl restart sssd

# Watch SSSD logs
sudo journalctl -u sssd -f

# Or check the log files directly
sudo tail -f /var/log/sssd/sssd_example.com.log
```

Clear the SSSD cache when testing changes:

```bash
sudo sss_cache -E
sudo systemctl restart sssd
```

## Testing Application Bind Accounts

When an application cannot authenticate, simulate exactly what the application does:

```bash
# Step 1: Bind as the service account used by the application
ldapwhoami -x -H ldap://ldap.example.com \
  -D "cn=appservice,dc=example,dc=com" \
  -W

# Step 2: Search as the service account (the way the app would)
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=appservice,dc=example,dc=com" \
  -W \
  -b "ou=People,dc=example,dc=com" \
  "(uid=jsmith)" dn mail

# Step 3: Bind as the user (password verification)
ldapwhoami -x -H ldap://ldap.example.com \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -w "UserPassword"
```

This sequence reproduces the bind-search-bind flow most applications use.

## Checking for Size Limit Issues

Applications that search large directories may hit size limits:

```bash
# Search returning size limit error (error code 4)
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -z 0 \
  -b "dc=example,dc=com" \
  "(objectClass=posixAccount)" dn

# -z 0 means unlimited results
```

To raise the server-side limit:

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// << EOF
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcSizeLimit
olcSizeLimit: 5000
EOF
```

## Quick Diagnostic Checklist

When LDAP authentication breaks, work through this in order:

1. Can you reach the server (`nc -zv ldap.example.com 389`)?
2. Does an anonymous base search work (`ldapsearch -x -H ldap://... -b "" -s base`)?
3. Does the admin bind work (`ldapwhoami -D "cn=admin,..." -W`)?
4. Does the service account bind work?
5. Does a search with the service account return the expected user?
6. Does the user bind work with their own DN and password?

Isolating which step fails tells you exactly where to focus the investigation.
