# How to Configure Terraform Enterprise LDAP Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, LDAP, Active Directory, Authentication, Security

Description: A practical guide to configuring LDAP authentication for Terraform Enterprise, including Active Directory integration, group mapping, and troubleshooting tips.

---

Many organizations still rely on LDAP-based directories - particularly Active Directory - as their primary identity store. Terraform Enterprise supports LDAP authentication natively, letting users sign in with their existing directory credentials without needing a separate SAML or OIDC identity provider in between.

This guide covers configuring TFE with LDAP, mapping LDAP groups to TFE teams, and working through the quirks that come with directory integration.

## When to Use LDAP vs SAML/OIDC

LDAP authentication makes sense when:

- Your organization uses Active Directory without a federated identity provider
- You want direct authentication against the directory without an intermediary
- Your TFE instance is on the same network as your LDAP servers
- You need fast, simple integration without configuring a separate IdP application

If you already have Okta, Azure AD with OIDC, or another federated identity provider, those are generally better options since they add an abstraction layer that simplifies management.

## Prerequisites

- Terraform Enterprise with site admin access
- LDAP server (Active Directory, OpenLDAP, etc.) reachable from TFE
- A service account for LDAP bind operations
- Knowledge of your directory structure (base DN, group DN, etc.)
- LDAPS (LDAP over TLS) is strongly recommended

## Understanding TFE's LDAP Configuration

TFE needs several pieces of information to connect to your directory:

- **Host and port**: Where to find the LDAP server
- **Bind credentials**: A service account to search the directory
- **User search base**: Where to look for user accounts
- **Group search base**: Where to look for groups
- **Attribute mappings**: Which LDAP attributes map to TFE fields

## Step 1: Prepare Your LDAP Environment

### Create a Service Account

```bash
# For Active Directory, create a service account using PowerShell
New-ADUser -Name "TFE Service Account" \
  -SamAccountName "svc-tfe-ldap" \
  -UserPrincipalName "svc-tfe-ldap@corp.example.com" \
  -Path "OU=Service Accounts,DC=corp,DC=example,DC=com" \
  -AccountPassword (ConvertTo-SecureString "StrongPassword123!" -AsPlainText -Force) \
  -Enabled $true \
  -PasswordNeverExpires $true \
  -CannotChangePassword $true
```

For OpenLDAP:

```ldif
# svc-tfe.ldif - Service account for TFE LDAP binding
dn: cn=svc-tfe,ou=service-accounts,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
cn: svc-tfe
sn: TFE Service
uid: svc-tfe
userPassword: StrongPassword123!
description: Service account for Terraform Enterprise LDAP authentication
```

```bash
# Add the service account to OpenLDAP
ldapadd -x -H ldaps://ldap.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -w admin-password \
  -f svc-tfe.ldif
```

### Verify Directory Structure

Before configuring TFE, test that your LDAP queries work:

```bash
# Test searching for users in Active Directory
ldapsearch -x -H ldaps://dc01.corp.example.com:636 \
  -D "svc-tfe-ldap@corp.example.com" \
  -w "StrongPassword123!" \
  -b "OU=Users,DC=corp,DC=example,DC=com" \
  "(sAMAccountName=jdoe)" \
  dn sAMAccountName mail memberOf

# Test searching for groups
ldapsearch -x -H ldaps://dc01.corp.example.com:636 \
  -D "svc-tfe-ldap@corp.example.com" \
  -w "StrongPassword123!" \
  -b "OU=Groups,DC=corp,DC=example,DC=com" \
  "(cn=TFE-*)" \
  dn cn member
```

## Step 2: Configure LDAP in Terraform Enterprise

### Via the Admin UI

Navigate to **Admin** > **LDAP** in the TFE interface.

```text
LDAP Configuration:
  Hostname:            dc01.corp.example.com
  Port:                636
  Method:              SSL (LDAPS)

  Bind DN:             svc-tfe-ldap@corp.example.com
  Bind Password:       StrongPassword123!

  User Search:
    Base DN:           OU=Users,DC=corp,DC=example,DC=com
    Username Attribute: sAMAccountName
    Email Attribute:    mail
    Name Attribute:     displayName
    User Filter:        (objectClass=person)

  Group Search:
    Base DN:           OU=Groups,DC=corp,DC=example,DC=com
    Group Name Attr:   cn
    Group Member Attr: member
    Group Object Class: group
    Group Filter:      (objectClass=group)
```

### Via API

```bash
# Configure LDAP settings via the TFE Admin API
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PUT \
  https://tfe.example.com/api/v2/admin/ldap-settings \
  --data '{
    "data": {
      "type": "ldap-settings",
      "attributes": {
        "enabled": true,
        "host": "dc01.corp.example.com",
        "port": 636,
        "method": "ssl",
        "bind-dn": "svc-tfe-ldap@corp.example.com",
        "bind-password": "StrongPassword123!",
        "base-dn": "DC=corp,DC=example,DC=com",
        "user-search-base": "OU=Users",
        "user-search-filter": "(objectClass=person)",
        "username-attribute": "sAMAccountName",
        "email-attribute": "mail",
        "name-attribute": "displayName",
        "group-search-base": "OU=Groups",
        "group-name-attribute": "cn",
        "group-member-attribute": "member",
        "group-object-class": "group",
        "group-search-filter": "(objectClass=group)",
        "site-admin-group": "TFE-SiteAdmins"
      }
    }
  }'
```

### Via Environment Variables

