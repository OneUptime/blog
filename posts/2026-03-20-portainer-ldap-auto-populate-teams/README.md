# How to Auto-Populate Teams from LDAP Groups in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Team, Automation, Business Edition, RBAC

Description: Configure Portainer Business Edition to automatically create and populate teams based on LDAP group membership at user login.

## Introduction

Manually creating Portainer teams and mapping them to LDAP groups works but doesn't scale. Portainer Business Edition can synchronize LDAP group membership with Portainer teams. When group search is configured, Portainer adds users to existing identically named teams automatically at login. This reduces manual team membership management.

## Prerequisites

- Portainer Business Edition
- LDAP authentication configured and working
- LDAP group search configured
- Admin access to Portainer

## How Auto-Population Works

With LDAP group search configured:

1. User logs in with LDAP credentials
2. Portainer authenticates the user
3. Portainer queries LDAP for the user's group memberships
4. For each LDAP group:
   - If a matching Portainer team exists: user is added to it
   - If no matching team exists: no team membership is created automatically

This provides automatic team membership synchronization, but the Portainer teams still need to exist in Portainer.

## Step 1: Enable Group Search

First, ensure group search is configured:

```text
Group Base DN:              ou=groups,dc=example,dc=com
Group Membership Attribute: member
Group Filter:               (objectClass=groupOfNames)
```

## Step 2: Match Portainer Teams to LDAP Groups

In Settings → Authentication → LDAP:

1. Configure and save the LDAP group search settings
2. Create the Portainer teams you want to sync
3. Make sure the Portainer team names exactly match the LDAP group names

## Step 3: Configure via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

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
      "ServerType": 1,
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "StartTLS": false,
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

## LDAP Group Structure Example

```ldif
# DevOps team group

dn: cn=devops,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: devops
member: uid=alice,ou=users,dc=example,dc=com
member: uid=bob,ou=users,dc=example,dc=com

# QA team group
dn: cn=qa-team,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: qa-team
member: uid=charlie,ou=users,dc=example,dc=com
member: uid=diana,ou=users,dc=example,dc=com

# Admin group - maps to Portainer admins
dn: cn=portainer-admins,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: portainer-admins
member: uid=admin-user,ou=users,dc=example,dc=com
```

After configuration, when Alice logs in, Portainer:
1. Adds Alice to the existing `devops` team
2. Grants Alice access to environments assigned to `devops`

## Assigning Environment Access to LDAP-Synchronized Teams

Matching teams don't have environment access by default. You must assign it:

1. Go to **Environments** → click the environment
2. Click **Manage access**
3. Add the team (e.g., `devops`) with the appropriate role

Or via API:
```bash
ENDPOINT_ID=1
TEAM_NAME=devops

TEAM_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams \
  | python3 -c "import sys,json; teams=json.load(sys.stdin); name='${TEAM_NAME}'.lower(); print(next(t['Id'] for t in teams if t['Name'].lower()==name))")

ROLE_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/roles \
  | python3 -c "import sys,json; roles=json.load(sys.stdin); print(next(r['Id'] for r in roles if r['Name'].lower()=='standard user'))")

PAYLOAD=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); policies=data.get('TeamAccessPolicies') or {}; policies['${TEAM_ID}']={'RoleId': ${ROLE_ID}}; print(json.dumps({'TeamAccessPolicies': policies}))")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  -d "$PAYLOAD"
```

## Auto-Admin Assignment from LDAP

To automatically make members of a specific LDAP group Portainer administrators:

1. Create or choose an LDAP group for Portainer administrators, for example `portainer-admins`
2. In Portainer LDAP settings, configure the admin group search
3. Click **Fetch Admin Group(s)** and select the group
4. Enable **Assign admin rights to group(s)**

Members of the selected group get admin privileges automatically at login.

## Conclusion

Automatic team population from LDAP groups is a useful feature of Portainer Business Edition that reduces manual membership management. Users' Portainer team membership can reflect their directory group membership at login for matching existing teams. The remaining manual steps are creating the Portainer teams and assigning environment access to them.
