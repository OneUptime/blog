# How to Back Up and Restore 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, LDAP, Backup, Disaster Recovery

Description: Back up and restore 389 Directory Server on RHEL using LDIF exports and database-level backups to protect your LDAP directory from data loss.

---

Backing up your 389 Directory Server is essential for disaster recovery. There are two approaches: LDIF exports (portable, human-readable) and database-level backups (faster, includes metadata). Here is how to use both.

## LDIF Export (Recommended for Portability)

### Export the Entire Directory

```bash
# Export all data to an LDIF file while the server is running
sudo dsconf localhost backend export userroot --ldif /tmp/backup-$(date +%Y%m%d).ldif

# Or export with the server stopped for consistency
sudo dsctl localhost stop
sudo dsctl localhost export --suffix "dc=example,dc=com" /tmp/backup-$(date +%Y%m%d).ldif
sudo dsctl localhost start
```

### Export Specific Subtrees

```bash
# Export only the People branch
ldapsearch -x -H ldap://localhost -D "cn=Directory Manager" -W \
    -b "ou=People,dc=example,dc=com" "(objectClass=*)" > /tmp/people-backup.ldif
```

## Database-Level Backup

Database backups are faster and include operational data like replication metadata:

```bash
# Create a full database backup (server stays running)
sudo dsconf localhost backup create

# Backups are stored in /var/lib/dirsrv/slapd-localhost/bak/
ls -la /var/lib/dirsrv/slapd-localhost/bak/

# Create a backup with a custom name
sudo dsconf localhost backup create --archive /tmp/ds-backup-$(date +%Y%m%d)
```

## Back Up Configuration Files

```bash
# Back up the instance configuration
sudo tar czf /tmp/ds-config-backup.tar.gz \
    /etc/dirsrv/slapd-localhost/ \
    /etc/sysconfig/dirsrv-localhost

# Back up custom schema
sudo cp -r /etc/dirsrv/slapd-localhost/schema/ /tmp/schema-backup/

# Back up certificates
sudo dsctl localhost tls export-cert --nickname "Server-Cert" > /tmp/server-cert.pem
```

## Automate Backups with Cron

```bash
# Create a backup script
sudo tee /usr/local/bin/ds-backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backup/389ds"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# LDIF export
dsconf localhost backend export userroot --ldif ${BACKUP_DIR}/data-${DATE}.ldif

# Database backup
dsconf localhost backup create --archive ${BACKUP_DIR}/db-${DATE}

# Configuration backup
tar czf ${BACKUP_DIR}/config-${DATE}.tar.gz /etc/dirsrv/slapd-localhost/

# Remove backups older than 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: ${DATE}"
SCRIPT

sudo chmod +x /usr/local/bin/ds-backup.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * root /usr/local/bin/ds-backup.sh" | sudo tee /etc/cron.d/ds-backup
```

## Restore from LDIF

```bash
# Stop the server
sudo dsctl localhost stop

# Import the LDIF backup
sudo dsctl localhost import /tmp/backup-20260304.ldif

# Start the server
sudo dsctl localhost start

# Verify the restore
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" "(objectClass=*)" dn | grep numEntries
```

## Restore from Database Backup

```bash
# Stop the server
sudo dsctl localhost stop

# Restore from the database backup
sudo dsctl localhost restore /var/lib/dirsrv/slapd-localhost/bak/backup-20260304

# Start the server
sudo dsctl localhost start
```

## Restore Configuration

```bash
# Restore configuration files
sudo dsctl localhost stop
sudo tar xzf /tmp/ds-config-backup.tar.gz -C /
sudo dsctl localhost start
```

## Verify the Restore

```bash
# Check server status
sudo dsctl localhost status

# Count entries to confirm data is present
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" "(objectClass=*)" dn | tail -1

# Test authentication
ldapwhoami -x -H ldap://localhost -D "uid=jdoe,ou=People,dc=example,dc=com" -W

# Check replication status if applicable
sudo dsconf localhost repl-agmt status --suffix "dc=example,dc=com" "agmt-to-ldap2"
```

Regular backups of both data and configuration ensure you can recover your 389 Directory Server on RHEL quickly after any failure or data corruption.
