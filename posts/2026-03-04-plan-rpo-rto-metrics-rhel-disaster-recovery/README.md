# How to Plan RPO and RTO Metrics for RHEL Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disaster Recovery, RPO, RTO, Backup Planning, Linux

Description: Understand and plan RPO (Recovery Point Objective) and RTO (Recovery Time Objective) metrics for RHEL disaster recovery to meet business continuity requirements.

---

RPO and RTO are the two most important metrics in disaster recovery planning. RPO defines how much data loss is acceptable. RTO defines how long recovery can take. Together, they drive your backup strategy on RHEL.

## Understanding RPO and RTO

**RPO (Recovery Point Objective):** The maximum age of data you can afford to lose. If your RPO is 1 hour, you need backups at least every hour.

**RTO (Recovery Time Objective):** The maximum time it takes to restore service after a failure. If your RTO is 4 hours, your recovery process must complete within 4 hours.

## Mapping Backup Strategies to RPO

Choose backup frequency based on your RPO requirements:

```bash
# RPO: 24 hours - Daily backups are sufficient
# Schedule nightly backup at 2 AM
echo '0 2 * * * root /usr/local/bin/daily-backup.sh' > /etc/cron.d/backup

# RPO: 1 hour - Use frequent rsync jobs
# Run rsync every hour
echo '0 * * * * root rsync -az /data/ backup-server:/backup/data/' > /etc/cron.d/backup

# RPO: Near zero - Use real-time replication
# DRBD for block-level replication (near-zero RPO)
# or database-level replication (PostgreSQL streaming, MySQL replication)
```

## Measuring Backup and Recovery Times

Create a script to measure and log backup performance:

```bash
#!/bin/bash
# /usr/local/bin/measure-backup.sh
# Measures backup duration and data size for RTO/RPO planning

START=$(date +%s)
LOG="/var/log/backup-metrics.log"

# Run the backup
/usr/local/bin/daily-backup.sh

END=$(date +%s)
DURATION=$((END - START))
BACKUP_SIZE=$(du -sh /backup/latest/ | cut -f1)

# Log the metrics
echo "$(date +%Y-%m-%d),backup,${DURATION}s,${BACKUP_SIZE}" >> "$LOG"
echo "Backup took ${DURATION} seconds, size: ${BACKUP_SIZE}"
```

## Testing Recovery Time

Run periodic recovery drills and measure the time:

```bash
#!/bin/bash
# /usr/local/bin/measure-recovery.sh
# Measures restoration time for RTO validation

START=$(date +%s)

# Simulate restoration to a test directory
mkdir -p /tmp/recovery-test
tar xzf /backup/full-backup-latest.tar.gz -C /tmp/recovery-test

END=$(date +%s)
DURATION=$((END - START))

echo "$(date +%Y-%m-%d),restore,${DURATION}s" >> /var/log/backup-metrics.log
echo "Restoration took ${DURATION} seconds"

# Clean up
rm -rf /tmp/recovery-test
```

## Documentation Template

Document your RPO/RTO targets for each system:

```
System: web-server-01
RPO Target: 1 hour
RTO Target: 2 hours
Backup Method: Hourly rsync + daily ReaR
Recovery Method: ReaR rescue ISO + rsync restore
Last DR Test: 2026-02-15
Measured Recovery Time: 1h 23m
```

Review and test these metrics quarterly. Business requirements change, and your disaster recovery plan needs to keep pace.