```bash
# LDAP configuration for Docker-based TFE deployment
TFE_LDAP_ENABLED=true
TFE_LDAP_HOST=dc01.corp.example.com
TFE_LDAP_PORT=636
TFE_LDAP_METHOD=ssl
TFE_LDAP_BIND_DN="svc-tfe-ldap@corp.example.com"
TFE_LDAP_BIND_PASSWORD="StrongPassword123!"
TFE_LDAP_BASE_DN="DC=corp,DC=example,DC=com"
TFE_LDAP_USER_SEARCH_BASE="OU=Users"
TFE_LDAP_USER_SEARCH_FILTER="(objectClass=person)"
TFE_LDAP_USERNAME_ATTRIBUTE=sAMAccountName
TFE_LDAP_EMAIL_ATTRIBUTE=mail
TFE_LDAP_NAME_ATTRIBUTE=displayName
TFE_LDAP_GROUP_SEARCH_BASE="OU=Groups"
TFE_LDAP_GROUP_NAME_ATTRIBUTE=cn
TFE_LDAP_GROUP_MEMBER_ATTRIBUTE=member
TFE_LDAP_GROUP_OBJECT_CLASS=group
```

## Step 3: OpenLDAP-Specific Configuration

OpenLDAP has different attribute names and object classes:

```bash
# OpenLDAP configuration differences
TFE_LDAP_HOST=ldap.example.com
TFE_LDAP_PORT=636
TFE_LDAP_METHOD=ssl
TFE_LDAP_BIND_DN="cn=svc-tfe,ou=service-accounts,dc=example,dc=com"
TFE_LDAP_BIND_PASSWORD="StrongPassword123!"
TFE_LDAP_BASE_DN="dc=example,dc=com"
TFE_LDAP_USER_SEARCH_BASE="ou=people"
TFE_LDAP_USER_SEARCH_FILTER="(objectClass=inetOrgPerson)"
TFE_LDAP_USERNAME_ATTRIBUTE=uid
TFE_LDAP_EMAIL_ATTRIBUTE=mail
TFE_LDAP_NAME_ATTRIBUTE=cn
TFE_LDAP_GROUP_SEARCH_BASE="ou=groups"
TFE_LDAP_GROUP_NAME_ATTRIBUTE=cn
TFE_LDAP_GROUP_MEMBER_ATTRIBUTE=uniqueMember
TFE_LDAP_GROUP_OBJECT_CLASS=groupOfUniqueNames
```

## Step 4: Team Mapping with LDAP Groups

Create LDAP groups that correspond to TFE teams:

```bash
# Create AD groups for TFE access
New-ADGroup -Name "TFE-Admins" \
  -GroupCategory Security \
  -GroupScope Global \
  -Path "OU=Groups,DC=corp,DC=example,DC=com"

New-ADGroup -Name "TFE-Developers" \
  -GroupCategory Security \
  -GroupScope Global \
  -Path "OU=Groups,DC=corp,DC=example,DC=com"

New-ADGroup -Name "TFE-Viewers" \
  -GroupCategory Security \
  -GroupScope Global \
  -Path "OU=Groups,DC=corp,DC=example,DC=com"

# Add users to the appropriate groups
Add-ADGroupMember -Identity "TFE-Developers" -Members "jdoe","asmith"
```

In TFE, create teams that match these group names:

```bash
# Create a TFE team mapped to the LDAP group
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/organizations/my-org/teams" \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "TFE-Developers",
        "organization-access": {
          "manage-workspaces": true,
          "manage-policies": false
        }
      }
    }
  }'
```

## Troubleshooting LDAP Issues

### Testing Connectivity

```bash
# Test TCP connectivity to the LDAP server
nc -zv dc01.corp.example.com 636

# Test the TLS connection
openssl s_client -connect dc01.corp.example.com:636 -showcerts

# Test a simple bind
ldapwhoami -x -H ldaps://dc01.corp.example.com:636 \
  -D "svc-tfe-ldap@corp.example.com" \
  -w "StrongPassword123!"
```

### Common Problems

**"LDAP bind failed"**: Wrong bind DN or password. For Active Directory, the bind DN can be in UPN format (user@domain.com) or DN format (CN=user,OU=...). Try both.

**"No users found"**: The user search base is wrong. Start with a broad base DN (the domain root) and narrow down after confirming searches work.

**"TLS certificate verification failed"**: TFE does not trust the LDAP server's certificate. Add the CA certificate to TFE's trusted CA bundle using `TFE_TLS_CA_BUNDLE_FILE`.

**Group membership not reflected**: Check whether your directory uses `member`, `uniqueMember`, or `memberOf` for group membership. Active Directory uses `member`, while OpenLDAP commonly uses `uniqueMember`.

**Nested groups not working**: TFE performs a simple group lookup by default. If your groups are nested (group A is a member of group B), you may need to use Active Directory's `LDAP_MATCHING_RULE_IN_CHAIN` filter:

```text
(member:1.2.840.113556.1.4.1941:={user-dn})
```

## Security Considerations

1. **Always use LDAPS** (port 636) or StartTLS (port 389 with upgrade). Never send credentials over unencrypted LDAP.
2. **Restrict the service account**: The bind account only needs read access to user and group objects. Do not use a domain admin account.
3. **Use a dedicated OU**: Search only the OUs where TFE users exist, not the entire directory.
4. **Monitor bind failures**: Track authentication failures in both TFE logs and your directory server logs for suspicious activity.

## Summary

LDAP authentication connects Terraform Enterprise directly to your existing directory infrastructure. The configuration requires knowing your directory's structure - base DNs, attribute names, and object classes. Active Directory and OpenLDAP have different conventions, so match your configuration to your directory type. Test connectivity and search queries with `ldapsearch` before configuring TFE, and always use encrypted connections. Once set up, LDAP gives your users seamless authentication and automatic team assignment based on their directory group memberships.
