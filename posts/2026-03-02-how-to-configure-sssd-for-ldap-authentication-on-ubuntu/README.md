# How to Configure SSSD for LDAP Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSSD, LDAP, Authentication, PAM

Description: Configure SSSD for LDAP authentication on Ubuntu, covering sssd.conf setup, PAM integration, TLS, and troubleshooting common issues.

---

SSSD (System Security Services Daemon) is the recommended way to configure LDAP authentication on modern Ubuntu systems. Unlike the older `nslcd` approach, SSSD provides credential caching, offline authentication, support for multiple identity providers, and cleaner integration with PAM. This guide focuses specifically on the LDAP provider, which works with OpenLDAP, 389 Directory Server, and other RFC-compliant LDAP servers.

## How SSSD Works with LDAP

SSSD mediates between the operating system (NSS for user lookups, PAM for authentication) and the LDAP directory. It:

1. Performs an LDAP search to find the user by username
2. Binds with the user's DN and password to verify credentials
3. Returns POSIX attributes (UID, GID, home directory, shell) to NSS
4. Caches user information locally for performance and offline access

## Installing SSSD

```bash
sudo apt update
sudo apt install -y sssd sssd-ldap libpam-sss libnss-sss sssd-tools
```

## Basic SSSD Configuration for LDAP

Create `/etc/sssd/sssd.conf`:

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
config_file_version = 2

# List configured domains
domains = ldap.example.com

# Services SSSD provides
services = nss, pam

# Log level (0=no debug, 3=default, 7=verbose)
# debug_level = 3

[nss]
# Timeout for name service lookups
homedir_substring = /home

[pam]
# Offline credential lifetime (in days)
offline_credentials_expiration = 7

[domain/ldap.example.com]
# Use LDAP for both identity and authentication
id_provider = ldap
auth_provider = ldap
chpass_provider = ldap

# LDAP server address (use ldaps:// for port 636)
ldap_uri = ldap://ldap.example.com

# Search base
ldap_search_base = dc=example,dc=com

# Separate search bases for users and groups (optional)
ldap_user_search_base = ou=People,dc=example,dc=com
ldap_group_search_base = ou=Groups,dc=example,dc=com

# Bind account for directory lookups
ldap_default_bind_dn = cn=readonly,dc=example,dc=com
ldap_default_authtok_type = password
ldap_default_authtok = ReadOnlyPassword123

# TLS/SSL settings
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/ssl/certs/ca-certificates.crt

# Use StartTLS on port 389
ldap_id_use_start_tls = true

# Schema settings - map LDAP attributes to POSIX
ldap_schema = rfc2307
ldap_user_object_class = posixAccount
ldap_user_uid_number = uidNumber
ldap_user_gid_number = gidNumber
ldap_user_home_directory = homeDirectory
ldap_user_shell = loginShell
ldap_user_gecos = gecos

ldap_group_object_class = posixGroup
ldap_group_name = cn
ldap_group_member = memberUid

# Cache behavior
cache_credentials = true
entry_cache_timeout = 600

# Account expiry enforcement
ldap_account_expire_policy = shadow

# Enumerate users/groups (set true for small directories)
# enumerate = false
```

Set strict permissions (SSSD refuses to start without these):

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo chown root:root /etc/sssd/sssd.conf
```

## Configuring NSS

Tell the Name Service Switch to use SSSD:

```bash
sudo nano /etc/nsswitch.conf
```

```
passwd:         files systemd sss
group:          files systemd sss
shadow:         files sss
gshadow:        files
hosts:          files dns
networks:       files
protocols:      db files
services:       db files
ethers:         db files
rpc:            db files
netgroup:       nis sss
```

## Configuring PAM

Use `pam-auth-update` to add SSSD to the PAM stack:

```bash
# Enable SSSD authentication
sudo pam-auth-update --enable sssd

# Enable automatic home directory creation
sudo pam-auth-update --enable mkhomedir
```

Verify the changes:

```bash
grep sss /etc/pam.d/common-auth
grep mkhomedir /etc/pam.d/common-session
```

## Starting SSSD

```bash
sudo systemctl enable sssd
sudo systemctl start sssd
sudo systemctl status sssd
```

## Testing the Configuration

