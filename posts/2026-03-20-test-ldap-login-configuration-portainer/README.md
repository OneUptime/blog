# How to Test LDAP Login Configuration in Portainer - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Authentication, Testing, Troubleshooting

Description: Learn how to test and validate your LDAP authentication configuration in Portainer before rolling it out to users.

---

After configuring LDAP authentication in Portainer, testing the configuration before enabling it for all users prevents lockouts and ensures the setup is correct.

## Built-in LDAP Test Feature

Portainer includes a **Test LDAP connectivity** button in the authentication settings:

1. Navigate to **Settings > Authentication**
2. Select **LDAP**
3. Fill in your LDAP configuration
4. Click **Test LDAP connectivity** to verify the reader DN can bind
5. Enter a test username and password, then click **Test login** to verify a user can authenticate

## Test LDAP Configuration via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Test LDAP configuration without saving it

curl -X POST \
  https://localhost:9443/api/ldap/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "LDAPSettings": {
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer,dc=example,dc=com",
      "Password": "ldap-reader-password",
      "URL": "ldap.example.com:636",
      "TLSConfig": {
        "TLS": true,
        "TLSSkipVerify": false
      },
      "SearchSettings": [{
        "BaseDN": "ou=users,dc=example,dc=com",
        "Filter": "(objectClass=inetOrgPerson)",
        "UserNameAttribute": "uid"
      }]
    }
  }' \
  --insecure
```

## Test LDAP Connectivity from the Command Line

Verify basic LDAP connectivity before even configuring Portainer:

```bash
# Test anonymous bind
ldapsearch -H ldap://ldap.example.com:389 \
  -x \
  -b "dc=example,dc=com" \
  "(objectClass=top)" cn 2>&1 | head -20

# Test authenticated bind (reader DN)
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "dc=example,dc=com" \
  "(uid=testuser)" \
  uid cn mail 2>&1

# Test user authentication
ldapwhoami -H ldaps://ldap.example.com:636 \
  -x \
  -D "uid=testuser,ou=users,dc=example,dc=com" \
  -w "userpassword"
```

## Validate the Search Filter

Test your user search filter independently:

```bash
# Verify the search filter returns users as expected
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" \
  uid cn mail memberOf | grep "^uid:\|^cn:\|^dn:"
```

## Test Group Membership Queries

```bash
# Check group membership for a specific user
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "ou=groups,dc=example,dc=com" \
  "(member=uid=testuser,ou=users,dc=example,dc=com)" \
  cn 2>&1

# Check what groups a user belongs to (memberOf attribute)
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" \
  memberOf 2>&1
```

## Common Test Results and Fixes

| Test Result | Likely Cause | Fix |
|-------------|-------------|-----|
| Connection refused | Wrong host/port | Check LDAP server address |
| Invalid credentials | Wrong reader DN/password | Verify bind credentials |
| No results | Wrong base DN or filter | Adjust BaseDN or search filter |
| SSL error | Certificate issue | Enable TLSSkipVerify to test, then fix certs |

---

*Monitor LDAP server availability alongside Portainer with [OneUptime](https://oneuptime.com).*
