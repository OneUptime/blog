# How to Map Active Directory Groups to Ubuntu sudo Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Active Directory, sudo, SSSD, Authorization

Description: Configure sudo access on Ubuntu for Active Directory groups, allowing AD group membership to control administrative privileges on Linux systems.

---

Once Ubuntu is joined to Active Directory and users can log in with their domain credentials, the next step is controlling what they can do. Rather than granting sudo access individually to each user, you can map Active Directory security groups to sudo permissions. When group membership changes in AD, access on Ubuntu updates automatically.

## Prerequisites

- Ubuntu server joined to Active Directory (via `realm join`)
- SSSD configured and running
- AD users able to log in successfully
- Access to an AD administrator account to manage groups

## Verifying AD Groups Are Visible on Ubuntu

Before configuring sudo, confirm that SSSD is correctly resolving AD groups:

```bash
# Look up a specific AD group
getent group "Domain Admins"

# Look up group membership for a user
id jsmith

# Example output should show AD groups:
# uid=1234567890(jsmith) gid=1234567890(domain users) groups=1234567890(domain users),1234567891(domain admins)
```

If groups are not showing, check `sssd.conf` and run `sudo sss_cache -G "Group Name"` to flush the group cache.

## Method 1: Direct sudoers Configuration

The simplest approach - add group entries directly to `/etc/sudoers`:

```bash
sudo visudo
```

```
# Allow Domain Admins full sudo access
%"domain admins"@corp.example.com ALL=(ALL:ALL) ALL

# Allow LinuxAdmins group to run all commands without password
%LinuxAdmins@corp.example.com ALL=(ALL:ALL) NOPASSWD: ALL

# Allow DevOps group to restart specific services
%DevOps@corp.example.com ALL=(ALL:ALL) NOPASSWD: /bin/systemctl restart *, /bin/systemctl start *, /bin/systemctl stop *

# Allow DBAdmins to run commands as the postgres user only
%DBAdmins@corp.example.com ALL=(postgres:postgres) ALL
```

Note the `%` prefix for groups and quotes if the group name contains spaces.

## Method 2: sudoers.d Drop-In Files

For better organization, use files in `/etc/sudoers.d/`:

```bash
sudo nano /etc/sudoers.d/ad-groups
```

```
# Active Directory group to Ubuntu sudo mapping
# File: /etc/sudoers.d/ad-groups

# Full administrative access for Domain Admins
%"domain admins"@corp.example.com ALL=(ALL:ALL) ALL

# Server admins - passwordless full sudo
%LinuxServerAdmins@corp.example.com ALL=(ALL:ALL) NOPASSWD: ALL

# Developer team - limited sudo for service management
%"development team"@corp.example.com ALL=(ALL:ALL) NOPASSWD: \
    /bin/systemctl restart nginx, \
    /bin/systemctl restart php8.1-fpm, \
    /usr/bin/tail -f /var/log/nginx/*, \
    /usr/bin/journalctl -u nginx *

# DBA team - can become postgres user
%DatabaseAdmins@corp.example.com ALL=(postgres:) ALL

# Security team - read-only audit access
%SecurityAudit@corp.example.com ALL=(ALL:ALL) NOPASSWD: \
    /usr/bin/last, \
    /usr/bin/lastlog, \
    /bin/journalctl *, \
    /usr/sbin/auditctl -l
```

```bash
# Verify the syntax before relying on it
sudo visudo -c -f /etc/sudoers.d/ad-groups
```

## Method 3: SSSD sudo Integration

SSSD can read sudo rules from LDAP or from a dedicated sudo LDAP schema. This allows centralized sudo policy management in the directory rather than on each server.

### Configure SSSD to Handle sudo

Add `sudo` to the SSSD services list:

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
config_file_version = 2
services = nss, pam, sudo
domains = corp.example.com

[sudo]
# How often to refresh sudo rules from LDAP
sudo_cache_timeout = 180

[domain/corp.example.com]
# ... existing settings ...

# Enable SSSD as sudo provider
sudo_provider = ldap

# LDAP base for sudo rules
ldap_sudo_search_base = ou=SUDOers,dc=corp,dc=example,dc=com
```

### Configure sudo to Use SSSD

```bash
sudo nano /etc/nsswitch.conf
```

```
# Add sssd to the sudoers lookup
sudoers: files sss
```

### Create sudo Rules in LDAP

On your LDAP server, create sudo policy objects. First, load the sudo schema if not already present:

```bash
# Download the sudo LDAP schema
sudo apt install -y sudo-ldap

