# How to Configure Active Directory Authentication in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, LDAP, Authentication, Window, Enterprise

Description: Configure Portainer to authenticate users against Microsoft Active Directory using LDAP with AD-specific settings and service accounts.

## Introduction

Active Directory (AD) is Microsoft's directory service used in most enterprise Windows environments. Portainer Business Edition can connect to AD using its Microsoft Active Directory authentication option. With Simple binding, Portainer queries AD over LDAP, but AD-specific defaults differ from OpenLDAP - different attribute names, username formats, and filter syntax. This guide covers the Simple binding configuration.

## Prerequisites

- Active Directory domain controller accessible from Portainer
- Portainer Business Edition instance with administrator access
- Service account in AD with read access (Domain Users is usually sufficient)
- Domain name and DC server address

## Step 1: Create a Service Account in Active Directory

Create a dedicated low-privilege service account for Portainer:

```powershell
# Run on a Domain Controller or admin workstation

New-ADUser `
  -Name "portainer-svc" `
  -SamAccountName "portainer-svc" `
  -UserPrincipalName "portainer-svc@corp.example.com" `
  -AccountPassword (ConvertTo-SecureString "ServiceP@ssword123" -AsPlainText -Force) `
  -PasswordNeverExpires $true `
  -Enabled $true `
  -Path "OU=Service Accounts,DC=corp,DC=example,DC=com"

# The account needs read access to Users and Groups OUs
# Domain Users group membership is typically sufficient
```

## Step 2: Gather AD Connection Information

```powershell
# On a domain-joined Windows machine, find DC server
nslookup -type=SRV _ldap._tcp.corp.example.com

# Or use:
(Get-ADDomainController -Discover).HostName

# Get Domain DN
(Get-ADDomain).DistinguishedName
# Example: DC=corp,DC=example,DC=com

# Find users OU
Get-ADOrganizationalUnit -Filter * | Select Name,DistinguishedName
```

## Step 3: Configure Portainer Active Directory Authentication

In Settings → Authentication, select Microsoft Active Directory and use Simple binding:

```text
AD Controller:              dc01.corp.example.com:389
                            (or use LDAPS: dc01.corp.example.com:636)
Binding:                    Simple

Service Account:            portainer-svc@corp.example.com
                            (or CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com)
Service Account Password:   ServiceP@ssword123

User Search Configuration:
  Username Format:          username
                            (uses sAMAccountName; use user@domainname for userPrincipalName)
  Root Domain:              DC=corp,DC=example,DC=com
  User Search Path:         optional, e.g. OU=Users,DC=corp,DC=example,DC=com
  User Filter:              (objectClass=user)
                            (Portainer adds memberOf clauses here when you restrict Allowed Groups)

Group Search Configuration:
  Group Search Path:        optional, e.g. OU=Groups,DC=corp,DC=example,DC=com
  Group Base DN:            DC=corp,DC=example,DC=com
  Group Filter:             (objectClass=group)
```

## Step 4: API Configuration for Active Directory

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
      "ServerType": 2,
      "URLs": [
        "dc01.corp.example.com:389"
      ],
      "AnonymousMode": false,
      "ReaderDN": "portainer-svc@corp.example.com",
      "Password": "ServiceP@ssword123",
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "StartTLS": false,
      "SearchSettings": [
        {
          "BaseDN": "DC=corp,DC=example,DC=com",
          "UserNameAttribute": "sAMAccountName",
          "Filter": "(objectClass=user)"
        }
      ],
      "GroupSearchSettings": [
        {
          "GroupBaseDN": "DC=corp,DC=example,DC=com",
          "GroupAttribute": "member",
          "GroupFilter": "(objectClass=group)"
        }
      ],
      "AutoCreateUsers": true
    }
  }'
```

## Key Differences: AD vs OpenLDAP

| Setting | Active Directory | OpenLDAP |
|---------|----------------|---------|
| Username Attribute | `sAMAccountName` or `userPrincipalName` | `uid` |
| User Filter | `(objectClass=user)` | `(objectClass=inetOrgPerson)` |
| Group Filter | `(objectClass=group)` | `(objectClass=groupOfNames)` |
| Group Membership | `member` on group object (`memberOf` is commonly used in AD user filters) | `member` on group object |
| Bind Account Format | `user@domain.com` or CN=... | `cn=user,dc=...` |
| Disabled Accounts | Filter with `userAccountControl` | No standard method |

## Filtering Out Disabled Accounts

```text
User Filter: (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

The `userAccountControl` bitmask filter excludes disabled AD accounts.

## Testing AD Connectivity

```bash
# Test from Linux with ldapsearch
ldapsearch -x \
  -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" \
  -w "ServiceP@ssword123" \
  -b "DC=corp,DC=example,DC=com" \
  "(sAMAccountName=alice)" sAMAccountName displayName mail memberOf
```

## Conclusion

Active Directory authentication in Portainer Business Edition uses the Microsoft Active Directory authentication option and, with Simple binding, requires AD-specific defaults. The key differences are using `sAMAccountName` (or `userPrincipalName`) for the username format, `(objectClass=user)` as the base user filter, and using the `member` attribute on group objects for Portainer group synchronization. If you restrict logins to specific AD groups, Portainer adds `memberOf` clauses to the user filter. Once configured correctly, AD authentication works identically to OpenLDAP from the user's perspective.
