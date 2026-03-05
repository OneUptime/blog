# How to Back Up and Restore OpenLDAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, Backup, Disaster Recovery, LDAP

Description: Learn how to back up and restore OpenLDAP directories on Ubuntu using slapcat and slapadd, including automated backup scripts.

---

OpenLDAP stores your organization's user accounts, groups, and access credentials. Losing this data or being unable to restore it quickly after a failure is a serious operational risk. Fortunately, OpenLDAP's backup and restore process is straightforward once you understand the tools and what needs to be backed up.

## What Needs to Be Backed Up

An OpenLDAP installation has two distinct pieces of data:

1. **The directory data** - the actual entries (users, groups, OUs) stored in the `mdb` database
2. **The configuration** - the `cn=config` tree, which holds all server settings, overlays, schemas, and ACLs

Both are equally important. If you restore directory data but not configuration, slapd may not even start, or it may start with wrong settings. Backing up only the data without the configuration means you cannot fully recreate a server.

## Using slapcat

`slapcat` exports OpenLDAP data to LDIF (LDAP Data Interchange Format), a plain-text format suitable for backup and migration. It reads the database files directly without needing slapd to be running (though it works with a running server too).

### Back Up Directory Data

```bash
# Export the main directory database (database 1)
sudo slapcat -n 1 -l /backup/ldap-data-$(date +%F).ldif

# Verify the backup file looks correct
head -20 /backup/ldap-data-$(date +%F).ldif
```

Example output:

```ldif
dn: dc=example,dc=com
objectClass: top
objectClass: dcObject
objectClass: organization
o: Example Organization
dc: example
structuralObjectClass: organization
entryUUID: ...
```

### Back Up Configuration

```bash
# Export cn=config (database 0)
sudo slapcat -n 0 -l /backup/ldap-config-$(date +%F).ldif
```

The configuration LDIF will be much larger than you might expect - it contains all schemas, indexes, overlays, and ACLs.

### Back Up All Databases

```bash
# Export all databases in a single command
sudo slapcat -a "(!(entryDN:dnSubtreeMatch:=cn=schema,cn=config))" \
  -l /backup/ldap-all-$(date +%F).ldif
```

## Automated Backup Script

Create a script to run daily backups:

```bash
sudo nano /usr/local/bin/ldap-backup.sh
```

```bash
#!/bin/bash
# OpenLDAP backup script
# Backs up both directory data and configuration

BACKUP_DIR="/backup/ldap"
DATE=$(date +%F)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Back up directory data
slapcat -n 1 -l "$BACKUP_DIR/ldap-data-$DATE.ldif"
if [ $? -eq 0 ]; then
    echo "[$DATE] Data backup successful"
    gzip "$BACKUP_DIR/ldap-data-$DATE.ldif"
else
    echo "[$DATE] ERROR: Data backup failed" >&2
fi

# Back up configuration
slapcat -n 0 -l "$BACKUP_DIR/ldap-config-$DATE.ldif"
if [ $? -eq 0 ]; then
    echo "[$DATE] Config backup successful"
    gzip "$BACKUP_DIR/ldap-config-$DATE.ldif"
else
    echo "[$DATE] ERROR: Config backup failed" >&2
fi

# Remove backups older than retention period
find "$BACKUP_DIR" -name "*.ldif.gz" -mtime +$RETENTION_DAYS -delete
echo "[$DATE] Cleaned up backups older than $RETENTION_DAYS days"
```

```bash
sudo chmod +x /usr/local/bin/ldap-backup.sh
```

Schedule with cron:

```bash
sudo crontab -e
```

```text
# Run LDAP backup daily at 2:30 AM
30 2 * * * /usr/local/bin/ldap-backup.sh >> /var/log/ldap-backup.log 2>&1
```

## Copying Backups Off-Site

Keeping backups on the same server as the LDAP data is not a real backup strategy. Use `rsync` or `scp` to copy to a remote location:

```bash
# rsync to a backup server
rsync -avz /backup/ldap/ backup-user@backup.example.com:/backups/ldap/

# Or upload to S3
aws s3 sync /backup/ldap/ s3://your-backup-bucket/ldap/

# Add to the backup script
```

## Restoring from Backup

