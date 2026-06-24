# How to Configure Terraform Enterprise LDAP Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, LDAP, Active Directory, Authentication, Security

Description: A practical guide to configuring LDAP authentication for Terraform Enterprise, including Active Directory integration, group mapping, and troubleshooting tips.

---

Many organizations still rely on LDAP-based directories - particularly Active Directory - as their primary identity store. Terraform Enterprise's application login is typically integrated with an identity provider through SAML and, when needed, SCIM provisioning. LDAP authentication is supported for the Replicated installer dashboard and can be configured directly against your directory.

This guide covers configuring the TFE installer dashboard with LDAP and working through the quirks that come with directory integration.

## When to Use LDAP vs SAML/SCIM

LDAP authentication makes sense when:

- Your organization uses Active Directory without a federated identity provider
- You want direct authentication against the directory for the Replicated installer dashboard
- Your TFE instance is on the same network as your LDAP servers
- You need fast, simple integration for installer console access

If you already have Okta, Microsoft Entra ID with SAML or SCIM, or another federated identity provider, those are generally better options for Terraform Enterprise application users since they are the supported path for SSO and automated team membership management.

## Prerequisites

- Terraform Enterprise with access to the Replicated installer dashboard
- LDAP server (Active Directory, OpenLDAP, etc.) reachable from TFE
- A service account for LDAP bind operations
- Knowledge of your directory structure (base DN, user search DN, etc.)
- LDAPS (LDAP over TLS) or StartTLS is strongly recommended

## Understanding TFE's LDAP Configuration

TFE needs several pieces of information to connect to your directory:

- **Host and port**: Where to find the LDAP server
- **Bind credentials**: A service account to search the directory
- **Base DN**: The root of the LDAP tree to search
- **User search DN**: Where to look for user accounts under the base DN
- **User query and username field**: Which LDAP attributes identify users

## Step 1: Prepare Your LDAP Environment

### Create a Service Account

```powershell
# For Active Directory, create a service account using PowerShell

New-ADUser -Name "TFE Service Account" `
  -SamAccountName "svc-tfe-ldap" `
  -UserPrincipalName "svc-tfe-ldap@corp.example.com" `
  -Path "OU=Service Accounts,DC=corp,DC=example,DC=com" `
  -AccountPassword (ConvertTo-SecureString "StrongPassword123!" -AsPlainText -Force) `
  -Enabled $true `
  -PasswordNeverExpires $true
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

Navigate to `https://<TFE_HOSTNAME>:8800`, open the gear icon, select **Console Settings**, then change the console security settings to **LDAP**.

```text
LDAP Configuration:
  Server Type:        Active Directory
  Hostname:           ldaps://dc01.corp.example.com:636

  Search Username:    svc-tfe-ldap@corp.example.com
  Search Password:    StrongPassword123!

  LDAP Schema:
    Base DN:          DC=corp,DC=example,DC=com
    User Search DN:   OU=Users
    User Query:       (sAMAccountName={{username}})
    Username Field:   sAMAccountName
```

### Via Automated Installation

```json
{
  "DaemonAuthenticationType": "ldap",
  "ImportSettingsFrom": "/etc/ptfe-settings.json",
  "LicenseFileLocation": "/tmp/license.rli",
  "TlsBootstrapType": "server-path",
  "TlsBootstrapHostname": "tfe.example.com",
  "TlsBootstrapCert": "/etc/server.crt",
  "TlsBootstrapKey": "/etc/server.key"
}
```

Then define the LDAP settings in the file referenced by `ImportSettingsFrom`, typically `/etc/ptfe-settings.json`:

```json
{
  "ldap_hostname": { "value": "dc01.corp.example.com" },
  "ldap_port": { "value": "636" },
  "ldap_encryption": { "value": "ldap_encryption_ldaps" },
  "ldap_search_user": { "value": "svc-tfe-ldap@corp.example.com" },
  "ldap_search_password": { "value": "StrongPassword123!" },
  "ldap_schema": { "value": "" },
  "ldap_base_dn": { "value": "DC=corp,DC=example,DC=com" },
  "ldap_usersearch_dn": { "value": "OU=Users" },
  "ldap_advanced_search": { "value": "1" },
  "ldap_user_query": { "value": "(sAMAccountName={{username}})" },
  "ldap_username_field": { "value": "sAMAccountName" }
}
```

