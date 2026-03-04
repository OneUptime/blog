# How to Design a Disaster Recovery Plan for RHEL 9 Production Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices

Description: Step-by-step guide on design a disaster recovery plan for rhel 9 production systems with practical examples and commands.

---

A disaster recovery plan ensures you can restore RHEL 9 systems after catastrophic failures.

## Recovery Time and Point Objectives

Define your targets:

- **RTO** (Recovery Time Objective): Maximum acceptable downtime
- **RPO** (Recovery Point Objective): Maximum acceptable data loss

## Backup Strategy

### Full System Backup

```bash
# Using rear (Relax-and-Recover)
sudo dnf install -y rear

# Configure rear
sudo vi /etc/rear/local.conf
OUTPUT=ISO
BACKUP=NETFS
BACKUP_URL=nfs://backup-server/backups
NETFS_KEEP_OLD_BACKUP_COPY=yes

# Create a backup
sudo rear mkbackup
```

### Data Backup

```bash
# Filesystem backup with rsync
sudo rsync -aAXv --delete /important-data/ backup-server:/backups/data/

# Database backup
sudo -u postgres pg_dumpall > /backup/postgresql-full.sql
```

### Configuration Backup

```bash
# Back up critical configurations
sudo tar czf /backup/etc-backup.tar.gz /etc/
sudo tar czf /backup/system-config.tar.gz \
  /etc/fstab /etc/crypttab \
  /etc/sysconfig/ \
  /etc/firewalld/ \
  /etc/ssh/
```

## DR Procedures

### Scenario 1 - Single Disk Failure

```bash
# Replace disk in RAID array
sudo mdadm /dev/md0 --add /dev/sdc1
# Or replace LVM PV
sudo pvmove /dev/sdb /dev/sdc
```

### Scenario 2 - Complete Server Loss

```bash
# Boot from rear rescue ISO
# Restore from backup
rear recover
```

### Scenario 3 - Data Corruption

```bash
# Restore from latest clean backup
sudo rsync -aAXv backup-server:/backups/data/ /important-data/
```

## Testing the DR Plan

Schedule quarterly DR tests:

1. Restore a full system from rear backup
2. Verify data integrity after restoration
3. Test application functionality
4. Document recovery time

## Conclusion

A tested disaster recovery plan for RHEL 9 combines system backups with rear, data backups with rsync, and documented recovery procedures. Test your plan quarterly to ensure it works when you need it.

