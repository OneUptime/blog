# How to Integrate NeuVector with LDAP/AD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, LDAP, Active Directory, Authentication, Kubernetes

Description: Configure NeuVector to authenticate users against LDAP or Active Directory for centralized identity management and single sign-on.

## Introduction

Integrating NeuVector with LDAP (Lightweight Directory Access Protocol) or Microsoft Active Directory enables centralized user authentication and group-based role assignment. This eliminates the need for separate NeuVector-specific passwords and allows your security team to use their corporate credentials.

## Prerequisites

- NeuVector installed and running
- LDAP/AD server accessible from the NeuVector controller
- LDAP bind account with read access to user and group objects
- NeuVector Admin access

## Step 1: Gather LDAP Information

Before configuring NeuVector, collect these details from your LDAP/AD administrator:

```text
Server:                ldap.company.com or ad.company.com
Port:                  389 (LDAP) or 636 (LDAPS)
Base DN:               DC=company,DC=com
Bind DN:               CN=neuvector-bind,OU=Service Accounts,DC=company,DC=com
Bind Password:         (service account password)
Username Attribute:    sAMAccountName for AD
                       uid for OpenLDAP
Group Member Attr:     member for AD
                       memberUid for OpenLDAP
Group DN:              OU=Security Groups,DC=company,DC=com
```

## Step 2: Configure LDAP in NeuVector

Create an LDAP server entry. The default server name is `ldap1`:

```bash
# Configure LDAP/AD integration

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/server" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "server": {
      "server_name": "ldap1",
      "server_type": "ldap",
      "ldap": {
        "directory": "MicrosoftAD",
        "hostname": "ad.company.com",
        "port": 636,
        "ssl": true,
        "base_dn": "DC=company,DC=com",
        "bind_dn": "CN=neuvector-bind,OU=Service Accounts,DC=company,DC=com",
        "bind_password": "ServiceAccountPassword123!",
        "username_attr": "sAMAccountName",
        "group_member_attr": "member",
        "enable": true,
        "default_role": ""
      }
    }
  }'
```

For OpenLDAP:

```bash
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/server" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "server": {
      "server_name": "ldap1",
      "server_type": "ldap",
      "ldap": {
        "directory": "OpenLDAP",
        "hostname": "ldap.company.com",
        "port": 389,
        "ssl": false,
        "base_dn": "DC=company,DC=com",
        "bind_dn": "CN=neuvector,OU=Service Accounts,DC=company,DC=com",
        "bind_password": "password",
        "username_attr": "uid",
        "group_member_attr": "memberUid",
        "enable": true,
        "default_role": ""
      }
    }
  }'
```

To update an existing LDAP server, PATCH `/v1/server/ldap1` with the same
`ldap` block wrapped under a `config` object that also includes the
server `name`.

## Step 3: Configure LDAP via the UI

1. Go to **Settings** > **LDAP/AD**
2. Toggle **Enable** to **On**
3. Fill in the form:

```text
Directory Type: Microsoft AD / OpenLDAP
Hostname: ad.company.com
Port: 636
SSL: Enabled
Base DN: DC=company,DC=com
Bind DN: CN=neuvector-bind,OU=Service Accounts,DC=company,DC=com
Bind Password: ****
Username Attribute: sAMAccountName
```

4. Click **Test Connection** to verify
5. Click **Save**

## Step 4: Map LDAP Groups to NeuVector Roles

Configure group-to-role mappings on the LDAP server entry:

```bash
# Map AD security groups to NeuVector roles
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/server/ldap1" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "ldap1",
      "ldap": {
        "group_mapped_roles": [
          {
            "group": "NeuVector-Admins",
            "global_role": "admin",
            "role_domains": {}
          },
          {
            "group": "NeuVector-SecurityTeam",
            "global_role": "reader",
            "role_domains": {}
          },
          {
            "group": "NeuVector-DevTeam",
            "global_role": "",
            "role_domains": {
              "reader": ["development", "staging"]
            }
          }
        ]
      }
    }
  }'
```

The `group` value is matched against the group's common name (CN) as
returned by the LDAP server, not the full DN.

In the UI:
1. Go to **Settings** > **LDAP/AD**
2. Scroll to **Group/Role Mappings**
3. Click **Add**
4. Enter the LDAP group name (CN)
5. Select the NeuVector role to assign

## Step 5: Test LDAP Authentication

Verify LDAP login works correctly:

```bash
# Test LDAP authentication for a specific user
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "password": {
      "username": "jane.smith",
      "password": "her-ldap-password"
    }
  }' | jq '{
    token: .token.token,
    username: .token.username,
    role: .token.role,
    global_permissions: .token.global_permissions
  }'
```

In the UI:
1. Log out of NeuVector
2. Log back in with your LDAP credentials
3. Verify the assigned role matches the expected group mapping

## Step 6: Configure LDAPS (Secure LDAP)

For production, always use encrypted LDAP:

```bash
# Verify the LDAP server's SSL certificate
openssl s_client -connect ad.company.com:636 -showcerts

# If using a self-signed certificate, add it to NeuVector's trust store
# by configuring the CA certificate in the NeuVector config
```

## Step 7: Configure Auth Order

Set the priority for authentication providers:

```bash
# Authenticate with LDAP first, fall back to local accounts
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "auth_order": ["ldap1", "local"]
    }
  }'
```

This means:
1. NeuVector first tries to authenticate against the LDAP server named `ldap1`
2. If LDAP authentication fails, it falls back to the local user database
3. The local `admin` account always works for emergency access

## Step 8: Monitor Authentication Events

```bash
# View authentication events from the event log
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=50" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.events[] | {
    user: .user,
    name: .name,
    msg: .msg,
    host: .host_name,
    timestamp: .reported_timestamp
  }'
```

## Conclusion

LDAP/AD integration centralizes NeuVector authentication within your existing identity management infrastructure. By mapping LDAP groups to NeuVector roles, you automatically inherit your organization's existing access control structure - when an employee is added to or removed from an AD group, their NeuVector access updates automatically. Always keep the local admin account as an emergency fallback during LDAP outages.
