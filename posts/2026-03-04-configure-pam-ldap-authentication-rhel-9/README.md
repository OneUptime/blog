# How to Configure PAM for LDAP Authentication on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PAM, LDAP, Authentication, Linux

Description: Set up RHEL 9 to authenticate users against an LDAP directory using SSSD and PAM, including TLS configuration and home directory creation.

---

If you manage more than a handful of Linux servers, local user management does not scale. LDAP gives you centralized authentication so users can log in to any server with the same credentials. On RHEL 9, the standard approach is to use SSSD as the broker between PAM and your LDAP directory.

## Architecture Overview

```mermaid
graph LR
    A[User Login] --> B[PAM]
    B --> C[pam_sss.so]
    C --> D[SSSD]
    D --> E[LDAP Server]
    E --> F[User Directory]
```

SSSD handles the actual LDAP communication, caching, and credential management. PAM just talks to SSSD through the `pam_sss.so` module.

## Prerequisites

You need:
- A working LDAP server (OpenLDAP, 389 Directory Server, or similar)
- The LDAP server's CA certificate (for TLS)
- Network access from the RHEL 9 client to the LDAP server on port 636 (LDAPS) or 389 (LDAP + STARTTLS)

## Installing Required Packages

```bash
# Install SSSD and related packages
sudo dnf install sssd sssd-ldap sssd-tools oddjob oddjob-mkhomedir -y
```

## Configuring SSSD for LDAP

### Create the SSSD configuration

```bash
sudo vi /etc/sssd/sssd.conf
```

```ini
[sssd]
services = nss, pam
domains = ldap.example.com

[nss]
filter_groups = root
filter_users = root

[pam]
offline_credentials_expiration = 7

[domain/ldap.example.com]
id_provider = ldap
auth_provider = ldap
chpass_provider = ldap

# LDAP server URI - use ldaps for TLS
ldap_uri = ldaps://ldap.example.com

# Base DN for user and group searches
ldap_search_base = dc=example,dc=com

# User search settings
ldap_user_search_base = ou=People,dc=example,dc=com
ldap_user_object_class = posixAccount
ldap_user_name = uid
ldap_user_uid_number = uidNumber
ldap_user_gid_number = gidNumber
ldap_user_home_directory = homeDirectory
ldap_user_shell = loginShell

# Group search settings
ldap_group_search_base = ou=Groups,dc=example,dc=com
ldap_group_object_class = posixGroup
ldap_group_name = cn
ldap_group_gid_number = gidNumber

# TLS settings
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/pki/tls/certs/ldap-ca.pem

# Enable caching for offline access
cache_credentials = True
entry_cache_timeout = 600

# Access control - allow all authenticated LDAP users
access_provider = ldap
ldap_access_filter = (objectClass=posixAccount)

# Use fully qualified names (user@domain) or short names
use_fully_qualified_names = False

# Enumerate users and groups (set to False for large directories)
enumerate = False
```

### Set correct permissions on the SSSD configuration

```bash
# SSSD requires strict permissions on its config file
sudo chmod 600 /etc/sssd/sssd.conf
sudo chown root:root /etc/sssd/sssd.conf
```

## Configuring TLS

Copy the LDAP server's CA certificate to the client:

```bash
# Copy the CA cert to the standard location
sudo cp ldap-ca.pem /etc/pki/tls/certs/ldap-ca.pem
sudo chmod 644 /etc/pki/tls/certs/ldap-ca.pem
```

### Test the TLS connection

```bash
# Verify the LDAP server is reachable and TLS works
openssl s_client -connect ldap.example.com:636 -CAfile /etc/pki/tls/certs/ldap-ca.pem
```

## Configuring PAM with authselect

Use authselect to configure PAM for SSSD:

```bash
# Select the sssd profile with home directory creation
sudo authselect select sssd with-mkhomedir --force
```

### Enable the oddjobd service for home directory creation

```bash
# Start and enable oddjobd so home directories get created on first login
sudo systemctl enable --now oddjobd
```

## Configuring NSS

authselect handles the nsswitch.conf configuration, but verify it is correct:

```bash
# Check that SSSD is listed in nsswitch.conf
grep -E "^(passwd|group|shadow)" /etc/nsswitch.conf
```

Expected output:

```
passwd:     sss files
group:      sss files
shadow:     sss files
```

## Starting SSSD

```bash
# Enable and start SSSD
sudo systemctl enable --now sssd

# Check the status
sudo systemctl status sssd
```

## Testing the Configuration

### Test user lookup

```bash
# Look up an LDAP user
id ldapuser

# List LDAP groups
getent group ldapgroup
```

### Test authentication

```bash
# Try to switch to an LDAP user
su - ldapuser

# Or test SSH login
ssh ldapuser@localhost
```

### Test with sssctl

```bash
# Run an SSSD user check
sudo sssctl user-checks ldapuser
```

## Binding to LDAP

If your LDAP server requires authenticated binds (most do), add bind credentials to SSSD:

```bash
sudo vi /etc/sssd/sssd.conf
```

Add these to the domain section:

```ini
# Bind DN for searching the directory
ldap_default_bind_dn = cn=sssd-bind,ou=ServiceAccounts,dc=example,dc=com
ldap_default_authtok_type = password
ldap_default_authtok = your_bind_password_here
```

For better security, store the password in a separate file:

```bash
# Create a password file
echo -n "your_bind_password_here" | sudo tee /etc/sssd/ldap-bind-pw > /dev/null
sudo chmod 600 /etc/sssd/ldap-bind-pw
```

Then reference it in sssd.conf:

```ini
ldap_default_authtok_type = password
ldap_default_authtok = file:///etc/sssd/ldap-bind-pw
```

## Restricting Access

### Allow only members of specific LDAP groups

```ini
# In the domain section of sssd.conf
access_provider = ldap
ldap_access_filter = (memberOf=cn=linux-users,ou=Groups,dc=example,dc=com)
```

### Or use the simple access provider

```ini
access_provider = simple
simple_allow_groups = linux-users, linux-admins
```

## Troubleshooting

### Enable debug logging

```bash
sudo vi /etc/sssd/sssd.conf
```

Add to each section:

```ini
[domain/ldap.example.com]
debug_level = 7
```

Restart SSSD and check logs:

```bash
sudo systemctl restart sssd
sudo tail -f /var/log/sssd/sssd_ldap.example.com.log
```

### Clear the SSSD cache

```bash
# Clear all cached data
sudo sss_cache -E

# Or restart SSSD and clear the database
sudo systemctl stop sssd
sudo rm -f /var/lib/sss/db/*
sudo systemctl start sssd
```

### Common issues

1. **Connection refused** - Check firewall rules and LDAP server accessibility.
2. **Certificate verification failed** - Verify the CA cert path and that it matches the LDAP server's certificate.
3. **No users found** - Double-check the search base and object class settings.
4. **Home directory not created** - Make sure oddjobd is running and `with-mkhomedir` is enabled.

```bash
# Quick diagnostic commands
sudo sssctl config-check
sudo sssctl domain-status ldap.example.com
```

## Wrapping Up

LDAP authentication via SSSD on RHEL 9 is solid and well-tested. The combination of SSSD for LDAP communication, authselect for PAM management, and oddjobd for home directory creation handles the most common requirements. Make sure TLS is working before anything else, keep debug logging handy for troubleshooting, and always test new configurations with a non-root user while keeping a root session open as a safety net.
