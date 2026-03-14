# How to Configure autofs with LDAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Autofs, LDAP, NFS, Networking

Description: Configure autofs to use LDAP as the automount map source on Ubuntu, enabling centrally managed auto-mount configurations for NFS home directories and shared storage.

---

Static automount maps stored in files like `/etc/auto.master` and `/etc/auto.home` work fine for small setups, but as your infrastructure grows, managing these files on dozens of servers becomes tedious and error-prone. LDAP provides centralized storage for automount maps, so a change in LDAP takes effect on every server automatically.

## How autofs with LDAP Works

autofs normally reads its maps from local text files. With LDAP integration, it queries an LDAP server for the same information. The LDAP directory stores automount map data using the `automount` object class, which is part of the `autofs` LDAP schema.

When autofs needs to know how to mount `/home/alice`, it looks up the `automount` entry in LDAP for the `auto.home` map, finds Alice's entry pointing to an NFS server, and mounts it on access.

## Prerequisites

You need:
- A working LDAP directory (OpenLDAP or Active Directory)
- The autofs LDAP schema loaded in LDAP
- NFS servers configured to export the file systems

```bash
# Install autofs and LDAP client libraries
sudo apt update
sudo apt install -y autofs autofs-ldap ldap-utils

# Verify installation
autofs --version
```

## Loading the autofs LDAP Schema

If you're using OpenLDAP and it doesn't have the autofs schema, load it first. Ubuntu's OpenLDAP installation typically includes it:

```bash
# On the LDAP server, check if the schema is already loaded
ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=schema,cn=config \
  "(cn=*autofs*)" dn

# If not present, find and load the schema
find /usr/share/doc/autofs -name "*.ldif" 2>/dev/null
find /etc/ldap/schema -name "*autofs*" 2>/dev/null

# Load the nisMap schema which includes autofs object classes
# On Ubuntu with OpenLDAP:
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /etc/ldap/schema/nis.ldif
```

## Creating Automount Entries in LDAP

Automount maps in LDAP follow a specific structure. The `automountMapName` contains the map name, and entries within it have the mount key and options.

Here's an LDIF file to create a basic automount configuration:

```ldif
# automount-maps.ldif
# Base OU for automount information
dn: ou=auto.master,dc=example,dc=com
objectClass: top
objectClass: automountMap
ou: auto.master

# Master map entry for /home
dn: cn=/home,ou=auto.master,dc=example,dc=com
objectClass: top
objectClass: automount
cn: /home
automountInformation: ldap:ou=auto.home,dc=example,dc=com --timeout=600

# Master map entry for /shared
dn: cn=/shared,ou=auto.master,dc=example,dc=com
objectClass: top
objectClass: automount
cn: /shared
automountInformation: ldap:ou=auto.shared,dc=example,dc=com

# Home directory map
dn: ou=auto.home,dc=example,dc=com
objectClass: top
objectClass: automountMap
ou: auto.home

# Individual home directory entries
dn: cn=alice,ou=auto.home,dc=example,dc=com
objectClass: top
objectClass: automount
cn: alice
automountInformation: -rw,soft,intr nfsserver.example.com:/home/alice

dn: cn=bob,ou=auto.home,dc=example,dc=com
objectClass: top
objectClass: automount
cn: bob
automountInformation: -rw,soft,intr nfsserver.example.com:/home/bob

# Wildcard entry (catches all unmapped users)
dn: cn=*,ou=auto.home,dc=example,dc=com
objectClass: top
objectClass: automount
cn: *
automountInformation: -rw,soft,intr nfsserver.example.com:/home/&

# Shared storage map
dn: ou=auto.shared,dc=example,dc=com
objectClass: top
objectClass: automountMap
ou: auto.shared

dn: cn=projects,ou=auto.shared,dc=example,dc=com
objectClass: top
objectClass: automount
cn: projects
automountInformation: -ro,soft nfsserver.example.com:/shared/projects

dn: cn=software,ou=auto.shared,dc=example,dc=com
objectClass: top
objectClass: automount
cn: software
automountInformation: -ro,soft nfsserver.example.com:/shared/software
```

Load this into LDAP:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W \
  -f automount-maps.ldif

# Verify the entries were created
ldapsearch -x -b "ou=auto.home,dc=example,dc=com" "(objectClass=automount)"
```

## Configuring autofs to Use LDAP

The main configuration file for autofs LDAP integration is `/etc/autofs_ldap_auth.conf` for authentication settings and `/etc/default/autofs` or `/etc/autofs.conf` for the main settings:

```bash
sudo nano /etc/autofs.conf
```

Key settings in `/etc/autofs.conf`:

```ini
# /etc/autofs.conf

