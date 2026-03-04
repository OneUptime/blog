# How to Set Up Password Policies and Account Lockout in 389 Directory Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, Password Policy, Account Lockout, LDAP, Security

Description: Configure password complexity requirements and account lockout policies in 389 Directory Server on RHEL to strengthen authentication security.

---

Password policies and account lockout rules are essential for securing any LDAP directory. 389 Directory Server supports fine-grained password policies that enforce complexity, expiration, and lockout thresholds.

## View the Current Global Password Policy

```bash
# Display the current password policy settings
dsconf localhost pwpolicy get
```

## Set Password Complexity Requirements

```bash
# Enable password syntax checking (complexity enforcement)
dsconf localhost pwpolicy set \
  --pwdchecksyntax=on

# Set minimum password length to 12 characters
dsconf localhost pwpolicy set \
  --pwdminlength=12

# Require at least one digit in the password
dsconf localhost pwpolicy set \
  --pwdmindigits=1

# Require at least one special character
dsconf localhost pwpolicy set \
  --pwdminspecials=1

# Require at least one uppercase letter
dsconf localhost pwpolicy set \
  --pwdminuppers=1
```

## Configure Password Expiration

```bash
# Enable password expiration
dsconf localhost pwpolicy set \
  --pwdexp=on

# Set password maximum age to 90 days (in seconds: 90 * 86400)
dsconf localhost pwpolicy set \
  --pwdmaxage=7776000

# Send warning 14 days before expiration (in seconds)
dsconf localhost pwpolicy set \
  --pwdwarning=1209600

# Keep a history of 5 passwords to prevent reuse
dsconf localhost pwpolicy set \
  --pwdinhistory=5
```

## Configure Account Lockout

```bash
# Enable account lockout
dsconf localhost pwpolicy set \
  --pwdlockout=on

# Lock the account after 5 failed attempts
dsconf localhost pwpolicy set \
  --pwdmaxfailure=5

# Set the lockout duration to 30 minutes (in seconds)
dsconf localhost pwpolicy set \
  --pwdlockoutduration=1800

# Reset the failure counter after 10 minutes (in seconds)
dsconf localhost pwpolicy set \
  --pwdfailurecountinterval=600
```

## Create a Subtree-Level Password Policy

You can apply different policies to specific parts of the directory tree.

```bash
# Create a local policy for the engineering OU
dsconf localhost localpwp addsubtree \
  "ou=engineering,dc=example,dc=com"

# Set a stricter minimum length for the subtree
dsconf localhost localpwp set \
  "ou=engineering,dc=example,dc=com" \
  --pwdminlength=16
```

## Verify the Policy

```bash
# View the global policy to confirm all changes
dsconf localhost pwpolicy get

# Test by attempting to set a weak password
ldappasswd -H ldaps://ldap.example.com \
  -D "cn=Directory Manager" -W \
  -S "uid=testuser,ou=people,dc=example,dc=com"
```

## Unlock a Locked Account

```bash
# Unlock a user account that has been locked out
dsidm localhost account unlock "uid=jdoe,ou=people,dc=example,dc=com"
```

These settings provide a solid baseline for directory security. Adjust the thresholds based on your organization's security requirements.
