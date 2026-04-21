# How to Troubleshoot Active Directory Login Failures in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, Troubleshooting, LDAP, Authentication

Description: Diagnose and fix common Active Directory login failures in Portainer including credential errors, DNS issues, and SSL certificate problems.

---

AD authentication failures in Portainer can be frustrating. This guide provides a systematic approach to identifying and resolving the most common issues.

## Step 1: Check Portainer Logs

```bash
# Review logs and watch for AD-related messages

docker logs portainer 2>&1 | grep -i "ldap\|auth\|error\|warn" | tail -50

# Real-time debug monitoring during a login attempt
docker logs -f portainer 2>&1 | grep -i "ldap\|auth"
```

## Step 2: Verify Network Connectivity

```bash
# From a temporary diagnostic container sharing Portainer's network namespace
docker run --rm --network container:portainer alpine:3.23 /bin/sh -c "
  # Check DNS resolution
  nslookup dc01.corp.example.com

  # Check LDAP/LDAPS port reachability
  nc -zv dc01.corp.example.com 636 2>&1
  nc -zv dc01.corp.example.com 389 2>&1
"
```

## Step 3: Validate Service Account Credentials

```bash
# Test the service account bind from outside the container
ldapwhoami \
  -H ldaps://dc01.corp.example.com:636 \
  -x \
  -D "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com" \
  -w "ServicePassword!"

# Common error codes:
# 49 = Invalid credentials (wrong password or DN)
# 32 = No such object (wrong BaseDN)
# 13 = Confidentiality required (TLS required)
```

## Step 4: Test User Authentication

```bash
# Test a specific user's login via LDAP bind
ldapwhoami \
  -H ldaps://dc01.corp.example.com:636 \
  -x \
  -D "CORP\jsmith" \
  -w "UserPassword"
# OR using UPN format
ldapwhoami \
  -H ldaps://dc01.corp.example.com:636 \
  -x \
  -D "jsmith@corp.example.com" \
  -w "UserPassword"
```

## Common AD Errors and Fixes

### Error: "data 52e" - Invalid Credentials

```bash
# Error code 52e means bad username or password
# Check the Username attribute (LDAP) or Username Format (Microsoft Active Directory) setting
# If Username attribute is sAMAccountName or Username Format is username: user logs in as "jsmith"
# If Username attribute is userPrincipalName or Username Format is username@domainname: user logs in as "jsmith@corp.example.com"

# Find a user's sAMAccountName
ldapsearch -H ldaps://dc01.corp.example.com:636 \
  -x -D "CN=portainer-svc,..." -w "pass" \
  -b "DC=corp,DC=example,DC=com" \
  "(mail=jsmith@corp.example.com)" \
  sAMAccountName userPrincipalName
```

### Error: "data 525" - User Not Found

```bash
# Search filter not matching the user
# Check BaseDN includes the user's OU
ldapsearch -H ldaps://dc01.corp.example.com:636 \
  -x -D "CN=portainer-svc,..." -w "pass" \
  -b "DC=corp,DC=example,DC=com" \
  "(sAMAccountName=jsmith)" dn
```

### Error: "data 533" - Account Disabled

```bash
# User account is disabled in AD
# Add filter to exclude disabled accounts in the search settings
# Filter: (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

### Error: SSL Certificate Verification Failed

```bash
# Get the DC's SSL certificate
openssl s_client -connect dc01.corp.example.com:636 -servername dc01.corp.example.com -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -enddate

# If the cert is from an internal CA, save the presented chain for inspection
openssl s_client -connect dc01.corp.example.com:636 -servername dc01.corp.example.com -showcerts </dev/null 2>/dev/null > /tmp/dc-chain.pem

# Upload the issuing/root CA certificate in Portainer's TLS CA certificate field
# under AD Connectivity Security (or LDAP security when using LDAP mode), then save.
```

## Portainer AD Diagnostic Checklist

- [ ] DNS resolves the DC hostname from Portainer's network namespace
- [ ] Port 636 (LDAPS) is reachable from Portainer's network namespace
- [ ] Service account credentials are correct and account is not expired
- [ ] Service account is not locked out
- [ ] BaseDN/User Search Path is correct (use the full DN where LDAP mode requires it)
- [ ] Search filter returns users when tested with ldapsearch
- [ ] SSL certificate is valid and trusted
- [ ] Username attribute / Username Format matches the format used for login

---

*Add real-time alerting for authentication failures with [OneUptime](https://oneuptime.com).*
