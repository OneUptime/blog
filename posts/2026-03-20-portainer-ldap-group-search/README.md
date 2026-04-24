# How to Configure LDAP Group Search in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Group, Authentication, Team, RBAC

Description: Configure LDAP group search in Portainer to automatically map directory groups to Portainer teams for role-based access control.

## Introduction

LDAP group search enables Portainer to automatically place users into existing teams based on LDAP/AD group membership. When configured, users logging in via LDAP are automatically added to corresponding Portainer teams, eliminating manual team membership management. This guide covers configuring group search for both OpenLDAP and Active Directory.

## How Group Search Works

1. User logs in with LDAP credentials
2. Portainer authenticates the user against the LDAP server
3. Portainer searches for groups containing the user DN
4. Portainer matches found group `cn` values to existing Portainer team names
5. User is added to matching teams automatically

## Configuring Group Search via UI

In Portainer → Settings → Authentication → LDAP for OpenLDAP, or Portainer → Settings → Authentication → Microsoft Active Directory for AD:

### For OpenLDAP (groupOfNames)

```text
Group Base DN:            ou=groups,dc=example,dc=com
Group Membership Attr:    member
Group Filter:             (objectClass=groupOfNames)
```

### For OpenLDAP (posixGroup)

```text
Group Base DN:            ou=groups,dc=example,dc=com
Group Membership Attr:    memberUid
Group Filter:             (objectClass=posixGroup)
```

Note: `memberUid` contains plain usernames, while `member` contains full DNs. Portainer can display matches for `posixGroup`/`memberUid`, but automatic Portainer team assignment requires DN-based membership. Use `groupOfNames` with `member` if you want users to be added to teams automatically.

### For Active Directory

```text
Group Search Path:        ou=groups
Group Base DN:            ou=groups,dc=corp,dc=example,dc=com
Groups:                   Folder Name = devops
Group Filter:             (&(objectClass=group)(|(cn=devops)))
```

For AD, `memberOf` is useful for checking a user's memberships, but Portainer team sync searches group objects and matches by group `cn`. Do not use `memberOf` as the group membership attribute for team sync.

## Configuring Group Search via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "URL": "ldap.example.com:389",
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

For Active Directory, set `UserNameAttribute` to `sAMAccountName`, keep `GroupAttribute` as `member`, and use `(objectClass=group)` as the group filter.

## Mapping LDAP Groups to Portainer Teams

For group-to-team mapping to work, you must:

1. **Create teams in Portainer** with names matching the LDAP group CNs
2. **Enable group search** in the LDAP configuration

For example, if you have:
- LDAP group: `cn=devops,ou=groups,dc=example,dc=com`
- Create Portainer team named: `devops`

When Alice (member of `devops` group) logs in, Portainer adds her to the `devops` team automatically.

### Case Sensitivity

Portainer matches team names against the LDAP group's `cn` value case-insensitively. The text should still match, but `DevOps` and `devops` are treated the same. Check your LDAP group CNs:

```bash
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=groups,dc=example,dc=com" \
  "(objectClass=groupOfNames)" cn \
  | grep "^cn:"
```

## Testing Group Search

```bash
# Verify a user's group membership

ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=groups,dc=example,dc=com" \
  "(member=uid=alice,ou=users,dc=example,dc=com)" cn

# For AD - find groups via memberOf on user object
ldapsearch -x \
  -H ldap://ad.corp.example.com:389 \
  -D "portainer-bind@corp.example.com" \
  -w bindpassword \
  -b "ou=users,dc=corp,dc=example,dc=com" \
  "(sAMAccountName=alice)" memberOf
```

## Automatic Team Membership

Portainer synchronizes users into matching existing teams based on LDAP group membership. It does not automatically create Portainer teams from LDAP groups, so create the teams in Portainer first and then let group search place users into them at login.

## Conclusion

LDAP group search is the feature that makes group-based access control in Portainer automatic and scalable. Once configured, user-to-team assignments happen at login without any manual intervention. The key is naming your Portainer teams to match the LDAP group's `cn` value, using DN-based group membership for team sync, and ensuring the bind account has read access to both user and group entries.
