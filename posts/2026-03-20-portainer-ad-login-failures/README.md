# How to Troubleshoot Active Directory Login Failures in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, Troubleshooting, Authentication, LDAP

Description: Diagnose and fix Active Directory login failures in Portainer covering credential errors, account lockouts, and AD-specific configuration issues.

## Introduction

AD login failures in Portainer Business Edition have unique characteristics compared to generic LDAP issues. AD has strict password policies, account lockout thresholds, and specific authentication requirements that can cause confusing failures. This guide covers AD-specific troubleshooting scenarios.

## Common AD Authentication Errors

### Error 49 (Invalid Credentials) Subtypes

AD uses LDAP error 49 with additional data codes:

| Data Code | Meaning |
|-----------|---------|
| `525` | User not found |
| `52e` | Invalid credentials |
| `530` | Account not permitted to log on at this time |
| `531` | Account not permitted to log on from this machine |
| `532` | Password expired |
| `533` | Account disabled |
| `534` | Account not permitted to log on |
| `701` | Account expired |
| `773` | User must change password |
| `775` | Account locked out |

Check AD event logs on the domain controller for the specific sub-error code.

## Diagnostic Steps

### Step 1: Check AD Event Logs

On the Domain Controller:
```powershell
# Check for failed authentication events (Event ID 4625)

Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  Id = 4625
  StartTime = (Get-Date).AddHours(-1)
} | Select-Object TimeCreated, Message | Format-List

# Check for successful logins
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  Id = 4624
  StartTime = (Get-Date).AddHours(-1)
} | Where-Object {$_.Message -like "*portainer-svc*"} | Format-List
```

### Step 2: Verify Service Account

```powershell
# Check service account status
Get-ADUser portainer-svc -Properties * | Select-Object `
  SamAccountName, Enabled, LockedOut, PasswordExpired, `
  PasswordLastSet, AccountExpirationDate

# Reset service account password if expired
Set-ADAccountPassword -Identity portainer-svc `
  -NewPassword (ConvertTo-SecureString "NewServiceP@ssword" -AsPlainText -Force)

# Unlock if locked
Unlock-ADAccount -Identity portainer-svc
```

### Step 3: Test Service Account Connectivity from Portainer Host

```bash
# Test LDAP bind with the service account using the same transport Portainer is configured for
ldapsearch -x \
  -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" \
  -w "ServicePassword" \
  -b "DC=corp,DC=example,DC=com" \
  -s base "(objectClass=*)"

# Expected: Result code 0 (Success)
# Error 49: Wrong credentials
# Error 32: Wrong base DN
```

### Step 4: Test User Search

```bash
# Find the user Portainer is trying to authenticate
ldapsearch -x \
  -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" \
  -w "ServicePassword" \
  -b "DC=corp,DC=example,DC=com" \
  "(sAMAccountName=alice)" sAMAccountName displayName userAccountControl

# Check userAccountControl value:
# 512 = Normal active account
# 514 = Disabled account
# 66050 = Password doesn't expire + account enabled
```

### Step 5: Test User Authentication

```bash
# Attempt bind as the user directly using the same transport Portainer is configured for
ldapsearch -x \
  -H ldap://dc01.corp.example.com:389 \
  -D "alice@corp.example.com" \
  -w "AlicePassword" \
  -b "DC=corp,DC=example,DC=com" \
  "(sAMAccountName=alice)" sAMAccountName

# If this fails but credentials are correct, check AD password policies
```

## Portainer-Specific AD Issues

### Issue: Users Can Bind to AD but Can't Log into Portainer

Check that Portainer's configured username format matches what the user is entering:

```bash
# Get the login attributes Portainer may use
ldapsearch -x -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" -w "ServicePass" \
  -b "DC=corp,DC=example,DC=com" \
  "(displayName=Alice Smith)" sAMAccountName userPrincipalName

# If Portainer Username Format is `username`, use the `sAMAccountName`
# If Portainer Username Format is `username@domainname`, use that format (often the UPN)
# Do not use the `displayName`
```

### Issue: Group Membership Not Working

```bash
# Get the user's DN, since Portainer checks group membership using the user's DN
USER_DN=$(ldapsearch -x -LLL -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" -w "ServicePass" \
  -b "DC=corp,DC=example,DC=com" \
  "(sAMAccountName=alice)" | sed -n 's/^dn: //p')

# Check which groups contain that DN
ldapsearch -x -H ldap://dc01.corp.example.com:389 \
  -D "portainer-svc@corp.example.com" -w "ServicePass" \
  -b "DC=corp,DC=example,DC=com" \
  "(member=$USER_DN)" cn

# In Portainer, make sure the relevant groups are included in the Group Search configuration
# If team sync is enabled, the AD group name must match an existing Portainer team name
# Team name matching is case-insensitive
```

### Issue: Service Account Getting Locked Out

The service account may be getting locked due to an outdated password saved in Portainer or another LDAP client. To avoid repeated lockouts while you update the saved credentials:

```powershell
# Configure a fine-grained password policy with no lockout threshold
# (Requires AD Fine-Grained Password Policies or PSO)

New-ADFineGrainedPasswordPolicy `
  -Name "NoLockoutPolicy" `
  -Precedence 10 `
  -LockoutThreshold 0 `
  -LockoutDuration "00:30:00" `
  -LockoutObservationWindow "00:30:00"

Add-ADFineGrainedPasswordPolicySubject `
  -Identity "NoLockoutPolicy" `
  -Subjects "portainer-svc"
```

## Checking Portainer Logs for AD Errors

```bash
# Watch Portainer logs during a login attempt
docker logs portainer -f 2>&1 | grep -i "ldap\|auth\|error" &

# Attempt login
curl -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password"}'
```

## Conclusion

Active Directory login failures require checking both the Portainer configuration and the AD server state. The most common issues are expired or locked service account credentials, incorrect bind or username-format configuration, and user accounts in different OUs than the configured base DN. Always test with `ldapsearch` using the exact bind account, transport, and search base Portainer uses before escalating to AD administrators - it usually pinpoints the issue within seconds.
