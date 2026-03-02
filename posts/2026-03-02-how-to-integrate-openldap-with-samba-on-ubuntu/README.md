# How to Integrate OpenLDAP with Samba on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, Samba, Active Directory, File Sharing

Description: Integrate OpenLDAP with Samba on Ubuntu to enable centralized user management for Windows file sharing and authentication.

---

Samba and OpenLDAP are natural partners. Samba handles SMB file sharing and Windows compatibility, while OpenLDAP provides centralized user and group storage. When integrated, you have a single directory that stores both POSIX (Linux) and Windows (Samba) account attributes, meaning one user account works for Linux logins, SSH, and Windows file share access.

This guide covers configuring Samba to use OpenLDAP as its backend for a traditional member server setup (not the full Active Directory Domain Controller mode - that is covered separately with Samba's internal AD).

## Architecture

- OpenLDAP stores user accounts with both POSIX (`posixAccount`) and Samba (`sambaSamAccount`) attributes
- Samba queries LDAP for user authentication and account information
- Users log into Windows shares using credentials stored in LDAP

## Prerequisites

- Ubuntu 22.04 with OpenLDAP installed and running
- Base DN: `dc=example,dc=com`
- Samba installed (covered below)

## Installing Required Packages

```bash
sudo apt update
sudo apt install -y samba samba-doc smbldap-tools libnss-ldapd libpam-ldapd ldap-utils
```

The `smbldap-tools` package provides scripts for managing Samba users in LDAP.

## Extending the Schema for Samba

OpenLDAP needs the Samba schema to store Windows-specific account attributes:

```bash
# Check if the samba schema is already in the config
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "cn=schema,cn=config" "(cn=*samba*)"

# Add the Samba schema if not present
# The schema file location varies
ls /usr/share/doc/samba/examples/LDAP/

# Or find it
find /usr -name "samba.ldif" 2>/dev/null
find /usr -name "samba.schema" 2>/dev/null
```

Convert and load the schema if it is in `.schema` format:

```bash
# Convert schema to LDIF format
sudo sh -c "echo 'include /usr/share/doc/samba/examples/LDAP/samba.schema' > /tmp/samba-schema.conf"
mkdir -p /tmp/samba-schema-output
sudo slaptest -f /tmp/samba-schema.conf -F /tmp/samba-schema-output/

# Load the converted schema
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /tmp/samba-schema-output/cn=config/cn=schema/cn={1}samba.ldif
```

Alternatively, if a pre-built LDIF is available:

```bash
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /usr/share/doc/samba/examples/LDAP/samba.ldif
```

## Creating Samba-Specific LDAP Structure

Add the necessary LDAP entries for Samba:

```ldif
# Save as samba-structure.ldif
# Idmap entries for Samba
dn: ou=Idmap,dc=example,dc=com
objectClass: organizationalUnit
ou: Idmap

# Computers OU
dn: ou=Computers,dc=example,dc=com
objectClass: organizationalUnit
ou: Computers
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f samba-structure.ldif
```

## Configuring smbldap-tools

`smbldap-tools` needs to know about your LDAP and Samba setup:

```bash
# Get your Samba SID first (will use after Samba is configured)
# We will set this up after initial Samba config

# Configure smbldap.conf
sudo nano /etc/smbldap-tools/smbldap.conf
```

```ini
# Your LDAP server
slaveLDAP="ldap://localhost/"
masterLDAP="ldap://localhost/"

# Base DN
suffix="dc=example,dc=com"

# Search bases
usersdn="ou=People,dc=example,dc=com"
groupsdn="ou=Groups,dc=example,dc=com"
computersdn="ou=Computers,dc=example,dc=com"
idmapdn="ou=Idmap,dc=example,dc=com"

# UID/GID ranges for new accounts
userLoginShell="/bin/bash"
userHome="/home/%U"
userGecos="System User"
defaultUserGid="513"
defaultComputerGid="515"
uidStart="10000"
uidNumber="10000"
gidStart="10000"
gidNumber="10000"
```

```bash
# Configure credentials
sudo nano /etc/smbldap-tools/smbldap_bind.conf
```

```ini
slaveDN="cn=admin,dc=example,dc=com"
slavePw="YourAdminPassword"
masterDN="cn=admin,dc=example,dc=com"
masterPw="YourAdminPassword"
```

```bash
sudo chmod 600 /etc/smbldap-tools/smbldap_bind.conf
```

## Configuring Samba

Edit the Samba configuration:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   # Server identity
   workgroup = EXAMPLE
   server string = Example File Server
   server role = standalone server

   # Security - use LDAP for user database
   security = user
   passdb backend = ldapsam:ldap://localhost

   # LDAP settings
   ldap admin dn = cn=admin,dc=example,dc=com
   ldap suffix = dc=example,dc=com
   ldap user suffix = ou=People
   ldap group suffix = ou=Groups
   ldap machine suffix = ou=Computers
   ldap idmap suffix = ou=Idmap
   ldap ssl = start tls
   ldap passwd sync = yes

   # Logging
   log file = /var/log/samba/log.%m
   log level = 1

   # Map Windows groups to Unix groups
   idmap config * : backend = tdb
   idmap config * : range = 3000-7999

[Shared]
   comment = Shared Files
   path = /srv/samba/shared
   read only = no
   valid users = @devops
   create mask = 0664
   directory mask = 0775
```

Store the LDAP admin password in Samba's secrets:

```bash
sudo smbpasswd -w YourAdminPassword
```

### Generate the Samba SID

```bash
sudo net getlocalsid
# Note the SID: S-1-5-21-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX

# Set this SID in smbldap.conf
sudo nano /etc/smbldap-tools/smbldap.conf
# Set: SID="S-1-5-21-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX"
```

## Populating LDAP with Samba Defaults

```bash
# Initialize the LDAP tree with Samba default groups
sudo smbldap-populate

# If it fails because entries already exist, add -a flag
sudo smbldap-populate -a
```

This creates default groups like `Domain Admins`, `Domain Users`, `Domain Guests`.

## Adding a Samba User

Users need both POSIX and Samba attributes. Use `smbldap-useradd`:

```bash
# Add a Samba user
sudo smbldap-useradd -a -m -P jsmith

# -a  = add Samba account attributes
# -m  = create home directory
# -P  = prompt for password
```

Or add a Samba password to an existing POSIX user:

```bash
# Add Samba attributes to existing LDAP user
sudo smbldap-usermod -a jsmith

# Set Windows password
sudo smbpasswd -L jsmith
```

## Creating the Share Directory

```bash
sudo mkdir -p /srv/samba/shared
sudo chgrp devops /srv/samba/shared
sudo chmod 2775 /srv/samba/shared
```

## Starting and Testing Samba

```bash
# Check smb.conf syntax
sudo testparm

# Start Samba services
sudo systemctl enable smbd nmbd
sudo systemctl start smbd nmbd

# Test LDAP authentication in Samba context
sudo pdbedit -L
# Should list users from LDAP

# Test from a Windows client or Linux with smbclient
smbclient -L //localhost -U jsmith
```

## Firewall Configuration

```bash
sudo ufw allow from 192.168.1.0/24 to any port 445
sudo ufw allow from 192.168.1.0/24 to any port 139
sudo ufw allow from 192.168.1.0/24 to any port 137
```

## Troubleshooting

**"Failed to add entry for user"** - the Samba schema may not be loaded. Verify with `ldapsearch -Y EXTERNAL -H ldapi:/// -b "cn=schema,cn=config" "(cn=*samba*)"`.

**"NT_STATUS_NO_SUCH_USER"** - the user exists in POSIX LDAP but does not have Samba attributes. Run `smbldap-usermod -a username`.

**LDAP connection errors** - verify Samba can reach LDAP: `sudo smbclient -L localhost -U admin%Password` and check `/var/log/samba/log.smbd`.

**Password sync issues** - with `ldap passwd sync = yes`, changing a password via Samba should sync to LDAP. If it does not, check that `smbpasswd -w` was run with the correct admin password.

This integration gives you a centralized identity store that serves both Linux systems (via POSIX attributes) and Windows file sharing (via Samba attributes), simplifying account management across a mixed environment.
