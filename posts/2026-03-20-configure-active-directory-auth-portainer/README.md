# How to Configure Active Directory Authentication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, LDAP, Authentication, Window

Description: Configure Portainer to authenticate users against Microsoft Active Directory using LDAP with the proper AD-specific settings.

---

Active Directory uses LDAP under the hood, but requires AD-specific configuration such as the `sAMAccountName` attribute, proper DN formats, and LDAPS for secure communication.

## Prerequisites

- Portainer Business Edition
- Active Directory Domain Services running
- A service account in AD for Portainer to perform searches
- LDAPS enabled on your AD domain controllers (or use port 389 with StartTLS)

## Step 1: Create an AD Service Account for Portainer

In Active Directory, create a dedicated read-only service account:

```powershell
# Run in PowerShell on a domain controller or RSAT system

New-ADUser `
  -Name "portainer-svc" `
  -UserPrincipalName "portainer-svc@corp.example.com" `
  -SamAccountName "portainer-svc" `
  -Path "OU=Service Accounts,DC=corp,DC=example,DC=com" `
  -AccountPassword (ConvertTo-SecureString "StrongPassword123!" -AsPlainText -Force) `
  -PasswordNeverExpires $true `
  -CannotChangePassword $true `
  -Enabled $true `
  -Description "Portainer LDAP Service Account"

# Ensure the service account has read access to the search base(s) Portainer will query
# Portainer only needs read (list and search) permissions
```

## Step 2: Configure AD Authentication in Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure AD/LDAP authentication
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "ServerType": 2,
      "AnonymousMode": false,
      "ReaderDN": "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com",
      "Password": "StrongPassword123!",
      "URLs": ["dc01.corp.example.com:636"],
      "TLSConfig": {
        "TLS": true,
        "TLSSkipVerify": false
      },
      "SearchSettings": [{
        "BaseDN": "DC=corp,DC=example,DC=com",
        "Filter": "(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
        "UserNameAttribute": "sAMAccountName"
      }],
      "AutoCreateUsers": true
    }
  }' \
  --insecure
```

## Key AD-Specific Settings

| Setting | AD Value | Notes |
|---------|----------|-------|
| UserNameAttribute | `sAMAccountName` | AD login name (no domain) |
| Alternative | `userPrincipalName` | For `user@domain.com` format |
| Object filter | `objectCategory=person` | Filter for user objects |
| Disabled users | `!(userAccountControl:...)` | Exclude disabled accounts |
| Group attribute | `member` | Group membership |

## Step 3: Configure Group Sync with AD Security Groups

```bash
# Add group search settings for AD groups
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "ServerType": 2,
      "ReaderDN": "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com",
      "Password": "StrongPassword123!",
      "URLs": ["dc01.corp.example.com:636"],
      "TLSConfig": {"TLS": true, "TLSSkipVerify": false},
      "SearchSettings": [{
        "BaseDN": "DC=corp,DC=example,DC=com",
        "Filter": "(&(objectClass=user)(objectCategory=person))",
        "UserNameAttribute": "sAMAccountName"
      }],
      "GroupSearchSettings": [{
        "GroupBaseDN": "OU=Portainer Groups,DC=corp,DC=example,DC=com",
        "GroupFilter": "(objectClass=group)",
        "GroupAttribute": "member"
      }]
    }
  }' \
  --insecure
```

## Verify AD Authentication

```bash
# Test AD LDAP bind from command line
ldapsearch -H ldaps://dc01.corp.example.com:636 \
  -x \
  -D "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com" \
  -w "StrongPassword123!" \
  -b "DC=corp,DC=example,DC=com" \
  "(&(objectClass=user)(sAMAccountName=jsmith))" \
  sAMAccountName displayName memberOf
```

---

*Monitor your AD-integrated Portainer deployment with [OneUptime](https://oneuptime.com).*
