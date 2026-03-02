# How to Install and Configure OpenLDAP on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, OpenLDAP, Authentication, Directory Services

Description: Step-by-step guide to installing and configuring OpenLDAP on Ubuntu Server for centralized directory services and authentication.

---

OpenLDAP is the most widely deployed open-source implementation of the Lightweight Directory Access Protocol (LDAP). It provides a centralized directory for storing user accounts, groups, and other network resource information, making it a cornerstone of enterprise identity management on Linux systems. This guide walks through a complete installation and basic configuration of OpenLDAP on Ubuntu Server.

## What You Will Build

By the end of this guide, you will have:
- A working OpenLDAP server (slapd) with your organization's base DN
- A structured directory with organizational units for users and groups
- A sample user account in the directory

## Prerequisites

- Ubuntu 22.04 or 24.04 LTS server
- Root or sudo access
- A fully qualified domain name (FQDN) for your server (e.g., `ldap.example.com`)
- Basic understanding of LDAP concepts (DN, OU, DC)

## Installing slapd and LDAP Utilities

```bash
sudo apt update
sudo apt install -y slapd ldap-utils
```

During installation, you will be prompted to set an LDAP admin password. Set a strong password here - you can reconfigure this later if needed.

## Reconfiguring slapd

The initial configuration is minimal. Use `dpkg-reconfigure` to set your domain properly:

```bash
sudo dpkg-reconfigure slapd
```

Answer the prompts:
- **Omit OpenLDAP server configuration?** - No
- **DNS domain name** - `example.com` (this creates `dc=example,dc=com`)
- **Organization name** - `Example Organization`
- **Administrator password** - set and confirm a strong password
- **Remove the database when slapd is purged?** - No (safer choice)
- **Move old database?** - Yes

After reconfiguring, verify the service is running:

```bash
sudo systemctl status slapd
sudo systemctl enable slapd
```

## Verifying the Base Installation

Test the default directory structure using `ldapsearch`:

```bash
# Search with the admin bind DN
ldapsearch -x -H ldap://localhost \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W

# Anonymous search (may return nothing by default)
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com"
```

If the server responds with the base DN entry, the core installation is working.

## Installing phpLDAPadmin (Optional Web Interface)

For those who prefer a graphical interface during initial setup:

```bash
sudo apt install -y phpldapadmin

# Configure the server
sudo nano /etc/phpldapadmin/config.php
```

Set the server host and base DN:

```php
$servers->setValue('server','host','127.0.0.1');
$servers->setValue('server','base',array('dc=example,dc=com'));
$servers->setValue('login','bind_id','cn=admin,dc=example,dc=com');
```

Access at `http://your-server-ip/phpldapadmin` with the admin credentials.

## Creating Organizational Units

A flat directory structure is hard to manage. Create Organizational Units (OUs) to separate users, groups, and service accounts. Save this as `base-structure.ldif`:

```ldif
# Create People OU
dn: ou=People,dc=example,dc=com
objectClass: organizationalUnit
ou: People
description: All user accounts

# Create Groups OU
dn: ou=Groups,dc=example,dc=com
objectClass: organizationalUnit
ou: Groups
description: All groups

# Create Service Accounts OU
dn: ou=ServiceAccounts,dc=example,dc=com
objectClass: organizationalUnit
ou: ServiceAccounts
description: Non-human service accounts
```

Add the structure:

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f base-structure.ldif
```

## Adding a User Account

Create a user LDIF file. You need a hashed password first:

```bash
# Generate a password hash
slappasswd -s "UserPassword123!"
# Output: {SSHA}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Save as `user-jsmith.ldif`:

```ldif
dn: uid=jsmith,ou=People,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: jsmith
sn: Smith
givenName: John
cn: John Smith
displayName: John Smith
uidNumber: 10001
gidNumber: 10001
userPassword: {SSHA}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
loginShell: /bin/bash
homeDirectory: /home/jsmith
mail: jsmith@example.com
```

Add the user:

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f user-jsmith.ldif
```

## Adding a Group and Adding Users to It

```ldif
# Save as group-devops.ldif
dn: cn=devops,ou=Groups,dc=example,dc=com
objectClass: posixGroup
cn: devops
gidNumber: 10001
memberUid: jsmith
description: DevOps team members
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f group-devops.ldif
```

## Verifying Entries

```bash
# Search for the user
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(uid=jsmith)"

# Search for groups
ldapsearch -x -H ldap://localhost \
  -b "ou=Groups,dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=posixGroup)"

# Test user bind (password authentication)
ldapwhoami -x -H ldap://localhost \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -W
```

## Firewall Configuration

If you plan to allow LDAP clients from other hosts:

```bash
# Allow LDAP (port 389)
sudo ufw allow 389/tcp

# Allow LDAPS (port 636) if using TLS
sudo ufw allow 636/tcp

# Restrict to specific subnet for security
sudo ufw allow from 192.168.1.0/24 to any port 389
```

## slapd Configuration Overview

OpenLDAP uses a dynamic configuration backend called `cn=config`. You can query it to inspect current settings:

```bash
# View all configuration
sudo ldapsearch -Y EXTERNAL -H ldapi:/// -b "cn=config" -LLL

# View database settings
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "olcDatabase={1}mdb,cn=config" -LLL
```

## Enabling Logging

For troubleshooting, enable logging in the slapd configuration:

```ldif
# Save as logging.ldif
dn: cn=config
changetype: modify
replace: olcLogLevel
olcLogLevel: stats
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f logging.ldif
```

View logs:

```bash
sudo journalctl -u slapd -f
```

## Backing Up the Directory

```bash
# Export the entire directory to LDIF
sudo slapcat -n 1 -l /backup/ldap-backup-$(date +%F).ldif

# Export configuration
sudo slapcat -n 0 -l /backup/ldap-config-$(date +%F).ldif
```

## Next Steps

With a working OpenLDAP server, you can:
- Enable TLS for encrypted connections (strongly recommended before production use)
- Configure LDAP client authentication on other Ubuntu machines using `libpam-ldapd` or SSSD
- Set up replication for high availability
- Configure access control lists (ACLs) to restrict who can read or modify directory entries

OpenLDAP is a powerful platform, and the configuration you have built here provides a solid foundation for centralized authentication across your infrastructure.
