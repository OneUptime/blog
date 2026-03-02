# How to Configure LDAP Client Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, Authentication, PAM, NSS

Description: Configure Ubuntu as an LDAP client to authenticate users against an OpenLDAP or Active Directory server using SSSD or nslcd.

---

Once you have an OpenLDAP server running, the next step is configuring your Ubuntu machines to authenticate users against it. This means that when someone logs in via SSH or locally, their username and password are verified against LDAP rather than the local `/etc/passwd` and `/etc/shadow` files. Ubuntu supports two main approaches: the modern SSSD daemon and the older `nslcd`/`libnss-ldapd` stack. This guide covers both, with SSSD as the recommended path.

## Approach 1: SSSD (Recommended)

SSSD (System Security Services Daemon) is the preferred method for LDAP client authentication on modern Ubuntu. It handles caching, Kerberos integration, and multiple identity providers cleanly.

### Installing SSSD Packages

```bash
sudo apt update
sudo apt install -y sssd sssd-ldap libpam-sss libnss-sss sssd-tools
```

### Configuring SSSD for LDAP

Create the SSSD configuration file:

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
# List all configured domains
domains = example.com
config_file_version = 2
services = nss, pam

[domain/example.com]
# Use LDAP as the identity provider
id_provider = ldap
auth_provider = ldap

# LDAP server URI
ldap_uri = ldap://ldap.example.com

# Base DN for user searches
ldap_search_base = dc=example,dc=com

# Use TLS for connections (recommended)
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/ssl/certs/ca-certificates.crt

# Bind credentials for directory queries
ldap_default_bind_dn = cn=readonly,dc=example,dc=com
ldap_default_authtok = ReadOnlyPassword123!

# User and group object mappings for POSIX attributes
ldap_user_object_class = inetOrgPerson
ldap_user_uid_number = uidNumber
ldap_user_gid_number = gidNumber
ldap_user_home_directory = homeDirectory
ldap_user_shell = loginShell

# Automatically create home directories on first login
# (requires pam_mkhomedir - see PAM section below)
```

Set strict permissions on the config file (SSSD refuses to start otherwise):

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo chown root:root /etc/sssd/sssd.conf
```

### Creating a Read-Only Bind Account

It is good practice to use a dedicated low-privilege account for SSSD to search the directory. On your LDAP server:

```ldif
# Save as readonly-user.ldif
dn: cn=readonly,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: readonly
description: LDAP read-only bind account
userPassword: {SSHA}xxxxxxxxxxxxxxxxx
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f readonly-user.ldif
```

Grant read access to this account via an ACL on the LDAP server (see the access control guide for details).

### Starting SSSD

```bash
sudo systemctl enable sssd
sudo systemctl start sssd
sudo systemctl status sssd
```

### Configuring PAM and NSS

On Ubuntu, the `pam-auth-update` tool manages PAM configuration. Enable the SSSD PAM module:

```bash
sudo pam-auth-update --enable sssd
```

For automatic home directory creation on first login:

```bash
sudo pam-auth-update --enable mkhomedir
```

This adds `pam_mkhomedir.so` to the session stack in `/etc/pam.d/common-session`.

Configure NSS to use SSSD for user and group lookups:

```bash
sudo nano /etc/nsswitch.conf
```

```
passwd:         files systemd sss
group:          files systemd sss
shadow:         files sss
hosts:          files dns
```

### Testing the Configuration

```bash
# Look up an LDAP user
getent passwd jsmith

# Look up an LDAP group
getent group devops

# Test authentication
sudo -u jsmith ssh localhost
# or
su - jsmith
```

If `getent passwd jsmith` returns the user's details, NSS is working. If you can then log in as that user, PAM authentication is working.

## Approach 2: nslcd + libnss-ldapd (Legacy)

If you are on an older system or prefer the simpler nslcd approach:

```bash
sudo apt install -y nslcd libnss-ldapd libpam-ldapd
```

During installation, a dialog will ask for:
- LDAP server URI: `ldap://ldap.example.com`
- Base DN: `dc=example,dc=com`
- NSS name services to configure: select `passwd`, `group`, `shadow`

Configure nslcd:

```bash
sudo nano /etc/nslcd.conf
```

```
uid nslcd
gid nslcd
uri ldap://ldap.example.com
base dc=example,dc=com
binddn cn=readonly,dc=example,dc=com
bindpw ReadOnlyPassword123!
ssl start_tls
tls_cacertfile /etc/ssl/certs/ca-certificates.crt
```

```bash
sudo chmod 600 /etc/nslcd.conf
sudo systemctl enable nslcd
sudo systemctl restart nslcd
```

Update `/etc/nsswitch.conf` to include `ldap`:

```
passwd:         files ldap
group:          files ldap
shadow:         files ldap
```

## Configuring SSH for LDAP Users

For SSH key-based authentication with LDAP users, check that `UsePAM yes` is set in `/etc/ssh/sshd_config`:

```bash
sudo grep "UsePAM" /etc/ssh/sshd_config
# Should show: UsePAM yes

# If not set, add it
sudo nano /etc/ssh/sshd_config
# Add: UsePAM yes

sudo systemctl restart sshd
```

## Restricting Access to Specific Groups

You may not want all LDAP users to be able to log into every system. With SSSD, use the `access_provider` setting:

```ini
[domain/example.com]
# ... existing settings ...

# Only allow members of the 'sysadmins' group
access_provider = simple
simple_allow_groups = sysadmins, devops
```

Or use LDAP-based access control:

```ini
access_provider = ldap
ldap_access_filter = (memberOf=cn=sysadmins,ou=Groups,dc=example,dc=com)
```

## Troubleshooting

### SSSD Not Returning Users

```bash
# Check SSSD logs
sudo journalctl -u sssd -n 50

# Enable debug logging in sssd.conf
# Under [domain/example.com]:
# debug_level = 7

sudo systemctl restart sssd
sudo journalctl -u sssd -f
```

### Certificate Errors

If you see TLS errors, temporarily set `ldap_tls_reqcert = allow` to bypass cert validation while debugging, then fix the certificate issue and restore `demand`.

### Cache Issues

SSSD caches user information. To force a refresh:

```bash
# Clear SSSD cache for a specific user
sudo sss_cache -u jsmith

# Clear all cached data
sudo sss_cache -E
```

## Verifying Full Authentication Flow

```bash
# 1. Confirm NSS resolves the user
id jsmith

# 2. Confirm password authentication works
su - jsmith

# 3. Confirm group membership is correct
groups jsmith

# 4. Confirm sudo access if configured
sudo -l -U jsmith
```

With LDAP client authentication properly configured, your Ubuntu machines now delegate user authentication to the central LDAP directory, simplifying user management across your infrastructure.
