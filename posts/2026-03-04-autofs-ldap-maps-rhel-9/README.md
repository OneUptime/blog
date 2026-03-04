# How to Configure autofs with LDAP Maps on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, autofs, LDAP, NFS, SSSD, Linux

Description: Configure autofs on RHEL to retrieve automount maps from an LDAP directory, enabling centralized management of mount points across all clients.

---

Storing autofs maps in LDAP centralizes mount configuration. Instead of editing map files on every client, you update the LDAP directory once and all clients pick up the changes. This is especially useful in environments with many servers that need consistent mount configurations.

## How LDAP-Based autofs Works

```bash
LDAP Server
+---------------------------+
| ou=autofs,dc=example,dc=com
|   |
|   +-- auto.master (master map)
|   +-- auto.home (indirect map)
|   +-- auto.data (indirect map)
+---------------------------+
        |
        | LDAP query
        |
+-------+--------+--------+
| Client 1  | Client 2  | Client 3
| autofs    | autofs    | autofs
+----------+----------+---------+
```

## Prerequisites

- LDAP server (FreeIPA, OpenLDAP, or Active Directory) with automount schema
- SSSD configured on RHEL clients for LDAP authentication
- NFS server with exports

## LDAP Schema for autofs

The automount schema uses these object classes:

- `automountMap`: Represents a map (like auto.master or auto.home)
- `automount`: Represents an entry within a map

Key attributes:
- `automountMapName`: Name of the map
- `automountKey`: The key (mount point or subdirectory)
- `automountInformation`: The mount source and options

## Step 1: Create LDAP Entries

### Using ldapadd

Create the autofs organizational unit:

```ldif
dn: ou=autofs,dc=example,dc=com
objectClass: organizationalUnit
ou: autofs
```

Create the master map:

```ldif
dn: automountMapName=auto.master,ou=autofs,dc=example,dc=com
objectClass: automountMap
automountMapName: auto.master

dn: automountKey=/home,automountMapName=auto.master,ou=autofs,dc=example,dc=com
objectClass: automount
automountKey: /home
automountInformation: auto.home

dn: automountKey=/data,automountMapName=auto.master,ou=autofs,dc=example,dc=com
objectClass: automount
automountKey: /data
automountInformation: auto.data
```

Create the home directory map:

```ldif
dn: automountMapName=auto.home,ou=autofs,dc=example,dc=com
objectClass: automountMap
automountMapName: auto.home

dn: automountKey=*,automountMapName=auto.home,ou=autofs,dc=example,dc=com
objectClass: automount
automountKey: *
automountInformation: -rw,soft,intr nfsserver:/export/home/&
```

Create the data map:

```ldif
dn: automountMapName=auto.data,ou=autofs,dc=example,dc=com
objectClass: automountMap
automountMapName: auto.data

dn: automountKey=projects,automountMapName=auto.data,ou=autofs,dc=example,dc=com
objectClass: automount
automountKey: projects
automountInformation: -rw,soft nfsserver:/export/data/projects

dn: automountKey=shared,automountMapName=auto.data,ou=autofs,dc=example,dc=com
objectClass: automount
automountKey: shared
automountInformation: -ro,soft nfsserver:/export/data/shared
```

Apply:

```bash
ldapadd -x -D "cn=admin,dc=example,dc=com" -W -f autofs.ldif
```

### Using FreeIPA

If you use FreeIPA, use the `ipa` command:

```bash
# Create locations and maps
ipa automountlocation-add default
ipa automountmap-add default auto.home
ipa automountkey-add default auto.master --key=/home --info=auto.home
ipa automountkey-add default auto.home --key="*" --info="-rw,soft,intr nfsserver:/export/home/&"
```

## Step 2: Configure SSSD for autofs

Edit `/etc/sssd/sssd.conf`:

```ini
[sssd]
services = nss, pam, autofs
domains = example.com

[domain/example.com]
id_provider = ldap
autofs_provider = ldap
ldap_uri = ldap://ldap.example.com
ldap_search_base = dc=example,dc=com
ldap_autofs_search_base = ou=autofs,dc=example,dc=com
ldap_autofs_map_object_class = automountMap
ldap_autofs_map_name = automountMapName
ldap_autofs_entry_object_class = automount
ldap_autofs_entry_key = automountKey
ldap_autofs_entry_value = automountInformation
```

Restart SSSD:

```bash
sudo systemctl restart sssd
```

## Step 3: Configure autofs to Use SSSD

Edit `/etc/autofs.conf` or `/etc/sysconfig/autofs`:

```bash
sudo vi /etc/autofs.conf
```

Set the map source:

```bash
map_object_class = automountMap
entry_object_class = automount
map_attribute = automountMapName
entry_attribute = automountKey
value_attribute = automountInformation
```

Configure the master map to use LDAP:

```bash
sudo vi /etc/auto.master
```

Add:

```bash
+auto.master
```

This tells autofs to look up the master map from the configured LDAP source via SSSD.

## Step 4: Configure nsswitch

Ensure automount lookups use SSSD:

```bash
sudo vi /etc/nsswitch.conf
```

```bash
automount: sss files
```

## Step 5: Restart and Test

```bash
sudo systemctl restart autofs
```

Test:

```bash
ls /home/alice/     # Should trigger automount
ls /data/projects/  # Should trigger automount
mount | grep autofs
```

## Verifying LDAP Maps

```bash
# Check what maps SSSD sees
sudo sssctl automount-list

# Check specific map entries
getent automount auto.home
```

## Troubleshooting

### Maps Not Loading

```bash
# Check SSSD can reach LDAP
sudo sssctl domain-status example.com

# Clear SSSD cache
sudo sss_cache -A

# Check autofs debug output
sudo automount -f -v -d
```

### SSSD Cache Issues

```bash
# Clear all caches
sudo systemctl stop sssd
sudo rm -rf /var/lib/sss/db/*
sudo systemctl start sssd
sudo systemctl restart autofs
```

## Conclusion

LDAP-based autofs maps centralize mount configuration management. When you add or change a mount, update it once in LDAP and all clients pick up the change after their cache expires or is cleared. This is the standard approach for enterprise environments with many machines sharing NFS storage.