Restoration involves importing the LDIF files back into slapd. The process differs depending on whether you are doing a full server rebuild or just restoring lost data.

### Full Server Restore

This procedure restores a fresh OpenLDAP installation from scratch:

```bash
# 1. Stop slapd
sudo systemctl stop slapd

# 2. Remove existing database (DESTRUCTIVE - only on a fresh or broken install)
sudo rm -rf /var/lib/ldap/*
sudo rm -rf /etc/ldap/slapd.d/*

# 3. Restore configuration first
sudo slapadd -n 0 -F /etc/ldap/slapd.d \
  -l /backup/ldap-config-2026-03-01.ldif

# Fix permissions
sudo chown -R openldap:openldap /etc/ldap/slapd.d

# 4. Restore directory data
sudo slapadd -n 1 -F /etc/ldap/slapd.d \
  -l /backup/ldap-data-2026-03-01.ldif

# Fix permissions
sudo chown -R openldap:openldap /var/lib/ldap

# 5. Start slapd
sudo systemctl start slapd
sudo systemctl status slapd
```

### Verifying the Restore

```bash
# Confirm the directory is accessible
ldapsearch -x -H ldap://localhost \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=posixAccount)" uid

# Count entries to compare with pre-failure count
ldapsearch -x -H ldap://localhost \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)" dn | grep "^dn:" | wc -l
```

### Restoring Individual Entries

If you only lost a few entries (e.g., accidentally deleted a user), do not wipe the entire database. Extract the specific entry from the backup LDIF and add it:

```bash
# Find the user in the backup LDIF
grep -A 20 "uid=jsmith" /backup/ldap-data-2026-03-01.ldif.gz | zcat

# Or extract specific entries with awk
zcat /backup/ldap-data-2026-03-01.ldif.gz | \
  awk '/^dn: uid=jsmith/{found=1} found{print; if(/^$/) exit}'
```

Then add the extracted entry:

```bash
# Save the extracted entry to a file
# Remove operational attributes (entryUUID, entryCSN, etc.) if they cause conflicts
nano /tmp/restore-jsmith.ldif

ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f /tmp/restore-jsmith.ldif
```

## Handling Operational Attributes

When importing a backup, operational attributes like `entryUUID`, `entryCSN`, `structuralObjectClass`, and `modifyTimestamp` can sometimes cause conflicts. Use `slapadd` with the `-q` (quick) flag to skip some checks, or strip operational attributes before restoring with `ldapadd`:

```bash
# Import with slapadd (preserves operational attributes, requires stopped slapd)
sudo slapadd -n 1 -q -l /backup/ldap-data-2026-03-01.ldif

# OR strip operational attributes and use ldapadd (slapd must be running)
# This is for partial restores or migrating to a new server
zcat /backup/ldap-data-2026-03-01.ldif.gz | \
  grep -v "^structuralObjectClass:" | \
  grep -v "^entryUUID:" | \
  grep -v "^creatorsName:" | \
  grep -v "^createTimestamp:" | \
  grep -v "^entryCSN:" | \
  grep -v "^modifiersName:" | \
  grep -v "^modifyTimestamp:" | \
  ldapadd -x -H ldap://localhost \
    -D "cn=admin,dc=example,dc=com" \
    -W
```

## Testing Your Backup and Restore

A backup you have never tested is a backup you cannot trust. Schedule quarterly restore tests:

```bash
# Spin up a test VM or Docker container with OpenLDAP
docker run -d \
  --name ldap-test \
  -e LDAP_ORGANISATION="Test" \
  -e LDAP_DOMAIN="example.com" \
  -e LDAP_ADMIN_PASSWORD="test123" \
  osixia/openldap

# Restore backup into the test instance
docker cp /backup/ldap-data-latest.ldif.gz ldap-test:/tmp/
docker exec ldap-test bash -c "
  systemctl stop slapd
  rm -rf /var/lib/ldap/*
  zcat /tmp/ldap-data-latest.ldif.gz | slapadd -n 1
  chown -R openldap:openldap /var/lib/ldap
  systemctl start slapd
"

# Verify entries
docker exec ldap-test ldapsearch -x -b "dc=example,dc=com" "(objectClass=posixAccount)"
```

With reliable backups and a tested restore procedure, OpenLDAP failures become recoverable incidents rather than disasters.
