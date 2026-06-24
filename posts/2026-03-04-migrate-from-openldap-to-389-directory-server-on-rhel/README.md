# How to Migrate from OpenLDAP to 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, OpenLDAP, LDAP, Migration

Description: Migrate your LDAP directory from OpenLDAP to 389 Directory Server on RHEL using the built-in migration tools to preserve users, groups, and schema.

---

389 Directory Server is the LDAP server shipped on RHEL systems. The 389 project provides migration tools that help convert OpenLDAP configurations and data to the 389 DS format.

## Export Data from OpenLDAP

First, copy the OpenLDAP dynamic configuration and export each backend suffix from the existing OpenLDAP instance:

```bash
# Copy the dynamic configuration directory used by the migration tool
sudo cp -a /etc/openldap/slapd.d /tmp/slapd.d

# Export the directory suffix to LDIF
sudo slapcat -F /etc/openldap/slapd.d -b "dc=example,dc=com" -l /tmp/dc_example.ldif

# If your server still uses slapd.conf, create a temporary dynamic configuration
sudo slaptest -f /etc/openldap/slapd.conf -F /tmp/slapd.d

# Then export from that temporary configuration
sudo slapcat -F /tmp/slapd.d -b "dc=example,dc=com" -l /tmp/dc_example.ldif
```

## Install 389 Directory Server

On the target RHEL server:

```bash
# Install 389 DS
sudo dnf install -y 389-ds-base

# Install OpenLDAP client utilities for verification commands
sudo dnf install -y openldap-clients
```

## Use the Migration Tool

389 DS includes `openldap_to_ds` for automated migration. Run this after the 389 DS instance has been created:

```bash
# Run the migration analysis (dry run)
sudo openldap_to_ds localhost /tmp/slapd.d /tmp/dc_example.ldif

# The tool outputs a migration plan and any warnings about incompatible schema

# Apply the migration after reviewing the plan
sudo openldap_to_ds --confirm localhost /tmp/slapd.d /tmp/dc_example.ldif
```

## Create the 389 DS Instance

```bash
# Create an initial configuration file for the target instance
cat > /tmp/ds-migrate.inf << 'EOF'
[general]
config_version = 2
full_machine_name = ldap.example.com
start = True

[slapd]
instance_name = localhost
port = 389
secure_port = 636
root_dn = cn=Directory Manager
root_password = YourNewPassword123

[backend-userroot]
suffix = dc=example,dc=com
EOF

# Create the instance
sudo dscreate from-file /tmp/ds-migrate.inf
```

## Import Custom Schema

If you have custom OpenLDAP schema, review the migration plan. The `openldap_to_ds` tool attempts to migrate custom schema automatically, but schema that cannot be converted automatically must be fixed and loaded manually:

```bash
# Place fixed 389 DS schema LDIF files in the schema directory
sudo cp /tmp/converted-schema.ldif /etc/dirsrv/slapd-localhost/schema/

# Restart to load new schema
sudo dsctl localhost restart
```

## Clean the LDIF Export

The OpenLDAP LDIF may need adjustments for 389 DS compatibility:

```bash
# Remove OpenLDAP-specific operational attributes
sed -i '/^structuralObjectClass:/d' /tmp/dc_example.ldif
sed -i '/^entryUUID:/d' /tmp/dc_example.ldif
sed -i '/^creatorsName:/d' /tmp/dc_example.ldif
sed -i '/^createTimestamp:/d' /tmp/dc_example.ldif
sed -i '/^modifiersName:/d' /tmp/dc_example.ldif
sed -i '/^modifyTimestamp:/d' /tmp/dc_example.ldif
sed -i '/^entryCSN:/d' /tmp/dc_example.ldif
```

## Import Data

```bash
# Stop the instance before importing
sudo dsctl localhost stop

# Copy the LDIF into the instance LDIF directory and restore the SELinux context
sudo cp /tmp/dc_example.ldif /var/lib/dirsrv/slapd-localhost/ldif/
sudo restorecon -v /var/lib/dirsrv/slapd-localhost/ldif/dc_example.ldif

# Import the LDIF data into the userRoot backend
sudo dsctl localhost ldif2db userRoot /var/lib/dirsrv/slapd-localhost/ldif/dc_example.ldif

# Start the instance
sudo dsctl localhost start
```

## Verify the Migration

```bash
# Count entries
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" "(objectClass=*)" dn | grep "numEntries"

# Search for users
ldapsearch -x -H ldap://localhost -b "ou=People,dc=example,dc=com" "(objectClass=inetOrgPerson)" uid

# Search for groups
ldapsearch -x -H ldap://localhost -b "ou=Groups,dc=example,dc=com" "(objectClass=groupOfNames)" cn

# Test authentication
ldapwhoami -x -H ldap://localhost -D "uid=jdoe,ou=People,dc=example,dc=com" -W
```

## Update Client Configurations

Update SSSD on client machines to point to the new server:

```bash
# Edit sssd.conf on client machines
sudo vi /etc/sssd/sssd.conf
```

```ini
[domain/example.com]
ldap_uri = ldap://ldap.example.com
ldap_search_base = dc=example,dc=com
```

```bash
sudo systemctl restart sssd
```

## Decommission OpenLDAP

After verifying the migration is complete:

```bash
# Stop and disable OpenLDAP
sudo systemctl stop slapd
sudo systemctl disable slapd
```

The migration from OpenLDAP to 389 Directory Server preserves your directory structure and data while bringing you to a supported LDAP solution on RHEL.
