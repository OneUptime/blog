# How to Configure LDAP Authentication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Authentication, Security, Enterprise

Description: Configure LDAP authentication in Portainer to allow users to log in with their corporate directory credentials.

## Introduction

LDAP (Lightweight Directory Access Protocol) integration allows Portainer to authenticate users against your existing corporate directory (Active Directory, OpenLDAP, FreeIPA, etc.). Users log in with their existing credentials, and if automatic user provisioning is enabled, Portainer creates local accounts on first successful authentication. This guide covers the full LDAP configuration in Portainer.

## Prerequisites

- Portainer running and accessible
- LDAP server accessible from the Portainer server
- LDAP service account credentials with read access to user and group entries
- Knowledge of your LDAP directory structure (base DN, user object class, etc.)

## Step 1: Access Authentication Settings

1. Log in as administrator
2. Go to **Settings** → **Authentication**
3. Select **LDAP** as the authentication method

## Step 2: Configure the LDAP Server Connection

### Basic LDAP (Port 389)

```text
LDAP Server: ldap.example.com:389
Anonymous Bind: Off (use a service account)
Service Account DN: cn=portainer-bind,ou=service-accounts,dc=example,dc=com
Service Account Password: [service account password]
```

### Secure LDAP (LDAPS, Port 636)

```sql
LDAP Server: ldap.example.com:636
Use TLS: On
Skip verification of server certificate: Off (recommended; turn On only if you intentionally skip verification)
TLS CA Certificate: [upload CA certificate]
```

## Step 3: Configure User Search Settings

```text
User Base DN: ou=users,dc=example,dc=com
Username Attribute: uid
User Filter: (objectClass=inetOrgPerson)
```

For Active Directory:
```text
User Base DN: ou=users,dc=corp,dc=example,dc=com
Username Attribute: sAMAccountName
User Filter: (objectClass=person)
```

## Step 4: Configure Group Search (Optional)

```text
Group Base DN: ou=groups,dc=example,dc=com
Group Membership Attribute: member
Group Filter: (objectClass=groupOfNames)
```

## Step 5: Configure via API

For infrastructure-as-code deployments:

```bash
# Get admin token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure LDAP settings
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "URLs": [
        "ldap.example.com:389"
      ],
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,ou=service-accounts,dc=example,dc=com",
      "Password": "serviceaccountpassword",
      "StartTLS": false,
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "SearchSettings": [
        {
          "BaseDN": "ou=users,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        }
      ],
      "GroupSearchSettings": [
        {
          "GroupBaseDN": "ou=groups,dc=example,dc=com",
          "GroupAttribute": "member",
          "GroupFilter": "(objectClass=groupOfNames)"
        }
      ],
      "AutoCreateUsers": true
    }
  }'
```

## Step 6: Test the LDAP Configuration

After saving, use the built-in test features:

1. Click **Test connectivity** to validate the LDAP server connection
2. In the **Test login** section, enter a test username and password
3. Click **Test** - Portainer will attempt to authenticate the supplied user

Via API:

```bash
# Test LDAP login
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/ldap/test \
  -d '{
    "Username": "testuser",
    "Password": "testpassword",
    "LDAPSettings": {
      "URLs": [
        "ldap.example.com:389"
      ],
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,ou=service-accounts,dc=example,dc=com",
      "Password": "serviceaccountpassword",
      "StartTLS": false,
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "SearchSettings": [
        {
          "BaseDN": "ou=users,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        }
      ]
    }
  }'
```

## Step 7: Auto-Create Users Setting

Enable automatic user creation on first LDAP login:

In the LDAP settings:
```sql
Automatic user provisioning: Enabled
```

When a user logs in for the first time via LDAP:
1. Portainer verifies credentials against LDAP
2. Creates a local user account in Portainer's database
3. If group search is configured and LDAP group names match Portainer team names, assigns them to those teams
4. Logs them in

## Directory Structure Example

For an OpenLDAP directory:

```ldif
# Service account
dn: cn=portainer-bind,ou=service-accounts,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: portainer-bind
userPassword: serviceaccountpassword
description: Portainer LDAP bind account

# User example
dn: uid=john.doe,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
uid: john.doe
cn: John Doe
sn: Doe
userPassword: userpassword
mail: john.doe@example.com
```

## Conclusion

LDAP integration brings Portainer into your existing identity management infrastructure. Users sign in with their corporate directory credentials, and you manage access centrally in your directory. Combined with group-based team mapping (covered in the companion guide), LDAP provides a more automated user lifecycle for Portainer access.
