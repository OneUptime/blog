# How to Use Lightsail Snapshots for Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Backup, Snapshots

Description: Protect your Lightsail resources with manual and automatic snapshots, including scheduling, restoring, cross-region copies, and cost management strategies.

---

Snapshots are your safety net on Lightsail. They capture the complete state of an instance or database at a point in time, letting you restore or clone your resources whenever you need to. Lightsail offers both automatic daily snapshots and manual snapshots, and both are worth setting up properly.

## Types of Snapshots

Lightsail supports snapshots for three resource types:
- **Instance snapshots** - capture the OS, application, and data
- **Database snapshots** - capture the database state
- **Disk snapshots** - capture additional block storage volumes

Each snapshot is incremental after the first one, meaning only changed data is stored, which keeps costs manageable.

## Creating Manual Instance Snapshots

Take a manual snapshot before making changes to your server.

```bash
# Create a snapshot of a running instance
aws lightsail create-instance-snapshot \
  --instance-name my-web-server \
  --instance-snapshot-name pre-upgrade-$(date +%Y%m%d)

# Check the snapshot status
aws lightsail get-instance-snapshot \
  --instance-snapshot-name pre-upgrade-$(date +%Y%m%d) \
  --query 'instanceSnapshot.{
    State: state,
    Size: sizeInGb,
    Created: createdAt,
    FromInstance: fromInstanceName,
    FromBlueprint: fromBlueprintId
  }'
```

Snapshots can be taken while the instance is running. The snapshot captures the disk state at the moment of creation, so any writes in progress might not be fully consistent. For best results with databases running on instances, flush and lock tables before snapshotting.

## Enabling Automatic Snapshots

Automatic snapshots take a daily backup and retain the last 7 snapshots. Older snapshots are deleted automatically.

```bash
# Enable automatic snapshots for an instance
aws lightsail enable-add-on \
  --resource-name my-web-server \
  --add-on-request '{
    "addOnType": "AutoSnapshot",
    "autoSnapshotAddOnRequest": {
      "snapshotTimeOfDay": "03:00"
    }
  }'

# Verify it's enabled
aws lightsail get-instance \
  --instance-name my-web-server \
  --query 'instance.addOns'
```

The snapshot time is in UTC. Pick a time when your server is least busy.

To change the snapshot time:

```bash
# Update the automatic snapshot schedule
aws lightsail enable-add-on \
  --resource-name my-web-server \
  --add-on-request '{
    "addOnType": "AutoSnapshot",
    "autoSnapshotAddOnRequest": {
      "snapshotTimeOfDay": "05:00"
    }
  }'
```

## Creating Database Snapshots

Lightsail databases get automatic daily snapshots by default, but you should take manual snapshots before major changes.

```bash
# Create a manual database snapshot
aws lightsail create-relational-database-snapshot \
  --relational-database-name my-app-db \
  --relational-database-snapshot-name db-pre-migration-$(date +%Y%m%d)

# Check the snapshot
aws lightsail get-relational-database-snapshot \
  --relational-database-snapshot-name db-pre-migration-$(date +%Y%m%d) \
  --query 'relationalDatabaseSnapshot.{State: state, Engine: engine, SizeInGb: sizeInGb}'
```

## Restoring from an Instance Snapshot

Restore by creating a new instance from the snapshot. You can use the same or a different plan size.

```bash
# Create a new instance from a snapshot
aws lightsail create-instances-from-snapshot \
  --instance-names my-web-server-restored \
  --availability-zone us-east-1a \
  --instance-snapshot-name pre-upgrade-20260212 \
  --bundle-id small_3_0 \
  --tags key=RestoredFrom,value=pre-upgrade-20260212

# Or restore from an automatic snapshot (use the date)
aws lightsail create-instances-from-snapshot \
  --instance-names my-web-server-restored \
  --availability-zone us-east-1a \
  --source-instance-name my-web-server \
  --restore-date "2026-02-11" \
  --bundle-id small_3_0
```

After restoring, you'll need to:
1. Assign a static IP to the new instance (or reassign the old one)
2. Update DNS records if needed
3. Reattach to load balancers if applicable

```bash
# Detach static IP from old instance and attach to new one
aws lightsail detach-static-ip --static-ip-name my-app-ip
aws lightsail attach-static-ip \
  --static-ip-name my-app-ip \
  --instance-name my-web-server-restored
```

## Restoring a Database Snapshot

Database restores also create a new database from the snapshot.

```bash
# Restore a database from a snapshot
aws lightsail create-relational-database-from-snapshot \
  --relational-database-name my-app-db-restored \
  --relational-database-snapshot-name db-pre-migration-20260212 \
  --availability-zone us-east-1a \
  --relational-database-bundle-id small_2_0

# Or restore from a point-in-time (last 7 days)
aws lightsail create-relational-database-from-snapshot \
  --relational-database-name my-app-db-restored \
  --source-relational-database-name my-app-db \
  --restore-time "2026-02-11T14:30:00Z" \
  --availability-zone us-east-1a
```