```bash
# Test user lookup via NSS
getent passwd jsmith

# Test group lookup
getent group devops

# Test authentication
su - jsmith

# Check SSSD cache
sudo sss_cache -u jsmith

# View all cached users
getent passwd | grep -v "^root"
```

If `getent passwd jsmith` returns the user's POSIX attributes, NSS integration is working. If `su - jsmith` succeeds with the LDAP password, PAM authentication is working.

## Advanced SSSD Configuration Options

### Using LDAPS Instead of StartTLS

For LDAPS (port 636), change the URI and disable StartTLS:

```ini
ldap_uri = ldaps://ldap.example.com
ldap_id_use_start_tls = false
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/ssl/certs/ca-certificates.crt
```

### Requiring Group Membership for Access

Restrict logins to members of specific LDAP groups:

```ini
access_provider = ldap
ldap_access_filter = (memberOf=cn=sysadmins,ou=Groups,dc=example,dc=com)
```

Or with SSSD's simple access provider:

```ini
access_provider = simple
simple_allow_groups = sysadmins, devops
```

### Configuring Multiple LDAP Servers for Redundancy

```ini
ldap_uri = ldap://ldap1.example.com ldap://ldap2.example.com

# SSSD tries servers in order and fails over automatically
```

### Referral Handling

If your LDAP server returns referrals:

```ini
ldap_referrals = false
```

Most environments should disable referrals to avoid confusion and performance issues.

### Adjusting Search Scope

```ini
# Subtree (default) - searches base and all descendants
ldap_search_scope = subtree

# OneLevel - searches only immediate children of the base
ldap_search_scope = onelevel
```

## Using SSSD with rfc2307bis Schema

For directories that use `groupOfNames` or `groupOfUniqueNames` (member is a full DN rather than a UID):

```ini
ldap_schema = rfc2307bis
ldap_group_object_class = groupOfNames
ldap_group_member = member
```

## Configuring SSSD for SSH Key Retrieval

SSSD can retrieve SSH public keys from LDAP, allowing centralized SSH key management:

```ini
[domain/ldap.example.com]
# ... existing settings ...

# Attribute in LDAP that stores SSH keys
ldap_user_ssh_public_key = sshPublicKey

[ssh]
# Enable SSH key retrieval
ssh_hash_known_hosts = true
```

Update `/etc/ssh/sshd_config`:

```
AuthorizedKeysCommand /usr/bin/sss_ssh_authorizedkeys
AuthorizedKeysCommandUser nobody
```

```bash
sudo systemctl restart sshd
```

## Monitoring SSSD

```bash
# SSSD process status
sudo systemctl status sssd

# View SSSD logs
sudo journalctl -u sssd -n 100

# Check individual domain logs
sudo ls /var/log/sssd/
sudo tail -f /var/log/sssd/sssd_ldap.example.com.log

# Cache statistics
sudo sssctl domain-status ldap.example.com
```

## Troubleshooting

### SSSD Fails to Start

```bash
# Check for configuration errors
sudo sssctl config-check

# Common issue: wrong permissions
sudo chmod 600 /etc/sssd/sssd.conf
sudo chown root:root /etc/sssd/sssd.conf
```

### Users Not Found

```bash
# Enable debug logging
sudo nano /etc/sssd/sssd.conf
# Add: debug_level = 7 under [domain/ldap.example.com]

sudo systemctl restart sssd
sudo tail -f /var/log/sssd/sssd_ldap.example.com.log

# Manually test the bind and search SSSD is doing
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=readonly,dc=example,dc=com" \
  -w ReadOnlyPassword123 \
  -b "ou=People,dc=example,dc=com" \
  "(uid=jsmith)"
```

### Stale Cache

```bash
# Clear cache for a specific user
sudo sss_cache -u jsmith

# Clear entire cache
sudo sss_cache -E

# Or stop SSSD, delete cache, restart
sudo systemctl stop sssd
sudo rm -rf /var/lib/sss/db/*
sudo systemctl start sssd
```

### TLS Errors

Temporarily set `ldap_tls_reqcert = allow` to bypass validation while testing, then distribute the CA certificate and restore `demand`.

SSSD with LDAP provides a robust, caching authentication system that degrades gracefully when the LDAP server is temporarily unavailable, making it a reliable choice for production environments.
