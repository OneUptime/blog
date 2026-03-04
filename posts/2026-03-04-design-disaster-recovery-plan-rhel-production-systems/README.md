# How to Design a Disaster Recovery Plan for RHEL Production Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disaster Recovery, Backup, Production, Linux

Description: Build a disaster recovery plan for RHEL production servers covering backup strategies, recovery procedures, and testing practices.

---

A disaster recovery (DR) plan for RHEL systems ensures you can restore service after hardware failures, data corruption, or site-level outages. Here is how to build one with practical tools available on RHEL.

## Define Recovery Objectives

Before configuring anything, establish your RPO (Recovery Point Objective) and RTO (Recovery Time Objective):

```
RPO: Maximum acceptable data loss (e.g., 1 hour = hourly backups)
RTO: Maximum acceptable downtime (e.g., 4 hours = must restore in 4 hours)
```

## Full System Backup with ReaR

Relax-and-Recover (ReaR) creates bootable recovery images for RHEL servers:

```bash
# Install ReaR
sudo dnf install rear

# Configure ReaR for ISO output with NFS backup
sudo tee /etc/rear/local.conf << 'EOF'
OUTPUT=ISO
OUTPUT_URL=nfs://backup-server/rear-output
BACKUP=NETFS
BACKUP_URL=nfs://backup-server/rear-backups
BACKUP_PROG_EXCLUDE=("${BACKUP_PROG_EXCLUDE[@]}" '/tmp/*' '/var/tmp/*')
NETFS_KEEP_OLD_BACKUP_COPY=yes
EOF

# Create a full backup and recovery ISO
sudo rear -v mkbackup
```

## Data-Level Backups

For application data, use rsync or dedicated backup tools:

```bash
# Incremental backup of critical data directories
sudo rsync -avz --delete \
  /var/lib/pgsql/ \
  backup-server:/backups/$(hostname)/pgsql/

# Schedule daily backups via cron
sudo tee /etc/cron.d/data-backup << 'EOF'
0 2 * * * root rsync -avz --delete /var/lib/pgsql/ backup-server:/backups/$(hostname)/pgsql/ >> /var/log/backup.log 2>&1
EOF
```

## LVM Snapshot-Based Backups

Use LVM snapshots for consistent point-in-time copies:

```bash
# Create a consistent snapshot
sudo lvcreate -L 10G -s -n data-snap /dev/vg_data/lv_data

# Mount the snapshot read-only and back it up
sudo mount -o ro /dev/vg_data/data-snap /mnt/snap
sudo tar czf /backup/data-$(date +%Y%m%d).tar.gz -C /mnt/snap .
sudo umount /mnt/snap
sudo lvremove -f /dev/vg_data/data-snap
```

## Recovery Procedure

Document the exact steps to restore a server:

```bash
# Step 1: Boot from the ReaR recovery ISO
# Step 2: At the ReaR prompt, run:
rear -v recover

# Step 3: After system restore, verify services
systemctl --failed
df -h

# Step 4: Restore application data from the latest backup
sudo rsync -avz backup-server:/backups/$(hostname)/pgsql/ /var/lib/pgsql/

# Step 5: Start application services
sudo systemctl start postgresql
```

## Testing the Plan

A DR plan that is not tested is not a plan. Schedule quarterly recovery tests:

```bash
# Test ReaR recovery on a spare server or VM
# Boot from the ISO and run through the full recovery
# Document the actual time it takes (compare against RTO)
# Verify data integrity after restore
sudo md5sum /var/lib/pgsql/data/important-file
```

Keep your DR documentation up to date and make sure at least two team members can execute it independently.
