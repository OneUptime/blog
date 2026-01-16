# How to Install and Configure OpenLDAP on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, LDAP, Directory Services, Authentication, Tutorial

Description: Complete guide to installing and configuring OpenLDAP directory server on Ubuntu for centralized authentication.

---

OpenLDAP is a powerful open-source implementation of the Lightweight Directory Access Protocol (LDAP) that provides centralized authentication and directory services for your network. This comprehensive guide walks you through installing, configuring, and managing OpenLDAP on Ubuntu, from basic setup to advanced features like TLS encryption and PAM integration.

## Table of Contents

1. [Understanding LDAP Concepts](#understanding-ldap-concepts)
2. [Installing OpenLDAP](#installing-openldap)
3. [Initial Configuration](#initial-configuration)
4. [Adding Organizational Units and Users](#adding-organizational-units-and-users)
5. [LDIF File Format](#ldif-file-format)
6. [TLS/SSL Configuration](#tlsssl-configuration)
7. [Access Control Lists (ACLs)](#access-control-lists-acls)
8. [Setting Up LDAP Clients](#setting-up-ldap-clients)
9. [PAM and NSS Integration](#pam-and-nss-integration)
10. [phpLDAPadmin Web Interface](#phpldapadmin-web-interface)
11. [Backup and Restore Procedures](#backup-and-restore-procedures)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Understanding LDAP Concepts

Before diving into the installation, it's essential to understand the fundamental concepts of LDAP directory structure and terminology.

### Directory Information Tree (DIT)

LDAP organizes data in a hierarchical tree structure called the Directory Information Tree (DIT). Each entry in the tree has a unique identifier and contains attributes that describe the object.

### Key LDAP Terminology

**DN (Distinguished Name)**: The unique identifier for an entry in the directory tree. It represents the full path from the root to the entry.

```
dn: uid=jdoe,ou=People,dc=example,dc=com
```

**CN (Common Name)**: A human-readable name for an entry, typically used for users and groups.

```
cn: John Doe
```

**OU (Organizational Unit)**: A container object used to organize entries within the directory, similar to folders in a filesystem.

```
ou: People
ou: Groups
ou: Services
```

**DC (Domain Component)**: Represents parts of the domain name, used to define the base of your directory tree.

```
dc: example
dc: com
```

### Object Classes and Attributes

Every LDAP entry belongs to one or more object classes that define what attributes the entry can or must have:

- **inetOrgPerson**: For user accounts (includes uid, cn, sn, mail, etc.)
- **organizationalUnit**: For organizational containers
- **posixAccount**: For Unix/Linux user accounts (includes uidNumber, gidNumber, homeDirectory)
- **posixGroup**: For Unix/Linux groups
- **groupOfNames**: For generic groups with member attributes

### Example Directory Structure

```
dc=example,dc=com (root)
├── ou=People
│   ├── uid=jdoe
│   ├── uid=asmith
│   └── uid=bwilson
├── ou=Groups
│   ├── cn=developers
│   ├── cn=admins
│   └── cn=users
└── ou=Services
    └── cn=ldapbind
```

## Installing OpenLDAP

### Prerequisites

Update your system packages before installation:

```bash
sudo apt update
sudo apt upgrade -y
```

Ensure your server has a proper hostname configured:

```bash
sudo hostnamectl set-hostname ldap.example.com
```

Edit `/etc/hosts` to include your server's hostname:

```bash
sudo nano /etc/hosts
```

Add:

```
192.168.1.10    ldap.example.com    ldap
```

### Installing slapd and ldap-utils

Install the OpenLDAP server daemon (slapd) and client utilities:

```bash
sudo apt install slapd ldap-utils -y
```

During installation, you'll be prompted to set an administrator password. Choose a strong password and remember it for later use.

### Verifying the Installation

Check that slapd is running:

```bash
sudo systemctl status slapd
```

Verify the installation by querying the root DSE:

```bash
ldapsearch -x -H ldap://localhost -b "" -s base "(objectclass=*)" namingContexts
```

You should see output similar to:

```
# extended LDIF
#
# LDAPv3
# base <> with scope baseObject
# filter: (objectclass=*)
# requesting: namingContexts
#

#
dn:
namingContexts: dc=nodename,dc=com

# search result
search: 2
result: 0 Success
```

## Initial Configuration

### Using dpkg-reconfigure

The most straightforward way to configure OpenLDAP is using the `dpkg-reconfigure` tool:

```bash
sudo dpkg-reconfigure slapd
```

You'll be presented with several configuration prompts:

1. **Omit OpenLDAP server configuration?**: Select **No**

2. **DNS domain name**: Enter your domain (e.g., `example.com`). This becomes your base DN (`dc=example,dc=com`).

3. **Organization name**: Enter your organization name (e.g., `Example Organization`)

4. **Administrator password**: Enter a strong password for the admin account

5. **Confirm password**: Re-enter the password

6. **Database backend**: Select **MDB** (recommended for modern installations)

7. **Remove database when slapd is purged?**: Select **No** (to preserve data)

8. **Move old database?**: Select **Yes**

### Verifying the Configuration

After reconfiguration, verify your base DN:

```bash
sudo slapcat
```

You should see your directory base entry:

```ldif
dn: dc=example,dc=com
objectClass: top
objectClass: dcObject
objectClass: organization
o: Example Organization
dc: example
structuralObjectClass: organization
```

### Checking the Admin Account

Test the admin account authentication:

```bash
ldapwhoami -x -D "cn=admin,dc=example,dc=com" -W
```

Enter your admin password when prompted. You should see:

```
dn:cn=admin,dc=example,dc=com
```

## Adding Organizational Units and Users

### Creating Organizational Units

First, create an LDIF file for your organizational units:

```bash
nano base_structure.ldif
```

Add the following content:

```ldif
# People OU
dn: ou=People,dc=example,dc=com
objectClass: organizationalUnit
ou: People
description: Container for user accounts

# Groups OU
dn: ou=Groups,dc=example,dc=com
objectClass: organizationalUnit
ou: Groups
description: Container for groups

# Services OU
dn: ou=Services,dc=example,dc=com
objectClass: organizationalUnit
ou: Services
description: Container for service accounts
```

Add the organizational units to the directory:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f base_structure.ldif
```

### Creating User Accounts

Create an LDIF file for a new user:

```bash
nano user_jdoe.ldif
```

```ldif
dn: uid=jdoe,ou=People,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: jdoe
cn: John Doe
sn: Doe
givenName: John
displayName: John Doe
mail: jdoe@example.com
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/jdoe
loginShell: /bin/bash
userPassword: {SSHA}hashedpassword
```

To generate a secure password hash:

```bash
slappasswd
```

Enter the desired password twice, and it will output an SSHA hash like `{SSHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=`.

Replace `{SSHA}hashedpassword` with the generated hash and add the user:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f user_jdoe.ldif
```

### Creating Groups

Create a group LDIF file:

```bash
nano group_developers.ldif
```

```ldif
dn: cn=developers,ou=Groups,dc=example,dc=com
objectClass: posixGroup
objectClass: top
cn: developers
gidNumber: 10001
memberUid: jdoe
description: Development team group
```

Add the group:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f group_developers.ldif
```

### Verifying Entries

Search for all entries under People:

```bash
ldapsearch -x -D "cn=admin,dc=example,dc=com" -W -b "ou=People,dc=example,dc=com" "(objectClass=*)"
```

Search for a specific user:

```bash
ldapsearch -x -D "cn=admin,dc=example,dc=com" -W -b "dc=example,dc=com" "(uid=jdoe)"
```

## LDIF File Format

### Understanding LDIF

LDIF (LDAP Data Interchange Format) is a standard text format for representing LDAP directory content and update operations. Understanding LDIF is crucial for managing your OpenLDAP server.

### LDIF Structure

Basic LDIF entry structure:

```ldif
# Comment lines start with #
dn: distinguished_name
objectClass: class1
objectClass: class2
attribute1: value1
attribute2: value2
```

Key rules:
- Each entry starts with `dn:` (distinguished name)
- Entries are separated by blank lines
- Attribute names are case-insensitive
- Long lines can be wrapped by starting continuation lines with a single space
- Binary data is base64 encoded with `::` instead of `:`

### Using ldapadd

Add new entries to the directory:

```bash
# Add from file
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f entries.ldif

# Add with verbose output
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -v -f entries.ldif

# Add without prompting (password in environment)
LDAPBINDPW="password" ldapadd -x -D "cn=admin,dc=example,dc=com" -w "$LDAPBINDPW" -f entries.ldif
```

### Using ldapmodify

Modify existing entries using changetype operations:

**Modifying Attributes:**

```bash
nano modify_user.ldif
```

```ldif
dn: uid=jdoe,ou=People,dc=example,dc=com
changetype: modify
replace: mail
mail: john.doe@example.com
-
add: telephoneNumber
telephoneNumber: +1-555-0123
-
delete: description
```

Apply the modifications:

```bash
ldapmodify -x -D "cn=admin,dc=example,dc=com" -W -f modify_user.ldif
```

**Adding New Entry with ldapmodify:**

```ldif
dn: uid=asmith,ou=People,dc=example,dc=com
changetype: add
objectClass: inetOrgPerson
objectClass: posixAccount
uid: asmith
cn: Alice Smith
sn: Smith
uidNumber: 10002
gidNumber: 10001
homeDirectory: /home/asmith
```

**Deleting an Entry:**

```ldif
dn: uid=olduser,ou=People,dc=example,dc=com
changetype: delete
```

**Renaming an Entry (ModRDN):**

```ldif
dn: uid=jdoe,ou=People,dc=example,dc=com
changetype: modrdn
newrdn: uid=johndoe
deleteoldrdn: 1
```

### Using ldapdelete

Delete entries from the directory:

```bash
# Delete single entry
ldapdelete -x -D "cn=admin,dc=example,dc=com" -W "uid=olduser,ou=People,dc=example,dc=com"

# Delete multiple entries from file
ldapdelete -x -D "cn=admin,dc=example,dc=com" -W -f delete_list.txt

# Recursive delete (subtree)
ldapdelete -x -D "cn=admin,dc=example,dc=com" -W -r "ou=OldDepartment,dc=example,dc=com"
```

### Using ldapsearch

Query the directory:

```bash
# Search all entries
ldapsearch -x -b "dc=example,dc=com" "(objectClass=*)"

# Search for specific user
ldapsearch -x -b "dc=example,dc=com" "(uid=jdoe)"

# Search with specific attributes
ldapsearch -x -b "dc=example,dc=com" "(uid=jdoe)" cn mail uidNumber

# Search with filter
ldapsearch -x -b "ou=People,dc=example,dc=com" "(&(objectClass=posixAccount)(uidNumber>=10000))"

# Output in LDIF format
ldapsearch -x -b "dc=example,dc=com" -LLL "(uid=jdoe)"
```

## TLS/SSL Configuration

Securing your LDAP communications with TLS is critical for protecting sensitive authentication data.

### Generating SSL Certificates

For production, use certificates from a trusted CA. For testing, create self-signed certificates:

```bash
# Create directory for certificates
sudo mkdir -p /etc/ldap/ssl
cd /etc/ldap/ssl

# Generate private key
sudo openssl genrsa -out ldap.key 4096

# Generate certificate signing request
sudo openssl req -new -key ldap.key -out ldap.csr \
    -subj "/C=US/ST=State/L=City/O=Example Organization/CN=ldap.example.com"

# Generate self-signed certificate (valid for 365 days)
sudo openssl x509 -req -days 365 -in ldap.csr -signkey ldap.key -out ldap.crt

# Set proper permissions
sudo chown openldap:openldap /etc/ldap/ssl/*
sudo chmod 600 /etc/ldap/ssl/ldap.key
sudo chmod 644 /etc/ldap/ssl/ldap.crt
```

### Configuring OpenLDAP for TLS

Create an LDIF file to configure TLS:

```bash
nano tls_config.ldif
```

```ldif
dn: cn=config
changetype: modify
add: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ldap/ssl/ldap.crt
-
add: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/ssl/ldap.crt
-
add: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/ssl/ldap.key
```

Apply the TLS configuration:

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f tls_config.ldif
```

### Enabling LDAPS

Edit the slapd defaults file:

```bash
sudo nano /etc/default/slapd
```

Modify the SLAPD_SERVICES line to include LDAPS:

```
SLAPD_SERVICES="ldap:/// ldapi:/// ldaps:///"
```

Restart slapd:

```bash
sudo systemctl restart slapd
```

### Configuring Client TLS Settings

Edit the LDAP client configuration:

```bash
sudo nano /etc/ldap/ldap.conf
```

Add TLS settings:

```
BASE    dc=example,dc=com
URI     ldaps://ldap.example.com

TLS_CACERT      /etc/ldap/ssl/ldap.crt
TLS_REQCERT     demand
```

For self-signed certificates during testing, you can use:

```
TLS_REQCERT     allow
```

### Testing TLS Connection

Test LDAPS connection:

```bash
ldapsearch -x -H ldaps://ldap.example.com -b "dc=example,dc=com" "(objectClass=*)"
```

Test StartTLS on standard LDAP port:

```bash
ldapsearch -x -H ldap://ldap.example.com -ZZ -b "dc=example,dc=com" "(objectClass=*)"
```

### Enforcing TLS

To require TLS for all connections, add this configuration:

```bash
nano enforce_tls.ldif
```

```ldif
dn: cn=config
changetype: modify
add: olcSecurity
olcSecurity: tls=1
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f enforce_tls.ldif
```

## Access Control Lists (ACLs)

ACLs define who can access what data in your LDAP directory. Proper ACL configuration is essential for security.

### Understanding ACL Syntax

OpenLDAP ACL syntax:

```
olcAccess: {n}to <what> by <who> <access> [by <who> <access> ...]
```

**What (Target):**
- `*` - all entries
- `dn.base="..."` - specific entry
- `dn.subtree="..."` - entry and all children
- `attrs=attribute1,attribute2` - specific attributes

**Who (Subject):**
- `*` - anyone
- `anonymous` - unauthenticated users
- `users` - authenticated users
- `self` - the entry itself
- `dn.base="..."` - specific DN
- `group.exact="..."` - members of a group

**Access Levels:**
- `none` - no access
- `disclose` - allow error disclosure
- `auth` - authentication only
- `compare` - compare values
- `search` - search for entries
- `read` - read entries
- `write` - modify entries
- `manage` - full control

### Viewing Current ACLs

```bash
sudo ldapsearch -Y EXTERNAL -H ldapi:/// -b "cn=config" "(objectClass=olcDatabaseConfig)" olcAccess
```

### Common ACL Examples

Create an ACL configuration file:

```bash
nano acl_config.ldif
```

**Example 1: Basic ACL Structure**

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcAccess
olcAccess: {0}to attrs=userPassword
  by self write
  by anonymous auth
  by * none
olcAccess: {1}to attrs=shadowLastChange
  by self write
  by * read
olcAccess: {2}to dn.subtree="ou=People,dc=example,dc=com"
  by dn.exact="cn=admin,dc=example,dc=com" write
  by self read
  by users read
  by * none
olcAccess: {3}to *
  by dn.exact="cn=admin,dc=example,dc=com" write
  by users read
  by * none
```

**Example 2: Service Account Access**

```ldif
# Allow a bind account to read user entries for authentication
olcAccess: {2}to dn.subtree="ou=People,dc=example,dc=com"
  by dn.exact="cn=ldapbind,ou=Services,dc=example,dc=com" read
  by self write
  by * none
```

**Example 3: Group-Based Access**

```ldif
# Allow admins group to manage all entries
olcAccess: {1}to *
  by group.exact="cn=admins,ou=Groups,dc=example,dc=com" write
  by users read
  by * none
```

Apply ACL changes:

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f acl_config.ldif
```

### Creating a Bind Account

For applications that need to query LDAP, create a dedicated bind account:

```bash
nano bind_account.ldif
```

```ldif
dn: cn=ldapbind,ou=Services,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: ldapbind
description: LDAP bind account for applications
userPassword: {SSHA}generated_hash_here
```

Add the bind account:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f bind_account.ldif
```

## Setting Up LDAP Clients

### Installing Client Packages

On client machines, install the LDAP client utilities:

```bash
sudo apt install ldap-utils libpam-ldapd libnss-ldapd nslcd -y
```

### Configuring ldap.conf

Edit the client configuration:

```bash
sudo nano /etc/ldap/ldap.conf
```

```
BASE    dc=example,dc=com
URI     ldaps://ldap.example.com

TLS_CACERT      /etc/ldap/ssl/ca-cert.pem
TLS_REQCERT     demand

BINDDN  cn=ldapbind,ou=Services,dc=example,dc=com
```

### Configuring nslcd

Edit the nslcd configuration:

```bash
sudo nano /etc/nslcd.conf
```

```
# The user and group nslcd should run as
uid nslcd
gid nslcd

# The LDAP server URI
uri ldaps://ldap.example.com

# The search base
base dc=example,dc=com

# User and group search bases
base passwd ou=People,dc=example,dc=com
base group ou=Groups,dc=example,dc=com
base shadow ou=People,dc=example,dc=com

# Bind credentials (use a read-only bind account)
binddn cn=ldapbind,ou=Services,dc=example,dc=com
bindpw your_bind_password

# TLS settings
ssl on
tls_reqcert demand
tls_cacertfile /etc/ldap/ssl/ca-cert.pem

# User mapping
filter passwd (objectClass=posixAccount)
map passwd uid uid
map passwd uidNumber uidNumber
map passwd gidNumber gidNumber
map passwd homeDirectory homeDirectory
map passwd loginShell loginShell
map passwd gecos displayName

# Group mapping
filter group (objectClass=posixGroup)
map group cn cn
map group gidNumber gidNumber
map group memberUid memberUid
```

Restart nslcd:

```bash
sudo systemctl restart nslcd
sudo systemctl enable nslcd
```

### Testing Client Connection

Test user lookup:

```bash
getent passwd jdoe
```

Test group lookup:

```bash
getent group developers
```

Test LDAP search from client:

```bash
ldapsearch -x -H ldaps://ldap.example.com -b "ou=People,dc=example,dc=com" "(uid=jdoe)"
```

## PAM and NSS Integration

Integrating OpenLDAP with PAM (Pluggable Authentication Modules) and NSS (Name Service Switch) enables system-wide authentication against your directory.

### Configuring NSS

Edit the NSS configuration:

```bash
sudo nano /etc/nsswitch.conf
```

Modify the following lines to include LDAP:

```
passwd:         files ldap
group:          files ldap
shadow:         files ldap
```

### Configuring PAM

#### Common Authentication Configuration

Edit PAM common-auth:

```bash
sudo nano /etc/pam.d/common-auth
```

```
auth    [success=2 default=ignore]      pam_unix.so nullok_secure
auth    [success=1 default=ignore]      pam_ldap.so use_first_pass
auth    requisite                       pam_deny.so
auth    required                        pam_permit.so
auth    optional                        pam_cap.so
```

#### Common Account Configuration

Edit PAM common-account:

```bash
sudo nano /etc/pam.d/common-account
```

```
account [success=2 new_authtok_reqd=done default=ignore]    pam_unix.so
account [success=1 default=ignore]                          pam_ldap.so
account requisite                                           pam_deny.so
account required                                            pam_permit.so
```

#### Common Password Configuration

Edit PAM common-password:

```bash
sudo nano /etc/pam.d/common-password
```

```
password    [success=2 default=ignore]      pam_unix.so obscure sha512
password    [success=1 user_unknown=ignore default=die]    pam_ldap.so use_authtok try_first_pass
password    requisite                       pam_deny.so
password    required                        pam_permit.so
```

#### Common Session Configuration

Edit PAM common-session:

```bash
sudo nano /etc/pam.d/common-session
```

```
session [default=1]         pam_permit.so
session requisite           pam_deny.so
session required            pam_permit.so
session optional            pam_umask.so
session required            pam_unix.so
session optional            pam_ldap.so
session required            pam_mkhomedir.so skel=/etc/skel umask=077
```

The `pam_mkhomedir.so` line automatically creates home directories for LDAP users on first login.

### Using pam-auth-update

Ubuntu provides a convenient tool for PAM configuration:

```bash
sudo pam-auth-update
```

Select the authentication sources you want to enable:
- Unix authentication
- LDAP Authentication
- Create home directory on login

### Testing PAM Authentication

Test SSH login with an LDAP user:

```bash
ssh jdoe@localhost
```

Test user switching:

```bash
su - jdoe
```

Verify user information:

```bash
id jdoe
```

### Restricting LDAP Login to Specific Groups

To limit LDAP authentication to specific groups, edit nslcd.conf:

```bash
sudo nano /etc/nslcd.conf
```

Add:

```
# Only allow users in the 'linuxusers' group
pam_authz_search (&(objectClass=posixAccount)(uid=$username)(|(memberOf=cn=linuxusers,ou=Groups,dc=example,dc=com)(memberOf=cn=admins,ou=Groups,dc=example,dc=com)))
```

Restart nslcd:

```bash
sudo systemctl restart nslcd
```

## phpLDAPadmin Web Interface

phpLDAPadmin provides a graphical web interface for managing your OpenLDAP directory.

### Installing phpLDAPadmin

```bash
sudo apt install phpldapadmin -y
```

### Configuring phpLDAPadmin

Edit the configuration file:

```bash
sudo nano /etc/phpldapadmin/config.php
```

Find and modify these settings:

```php
// Server name displayed in the interface
$servers->setValue('server','name','Example LDAP Server');

// LDAP server host
$servers->setValue('server','host','ldap.example.com');

// Base DN
$servers->setValue('server','base',array('dc=example,dc=com'));

// Bind DN for login
$servers->setValue('login','bind_id','cn=admin,dc=example,dc=com');

// Hide template warnings
$config->custom->appearance['hide_template_warning'] = true;

// Use uidNumber auto-increment
$servers->setValue('auto_number','mechanism','search');
$servers->setValue('auto_number','search_base','ou=People,dc=example,dc=com');
$servers->setValue('auto_number','min',array('uidNumber' => 10000, 'gidNumber' => 10000));
```

### Configuring Apache

Enable the phpLDAPadmin site:

```bash
sudo nano /etc/apache2/conf-available/phpldapadmin.conf
```

```apache
Alias /phpldapadmin /usr/share/phpldapadmin/htdocs

<Directory /usr/share/phpldapadmin/htdocs>
    DirectoryIndex index.php
    Options +FollowSymLinks
    AllowOverride All

    <IfModule mod_authz_core.c>
        Require all granted
    </IfModule>
</Directory>
```

Enable the configuration and restart Apache:

```bash
sudo a2enconf phpldapadmin
sudo systemctl restart apache2
```

### Securing phpLDAPadmin

For production environments, add authentication and SSL:

```bash
sudo nano /etc/apache2/conf-available/phpldapadmin.conf
```

```apache
Alias /phpldapadmin /usr/share/phpldapadmin/htdocs

<Directory /usr/share/phpldapadmin/htdocs>
    DirectoryIndex index.php
    Options +FollowSymLinks
    AllowOverride All

    # Require HTTPS
    <IfModule mod_ssl.c>
        SSLRequireSSL
    </IfModule>

    # IP-based restriction (optional)
    <IfModule mod_authz_core.c>
        Require ip 192.168.1.0/24
    </IfModule>
</Directory>
```

### Accessing phpLDAPadmin

Open your web browser and navigate to:

```
https://ldap.example.com/phpldapadmin
```

Log in with:
- Login DN: `cn=admin,dc=example,dc=com`
- Password: Your admin password

### Common phpLDAPadmin Tasks

**Creating a User:**
1. Navigate to `ou=People`
2. Click "Create a child entry"
3. Select "Generic: User Account"
4. Fill in the required fields
5. Click "Create Object" then "Commit"

**Creating a Group:**
1. Navigate to `ou=Groups`
2. Click "Create a child entry"
3. Select "Generic: Posix Group"
4. Fill in group details
5. Add members as needed
6. Click "Create Object" then "Commit"

## Backup and Restore Procedures

Regular backups are essential for disaster recovery. OpenLDAP provides several methods for backing up your directory.

### Using slapcat for Backup

The `slapcat` utility exports the directory to LDIF format:

```bash
# Backup the main database
sudo slapcat -n 1 -l /backup/ldap-backup-$(date +%Y%m%d).ldif

# Backup the configuration database
sudo slapcat -n 0 -l /backup/ldap-config-backup-$(date +%Y%m%d).ldif

# Backup with specific base DN
sudo slapcat -b "dc=example,dc=com" -l /backup/ldap-data.ldif
```

### Automated Backup Script

Create a backup script:

```bash
sudo nano /usr/local/bin/ldap-backup.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backup/ldap"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Stop slapd for consistent backup
sudo systemctl stop slapd

# Backup data
sudo slapcat -n 1 -l ${BACKUP_DIR}/ldap-data-${DATE}.ldif

# Backup configuration
sudo slapcat -n 0 -l ${BACKUP_DIR}/ldap-config-${DATE}.ldif

# Start slapd
sudo systemctl start slapd

# Compress backups
gzip ${BACKUP_DIR}/ldap-data-${DATE}.ldif
gzip ${BACKUP_DIR}/ldap-config-${DATE}.ldif

# Remove old backups
find ${BACKUP_DIR} -name "*.ldif.gz" -mtime +${RETENTION_DAYS} -delete

# Log backup completion
echo "$(date): LDAP backup completed successfully" >> /var/log/ldap-backup.log
```

Make the script executable and schedule it:

```bash
sudo chmod +x /usr/local/bin/ldap-backup.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
```

Add:

```
0 2 * * * /usr/local/bin/ldap-backup.sh
```

### Online Backup Using ldapsearch

For online backups without stopping the service:

```bash
ldapsearch -x -D "cn=admin,dc=example,dc=com" -W -b "dc=example,dc=com" -LLL "(objectClass=*)" > /backup/ldap-online-backup.ldif
```

### Restoring from Backup

**Full Restore:**

```bash
# Stop slapd
sudo systemctl stop slapd

# Remove existing database
sudo rm -rf /var/lib/ldap/*

# Restore configuration (if needed)
sudo slapadd -n 0 -F /etc/ldap/slapd.d -l /backup/ldap-config-backup.ldif

# Restore data
sudo slapadd -n 1 -l /backup/ldap-data-backup.ldif

# Fix permissions
sudo chown -R openldap:openldap /var/lib/ldap

# Start slapd
sudo systemctl start slapd
```

**Selective Restore:**

To restore specific entries, use ldapadd:

```bash
# Extract specific entries from backup
grep -A 100 "dn: uid=jdoe" /backup/ldap-backup.ldif > /tmp/restore-jdoe.ldif

# Add entries back
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f /tmp/restore-jdoe.ldif
```

### Replication for High Availability

For production environments, consider setting up replication:

```bash
nano replication.ldif
```

```ldif
# Provider (Master) configuration
dn: cn=config
changetype: modify
add: olcServerID
olcServerID: 1

dn: olcOverlay=syncprov,olcDatabase={1}mdb,cn=config
changetype: add
objectClass: olcOverlayConfig
objectClass: olcSyncProvConfig
olcOverlay: syncprov
olcSpCheckpoint: 100 10
olcSpSessionlog: 100
```

## Troubleshooting Common Issues

### Connection Issues

**Problem: Cannot connect to LDAP server**

```bash
# Check if slapd is running
sudo systemctl status slapd

# Check listening ports
sudo netstat -tlnp | grep slapd

# Test connectivity
ldapsearch -x -H ldap://localhost -b "" -s base

# Check firewall
sudo ufw status
sudo ufw allow 389/tcp
sudo ufw allow 636/tcp
```

**Problem: TLS/SSL connection failures**

```bash
# Test TLS connection with debug output
ldapsearch -x -H ldaps://ldap.example.com -d 1 -b "dc=example,dc=com"

# Check certificate validity
openssl s_client -connect ldap.example.com:636

# Verify certificate permissions
ls -la /etc/ldap/ssl/
```

### Authentication Issues

**Problem: Cannot bind as admin**

```bash
# Reset admin password
sudo systemctl stop slapd
sudo slappasswd > /tmp/newpassword
# Edit /etc/ldap/slapd.d/cn=config/olcDatabase={1}mdb.ldif manually
# Replace olcRootPW value with new hash
sudo chown openldap:openldap /etc/ldap/slapd.d/cn=config/olcDatabase={1}mdb.ldif
sudo systemctl start slapd
```

**Problem: User cannot authenticate**

```bash
# Check user entry
ldapsearch -x -D "cn=admin,dc=example,dc=com" -W -b "dc=example,dc=com" "(uid=jdoe)" userPassword

# Test user authentication
ldapwhoami -x -D "uid=jdoe,ou=People,dc=example,dc=com" -W

# Check password policy (if enabled)
ldapsearch -x -D "cn=admin,dc=example,dc=com" -W -b "dc=example,dc=com" "(uid=jdoe)" pwdAccountLockedTime pwdFailureTime
```

### Database Issues

**Problem: Database corruption**

```bash
# Stop slapd
sudo systemctl stop slapd

# Check database integrity
sudo slapcat -n 1 > /dev/null
echo $?  # 0 means success

# If corrupted, try recovery
sudo db_recover -h /var/lib/ldap

# Rebuild database from backup
sudo rm -rf /var/lib/ldap/*
sudo slapadd -n 1 -l /backup/ldap-backup.ldif
sudo chown -R openldap:openldap /var/lib/ldap

# Start slapd
sudo systemctl start slapd
```

### Log Analysis

**Enable debug logging:**

```bash
sudo nano /etc/default/slapd
```

Add:

```
SLAPD_OPTIONS="-d 256"
```

**Check logs:**

```bash
# System logs
sudo journalctl -u slapd -f

# Traditional syslog
sudo tail -f /var/log/syslog | grep slapd

# Debug specific operations
ldapsearch -x -d 1 -H ldap://localhost -b "dc=example,dc=com" "(uid=jdoe)"
```

### Common Error Messages

**"ldap_bind: Invalid credentials (49)"**
- Wrong password or bind DN
- Check for typos in DN
- Verify password hash is correct

**"ldap_bind: Can't contact LDAP server (-1)"**
- slapd not running
- Firewall blocking connection
- Wrong hostname/IP or port

**"ldap_add: Already exists (68)"**
- Entry with same DN already exists
- Use ldapmodify instead of ldapadd

**"ldap_add: No such object (32)"**
- Parent entry doesn't exist
- Create parent OUs first

**"ldap_add: Insufficient access (50)"**
- ACL preventing operation
- Check ACL configuration
- Verify bind account permissions

### Performance Tuning

**Optimize indexes:**

```bash
nano indexing.ldif
```

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcDbIndex
olcDbIndex: cn pres,eq
olcDbIndex: uid pres,eq
olcDbIndex: uidNumber eq
olcDbIndex: gidNumber eq
olcDbIndex: memberUid eq
olcDbIndex: mail pres,eq,sub
olcDbIndex: objectClass eq
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f indexing.ldif
```

**Increase cache size:**

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcDbMaxSize
olcDbMaxSize: 1073741824
```

## Conclusion

You now have a comprehensive understanding of how to install, configure, and manage OpenLDAP on Ubuntu. From basic concepts like DNs and OUs to advanced topics like TLS encryption, ACLs, and PAM integration, this guide covers the essential aspects of running a production LDAP directory service.

Key takeaways:
- Always use TLS/SSL encryption for LDAP communications
- Implement proper ACLs to secure your directory data
- Create dedicated bind accounts for applications
- Regularly backup your directory using slapcat
- Monitor your LDAP server for issues and performance problems

For reliable monitoring of your OpenLDAP infrastructure, consider using [OneUptime](https://oneuptime.com). OneUptime provides comprehensive monitoring capabilities that can track your LDAP server's availability, response times, and authentication success rates. With OneUptime, you can set up alerts for failed authentications, connection issues, or replication delays, ensuring your directory services remain healthy and available for your users. OneUptime's dashboard gives you visibility into your entire authentication infrastructure, helping you identify and resolve issues before they impact your organization.
