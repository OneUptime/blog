# How to Test LDAP Login Configuration in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Testing, Troubleshooting, Authentication

Description: Use Portainer's built-in LDAP test feature and CLI tools to verify your LDAP configuration before enabling it for all users.

## Introduction

Before switching all users to LDAP authentication, you should thoroughly test the configuration with known credentials. Portainer provides a built-in LDAP test button, and you can supplement it with CLI tools for deeper diagnosis. This guide covers all testing approaches.

## Step 1: Use Portainer's Built-in LDAP Tests

In Settings → Authentication → LDAP:

1. After entering your LDAP server settings, click **Test connectivity**
2. Scroll to the **Test login** section
3. Enter a test username using the format your Portainer configuration expects
4. Enter the user's password
5. Click **Test**

Portainer's built-in checks can:
- Verify the LDAP server is reachable
- Bind with the service account (or anonymously, if configured)
- Search for the user using the configured Base DN, filter, and username attribute
- Attempt to authenticate as the user
- Return the result (success or specific error)

## Step 2: Test LDAP Connectivity with ldapsearch

Before configuring Portainer, verify the LDAP server is accessible:

```bash
# Test 1: Anonymous connectivity against the root DSE

ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -b "" \
  -s base "(objectClass=*)" \
  supportedLDAPVersion

# Expected: returns root DSE data such as supportedLDAPVersion
# Error: "Can't contact LDAP server" usually means a network or listener issue

# Test 2: Service account bind
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"

# Expected: "result: 0 Success"
# Error: "ldap_bind: Invalid credentials (49)" usually means the bind DN or password is wrong

# Test 3: User search
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" uid cn mail

# Expected: returns user entry
# Error: "No such object" means wrong Base DN
```

## Step 3: Test User Authentication

```bash
# Attempt to bind as the actual user DN (tests the final bind step after Portainer resolves the user's DN)
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "uid=testuser,ou=users,dc=example,dc=com" \
  -w "userpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" uid cn

# If this succeeds and Portainer's user-search settings resolve this same DN, Portainer should be able to authenticate this user
```

## Step 4: Test Group Membership

```bash
# Find groups the test user belongs to
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "ou=groups,dc=example,dc=com" \
  "(member=uid=testuser,ou=users,dc=example,dc=com)" cn

# For AD - list memberOf attribute on the user
ldapsearch -x \
  -H ldaps://ad.corp.example.com:636 \
  -D "portainer-bind@corp.example.com" \
  -w "bindpassword" \
  -b "ou=users,dc=corp,dc=example,dc=com" \
  "(sAMAccountName=testuser)" memberOf
```

## Step 5: API-Based Connectivity Check

For a scriptable connectivity check via Portainer's API:

```bash
API_KEY="your_portainer_api_key"

# Test LDAP connectivity with the same values you plan to configure in the UI
curl -i -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/ldap/check \
  -d '{
    "LDAPSettings": {
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "URL": "ldap.example.com:389",
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "StartTLS": false
    }
  }'

# Expected: HTTP/1.1 204 No Content
```

## Common Test Scenarios

### Scenario 1: Service Account Can Bind but User Search Returns Nothing

```bash
# Diagnose: Check the filter and base DN
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=*)" uid cn | head -40

# If this returns entries, the issue is in the filter
# Try a broader filter:
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" uid cn
# Then narrow it down:
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(&(uid=testuser)(objectClass=inetOrgPerson))" uid cn
```

### Scenario 2: User Found but Authentication Fails

```bash
# Get the exact DN of the user
USER_DN=$(ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" "(uid=testuser)" dn \
  | grep "^dn:" | cut -d" " -f2-)

echo "User DN: $USER_DN"

# Try binding as that exact DN
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "$USER_DN" -w "userpassword" \
  -b "ou=users,dc=example,dc=com" "(uid=testuser)" uid
```

## Conclusion

Systematic testing of your LDAP configuration before enabling it for all users prevents lockouts and surprises. Test connectivity, service account binding, user search, and group search in sequence. Only enable LDAP authentication for all users once the built-in Portainer test passes with multiple real user accounts, including edge cases like users in nested groups or multiple OUs.
