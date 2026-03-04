# How to Migrate from OpenLDAP to 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, OpenLDAP, LDAP, Migration

Description: Migrate your LDAP directory from OpenLDAP to 389 Directory Server on RHEL using the built-in migration tools to preserve users, groups, and schema.

---

Red Hat recommends 389 Directory Server as the replacement for OpenLDAP on RHEL. The 389 project provides migration tools that help convert OpenLDAP configurations and data to the 389 DS format.

## Export Data from OpenLDAP

First, export all data from the existing OpenLDAP instance:

```bash
# Export the entire directory to LDIF
slapcat -l /tmp/openldap-export.ldif

# Export just the configuration (cn=config)
slapcat -n 0 -l /tmp/openldap-config.ldif

# Export custom schema files
cp /etc/openldap/schema/*.schema /tmp/openldap-schemas/
cp /etc/openldap/schema/*.ldif /tmp/openldap-schemas/
```

## Install 389 Directory Server

On the target RHEL server:

```bash
# Install 389 DS
sudo dnf install -y 389-ds-base

# Install the migration tools
sudo dnf install -y openldap-clients
```

## Use the Migration Tool

389 DS includes `openldap_to_ds` for automated migration:

```bash
# Run the migration analysis (dry run)
sudo openldap_to_ds ldap.example.com /tmp/openldap-config.ldif /tmp/openldap-export.ldif

# The tool outputs a migration plan and any warnings about incompatible schema
```

## Create the 389 DS Instance

```bash
# Create a configuration file based on the migration analysis
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

If you have custom OpenLDAP schema, convert and import them:

```bash
# Convert .schema files to LDIF format for 389 DS
# Place converted schema files in the schema directory
sudo cp /tmp/converted-schema.ldif /etc/dirsrv/slapd-localhost/schema/

# Restart to load new schema
sudo dsctl localhost restart
```

## Clean the LDIF Export

The OpenLDAP LDIF may need adjustments for 389 DS compatibility:

```bash
# Remove OpenLDAP-specific operational attributes
sed -i '/^structuralObjectClass:/d' /tmp/openldap-export.ldif
sed -i '/^entryUUID:/d' /tmp/openldap-export.ldif
sed -i '/^creatorsName:/d' /tmp/openldap-export.ldif
sed -i '/^createTimestamp:/d' /tmp/openldap-export.ldif
sed -i '/^modifiersName:/d' /tmp/openldap-export.ldif
sed -i '/^modifyTimestamp:/d' /tmp/openldap-export.ldif
sed -i '/^entryCSN:/d' /tmp/openldap-export.ldif
```

## Import Data

```bash
# Stop the instance before importing
sudo dsctl localhost stop

# Import the LDIF data
sudo dsctl localhost import /tmp/openldap-export.ldif

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