# Schema is at /usr/share/doc/sudo-ldap/schema.openldap
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /usr/share/doc/sudo-ldap/schema.openldap
```

Create an OU for sudo rules:

```ldif
dn: ou=SUDOers,dc=corp,dc=example,dc=com
objectClass: organizationalUnit
ou: SUDOers
description: sudo rules
```

Create a rule:

```ldif
# Grant LinuxAdmins group full sudo access
dn: cn=LinuxAdmins-rule,ou=SUDOers,dc=corp,dc=example,dc=com
objectClass: sudoRole
cn: LinuxAdmins-rule
sudoUser: %LinuxAdmins
sudoHost: ALL
sudoCommand: ALL
sudoRunAsUser: ALL
sudoRunAsGroup: ALL
sudoOption: !authenticate

# Grant DevOps limited access
dn: cn=DevOps-services,ou=SUDOers,dc=corp,dc=example,dc=com
objectClass: sudoRole
cn: DevOps-services
sudoUser: %DevOps
sudoHost: app*.corp.example.com
sudoCommand: /bin/systemctl
sudoRunAsUser: root
sudoOption: !authenticate
```

```bash
ldapadd -x -H ldap://ldap.corp.example.com \
  -D "cn=admin,dc=corp,dc=example,dc=com" \
  -W -f sudo-rules.ldif
```

## Handling Group Names with Spaces

AD group names often contain spaces (e.g., "Domain Admins"). Handle this carefully in sudoers:

```bash
# Correct: quote the group name
%"Domain Admins"@corp.example.com ALL=(ALL:ALL) ALL

# Also correct: use underscore-substituted name if SSSD maps it
# Check how SSSD represents the group:
getent group "Domain Admins"
# If it shows as "domain_admins":
%domain_admins@corp.example.com ALL=(ALL:ALL) ALL
```

Check group name representation:

```bash
# See exactly how the group name appears on the system
id aduser | tr ',' '\n' | grep -i admin
```

## Configuring short names vs. fully qualified names

By default with `realmd`, SSSD requires fully qualified names (`user@domain.com`). For shorter names in sudoers:

```ini
# In sssd.conf
[domain/corp.example.com]
# Allow short names (without @domain suffix)
use_fully_qualified_names = false

# With short names, sudoers becomes:
# %"Domain Admins" ALL=(ALL:ALL) ALL
```

```bash
sudo systemctl restart sssd
```

If you change this setting, update your sudoers entries accordingly.

## Testing sudo Access

```bash
# Test as an AD user
sudo -u jsmith@corp.example.com sudo -l
# Should list allowed commands

# Or log in as the AD user and test
ssh jsmith@ubuntu-server.corp.example.com
sudo whoami
# Should return: root

# Test specific command
sudo systemctl restart nginx

# Test that unauthorized commands fail
sudo rm /etc/passwd
# Should show: jsmith is not allowed to run 'rm /etc/passwd'
```

## Auditing sudo Usage

All sudo commands are logged by default to `/var/log/auth.log`:

```bash
# View recent sudo activity
sudo grep sudo /var/log/auth.log | tail -20

# Monitor in real time
sudo tail -f /var/log/auth.log | grep sudo
```

For more detailed audit logging, configure sudo's log file:

```bash
sudo nano /etc/sudoers.d/logging
```

```
# Log all sudo commands to a dedicated file
Defaults    log_output
Defaults    logfile="/var/log/sudo.log"
Defaults    log_input
```

## Group-Based Access to Specific Servers

Use SSSD access control to restrict which AD groups can log in to specific servers, separate from sudo:

```ini
[domain/corp.example.com]
# Only these groups can log in at all
access_provider = simple
simple_allow_groups = LinuxAdmins, DevOps, AppTeam
```

Combined with sudoers rules, this creates a layered access model:
- `simple_allow_groups` controls who can SSH in
- `sudoers` controls what they can do after login

## Troubleshooting

**"not in the sudoers file"** - the group is not matching. Run `id username` to see group names as the system sees them, then match exactly in sudoers.

**Groups not showing** - refresh SSSD cache: `sudo sss_cache -G "Group Name"` and `sudo systemctl restart sssd`.

**Syntax error in sudoers** - always use `visudo` or `visudo -c -f /etc/sudoers.d/file` to check syntax before saving.

**SSSD sudo not working** - verify `sudo` is in `sssd.conf` services list and `sudoers: files sss` is in `nsswitch.conf`.

With AD group-based sudo access configured, you have a scalable approach to Linux privilege management where group membership in Active Directory directly drives what users can do on Ubuntu systems.