[ autofs ]
# Use LDAP as the map source
map_type = ldap

# LDAP server URI
ldap_uri = ldap://ldap.example.com

# Search base for automount maps
search_base = dc=example,dc=com

# Authentication method (none for anonymous, simple for password)
auth_conf_file = /etc/autofs_ldap_auth.conf

# Log level (0=minimal, 7=debug)
logging = notice

# How long to wait for LDAP responses
ldap_timeout = 8

# Network timeout
ldap_network_timeout = 8

# Mount timeout (unmount after idle)
timeout = 300

# Negative cache timeout
negative_timeout = 60

[ amd ]
# AMD compatibility settings if needed
```

If your LDAP server requires authentication, configure `/etc/autofs_ldap_auth.conf`:

```xml
<!-- /etc/autofs_ldap_auth.conf -->
<?xml version="1.0" ?>
<autofs_ldap_sasl_conf
     usetls="no"
     tlsrequired="no"
     authrequired="no"
     authtype="SIMPLE"
     user="cn=autofs-reader,dc=example,dc=com"
     secret="autofs-reader-password"
/>
```

Restrict access to this file since it contains credentials:

```bash
sudo chown root:root /etc/autofs_ldap_auth.conf
sudo chmod 600 /etc/autofs_ldap_auth.conf
```

## Updating /etc/auto.master for LDAP

Even with LDAP integration, the master map can reference LDAP directly:

```bash
sudo nano /etc/auto.master
```

```bash
# /etc/auto.master
# Point to LDAP for the main maps
# The LDAP source replaces file-based maps

# Use LDAP map for /home
/home ldap:ou=auto.home,dc=example,dc=com

# Use LDAP map for /shared
/shared ldap:ou=auto.shared,dc=example,dc=com

# You can mix LDAP and file-based maps
# /backup /etc/auto.backup  --timeout=60

# Include the LDAP master map (reads all mounts from LDAP)
+auto.master
```

Alternatively, configure autofs to use the LDAP master map entirely:

```bash
# In /etc/autofs.conf or /etc/default/autofs
# Set the master map source to LDAP
# MASTER_MAP_NAME="auto.master"
# The LDAP lookup will find ou=auto.master,dc=example,dc=com
```

## Starting and Testing

```bash
# Restart autofs to load new configuration
sudo systemctl restart autofs

# Check for errors in the service log
sudo systemctl status autofs
journalctl -u autofs -n 50

# Enable debug logging temporarily
sudo systemctl stop autofs
sudo automount -f -d 2>&1 | head -100
# Press Ctrl+C after reviewing output

# Test by accessing an auto-mounted path
ls /home/alice/
# This should trigger a mount from nfsserver:/home/alice

# Verify the mount happened
mount | grep autofs
df -h /home/alice

# After the timeout, it should unmount automatically
# Check /proc/mounts to see current mounts
cat /proc/mounts | grep autofs
```

## Debugging LDAP Lookup Issues

```bash
# Test LDAP connectivity and automount schema
ldapsearch -x -H ldap://ldap.example.com \
  -b "ou=auto.home,dc=example,dc=com" \
  "(objectClass=automount)"

# Check if autofs can reach the LDAP server
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  "(ou=auto.home)"

# Enable verbose LDAP debugging in autofs
echo 'logging = debug' | sudo tee -a /etc/autofs.conf
sudo systemctl restart autofs
journalctl -u autofs -f

# Common issue: schema not loaded
ldapsearch -x -b "cn=subschema" -s base "(objectClass=subschema)" \
  automountMap automount

# If automountMap is not in the schema, load nis.ldif
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /etc/ldap/schema/nis.ldif
```

## Updating Mounts Centrally

The real payoff of LDAP-backed autofs maps is centralized updates. When you add a new NFS server or reorganize storage:

```bash
# Add a new mount point in LDAP - no server changes needed
ldapadd -x -D "cn=admin,dc=example,dc=com" -W << 'EOF'
dn: cn=new-project,ou=auto.shared,dc=example,dc=com
objectClass: top
objectClass: automount
cn: new-project
automountInformation: -rw,soft nfsserver2.example.com:/projects/new
EOF

# autofs will see the new entry on next access
# No restart needed on any client server
ls /shared/new-project
```

LDAP-backed autofs is particularly valuable in environments with many servers and frequent changes to storage layout. The investment in setting up the LDAP schema pays back quickly when you're managing automounts at scale.