### Export Existing Settings

```bash
# Export current Replicated app settings, including hidden values
replicatedctl app-config export --hidden
```

## Step 3: OpenLDAP-Specific Configuration

OpenLDAP has different attribute names and object classes:

```json
{
  "ldap_hostname": { "value": "ldap.example.com" },
  "ldap_port": { "value": "636" },
  "ldap_encryption": { "value": "ldap_encryption_ldaps" },
  "ldap_search_user": { "value": "cn=svc-tfe,ou=service-accounts,dc=example,dc=com" },
  "ldap_search_password": { "value": "StrongPassword123!" },
  "ldap_schema": { "value": "" },
  "ldap_base_dn": { "value": "dc=example,dc=com" },
  "ldap_usersearch_dn": { "value": "ou=people" },
  "ldap_advanced_search": { "value": "1" },
  "ldap_user_query": { "value": "(uid={{username}})" },
  "ldap_username_field": { "value": "uid" }
}
```

## Step 4: Limit Access with LDAP Groups

Create LDAP groups that correspond to the users allowed to access the installer dashboard:

```powershell
# Create an AD group for TFE installer dashboard access
New-ADGroup -Name "TFE-Installer-Admins" `
  -GroupCategory Security `
  -GroupScope Global `
  -Path "OU=Groups,DC=corp,DC=example,DC=com"

# Add users to the appropriate group
Add-ADGroupMember -Identity "TFE-Installer-Admins" -Members "jdoe","asmith"
```

Then configure a restricted group query in TFE:

```json
{
  "ldap_restricted_user_group": { "value": "TFE-Installer-Admins" },
  "ldap_restricted_group_query": { "value": "(&(cn=TFE-Installer-Admins)(member={{userdn}}))" }
}
```

For Terraform Enterprise application team membership, use SAML team membership mapping or SCIM group mapping rather than LDAP.

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

**"User not found"**: The user search DN or user query is wrong. Start with a broad base DN (the domain root) and narrow down after confirming searches work.

**"TLS certificate verification failed"**: TFE does not trust the LDAP server's certificate. Add the CA certificate to the installer CA bundle for Replicated installations, or use `TFE_TLS_CA_BUNDLE_FILE` for current Docker, Kubernetes, or Nomad deployments.

**Group restriction not reflected**: Check whether your directory uses `member`, `uniqueMember`, or `memberUid` for group membership. Active Directory commonly uses `member`, while OpenLDAP group membership depends on the group object class.

**Nested groups not working**: LDAP group checks are query-based. If your Active Directory groups are nested (group A is a member of group B), you may need to use Active Directory's `LDAP_MATCHING_RULE_IN_CHAIN` filter:

```text
(member:1.2.840.113556.1.4.1941:={{userdn}})
```

## Security Considerations

1. **Always use LDAPS** (port 636) or StartTLS (port 389 with upgrade). Never send credentials over unencrypted LDAP.
2. **Restrict the service account**: The bind account only needs read access to user and group objects. Do not use a domain admin account.
3. **Use a dedicated OU**: Search only the OUs where TFE installer dashboard users exist, not the entire directory.
4. **Monitor bind failures**: Track authentication failures in both TFE logs and your directory server logs for suspicious activity.

## Summary

LDAP authentication connects the Terraform Enterprise installer dashboard directly to your existing directory infrastructure. The configuration requires knowing your directory's structure - base DNs, user search DNs, attribute names, and object classes. Active Directory and OpenLDAP have different conventions, so match your configuration to your directory type. Test connectivity and search queries with `ldapsearch` before configuring TFE, and always use encrypted connections. For Terraform Enterprise application users and team membership, use SAML and SCIM rather than LDAP.