Point-in-time restore is incredibly useful - you can restore your database to any second within the last 7 days.

## Copying Snapshots to Another Region

For disaster recovery, copy snapshots to a different AWS region.

```bash
# Copy an instance snapshot to another region
aws lightsail copy-snapshot \
  --source-snapshot-name pre-upgrade-20260212 \
  --source-region us-east-1 \
  --target-snapshot-name dr-pre-upgrade-20260212 \
  --region us-west-2
```

This creates a copy of the snapshot in us-west-2 that you can use to launch instances there.

## Automating Backup Workflows

Create a script that handles regular backups with rotation.

```bash
#!/bin/bash
# backup-lightsail.sh - Automated backup script with rotation

INSTANCE_NAME="my-web-server"
DB_NAME="my-app-db"
DATE=$(date +%Y%m%d-%H%M)
RETAIN_DAYS=30

echo "=== Starting backup at $(date) ==="

# Create instance snapshot
echo "Creating instance snapshot..."
aws lightsail create-instance-snapshot \
  --instance-name "$INSTANCE_NAME" \
  --instance-snapshot-name "${INSTANCE_NAME}-manual-${DATE}"

# Create database snapshot
echo "Creating database snapshot..."
aws lightsail create-relational-database-snapshot \
  --relational-database-name "$DB_NAME" \
  --relational-database-snapshot-name "${DB_NAME}-manual-${DATE}"

# Clean up old manual snapshots (older than RETAIN_DAYS)
echo "Cleaning up old snapshots..."
CUTOFF_DATE=$(date -u -d "${RETAIN_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)

# Delete old instance snapshots
aws lightsail get-instance-snapshots \
  --query "instanceSnapshots[?createdAt<'${CUTOFF_DATE}' && contains(name, 'manual')].name" \
  --output text | tr '\t' '\n' | while read snapshot; do
  if [ -n "$snapshot" ]; then
    echo "Deleting old instance snapshot: $snapshot"
    aws lightsail delete-instance-snapshot --instance-snapshot-name "$snapshot"
  fi
done

# Delete old database snapshots
aws lightsail get-relational-database-snapshots \
  --query "relationalDatabaseSnapshots[?createdAt<'${CUTOFF_DATE}' && contains(name, 'manual')].name" \
  --output text | tr '\t' '\n' | while read snapshot; do
  if [ -n "$snapshot" ]; then
    echo "Deleting old database snapshot: $snapshot"
    aws lightsail delete-relational-database-snapshot \
      --relational-database-snapshot-name "$snapshot"
  fi
done

echo "=== Backup completed at $(date) ==="
```

Schedule it with cron.

```bash
# Run backup daily at 4 AM UTC
echo "0 4 * * * /home/ubuntu/scripts/backup-lightsail.sh >> /var/log/lightsail-backup.log 2>&1" | crontab -
```

## Snapshot Costs

Snapshot pricing is based on storage:
- Instance snapshots: $0.05/GB per month
- Database snapshots: Included in the database plan (automatic), $0.05/GB for manual
- Disk snapshots: $0.05/GB per month

A 40GB instance snapshot costs about $2/month. Keeping 30 days of daily snapshots would cost about $60/month. Adjust your retention policy based on your budget and recovery requirements.

## Listing and Managing Snapshots

Keep track of your snapshots.

```bash
# List all instance snapshots sorted by date
aws lightsail get-instance-snapshots \
  --query 'sort_by(instanceSnapshots, &createdAt)[].{
    Name: name,
    State: state,
    Size_GB: sizeInGb,
    Created: createdAt,
    Source: fromInstanceName
  }' \
  --output table

# List all database snapshots
aws lightsail get-relational-database-snapshots \
  --query 'relationalDatabaseSnapshots[].{
    Name: name,
    State: state,
    Engine: engine,
    Created: createdAt
  }' \
  --output table

# Delete a snapshot you no longer need
aws lightsail delete-instance-snapshot \
  --instance-snapshot-name old-snapshot-name
```

## Backup Strategy Recommendations

1. **Enable automatic snapshots** on all production instances and databases
2. **Take manual snapshots** before any significant change (upgrades, migrations, config changes)
3. **Copy snapshots to another region** for disaster recovery
4. **Test restores regularly** - a backup you can't restore isn't a backup
5. **Monitor snapshot storage costs** and clean up old snapshots
6. **Document your recovery process** so anyone on the team can perform a restore

## Troubleshooting Checklist

1. Snapshot stuck in "pending"? Large instances take longer - wait it out
2. Restore failed? Check if the target AZ has capacity for the bundle size
3. Data seems old? Verify you're restoring from the right snapshot (check timestamp)
4. Static IP not working after restore? Remember to reassign it to the new instance
5. Application not working after restore? Check that all services are running

Snapshots are your most important safety mechanism on Lightsail. Set up automatic snapshots on day one and never skip manual snapshots before changes. For the complete Lightsail setup, start with our guide on [setting up Lightsail for web applications](https://oneuptime.com/blog/post/2026-02-12-setup-amazon-lightsail-simple-web-applications/view).
