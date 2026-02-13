# How to Set Up RDS Maintenance Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Maintenance, Operations, Database

Description: Learn how to configure RDS maintenance windows to control when AWS applies patches and updates, minimizing impact on your application availability.

---

AWS regularly needs to apply patches, minor version upgrades, and hardware changes to your RDS instances. These operations sometimes require a restart, which means brief downtime. If you don't configure a maintenance window, AWS picks one for you - and it might land right in the middle of your peak traffic hours.

Setting up a proper maintenance window gives you control over when these disruptions happen. Pick a time when traffic is low, users won't notice, and your team is available to respond if something goes wrong.

## What Happens During Maintenance

RDS maintenance can include:

- **OS patches**: Security patches to the underlying operating system
- **Database engine patches**: Bug fixes and security patches to the database engine
- **Hardware changes**: Instance moves to new hardware (rare, but happens)
- **Minor version upgrades**: If you have auto minor version upgrade enabled
- **Certificate rotations**: SSL/TLS certificate updates

Not all maintenance requires downtime. Some patches can be applied without a restart. But when a restart is needed, here's what happens:

- **Single-AZ**: The instance restarts. Expect 5-10 minutes of downtime.
- **Multi-AZ**: The standby gets patched first, then a failover occurs (20-30 seconds of downtime), then the old primary gets patched.

This is one of the strongest arguments for running Multi-AZ in production. The maintenance downtime drops from minutes to seconds.

## Checking Your Current Maintenance Window

```bash
# Check the current maintenance window for an instance
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{MaintenanceWindow:PreferredMaintenanceWindow,PendingMaintenance:PendingModifiedValues}'
```

The maintenance window is displayed in UTC in the format `ddd:hh:mm-ddd:hh:mm` (e.g., `sun:03:00-sun:04:00`).

## Choosing the Right Window

Consider these factors when picking your maintenance window:

**Low traffic period**: Look at your CloudWatch metrics to identify when database load is lowest. For most B2B applications, that's Sunday early morning. For consumer apps, it might be different.

```bash
# Find your lowest-traffic hours over the past week
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --output table
```

**Team availability**: Don't schedule maintenance at 3 AM if nobody is awake to handle issues. Early morning during business days might be better if you have an on-call team.

**Backup window**: The maintenance window shouldn't overlap with the backup window. RDS won't start maintenance during a backup.

**Minimum 30 minutes**: The maintenance window must be at least 30 minutes long. I'd recommend at least 60 minutes to give AWS enough time to complete operations.

## Setting the Maintenance Window

```bash
# Set the maintenance window (time in UTC)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --preferred-maintenance-window "sun:03:00-sun:04:00" \
  --apply-immediately
```

The format is `ddd:hh:mm-ddd:hh:mm` where `ddd` is a three-letter day abbreviation: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`.

For Aurora clusters, set the window on the cluster:

```bash
# Set maintenance window for an Aurora cluster
aws rds modify-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --preferred-maintenance-window "sun:03:00-sun:04:00"
```

## Setting the Backup Window

While you're at it, make sure your backup window doesn't conflict:

```bash
# Set the backup window (should not overlap with maintenance window)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --preferred-backup-window "01:00-02:00" \
  --apply-immediately
```

A good pattern is to run backups first, then maintenance:
- Backup window: 01:00-02:00 UTC
- Maintenance window: 03:00-04:00 UTC

This way you always have a fresh backup before any maintenance changes are applied.

## Checking for Pending Maintenance

AWS schedules maintenance actions in advance. You can see what's pending:

```bash
# Check pending maintenance actions across all instances
aws rds describe-pending-maintenance-actions

# Check for a specific instance
aws rds describe-pending-maintenance-actions \
  --filters "Name=db-instance-id,Values=my-database"
```

The output includes:
- **Action**: What type of maintenance (e.g., `system-update`, `db-upgrade`)
- **Auto Apply Date**: When AWS will apply it if you don't
- **Current Apply Date**: The scheduled date within your maintenance window
- **Description**: Details about the maintenance action

## Applying Maintenance Immediately

If you want to get maintenance out of the way on your own schedule rather than waiting for the window:

```bash
# Apply pending maintenance immediately
aws rds apply-pending-maintenance-action \
  --resource-identifier arn:aws:rds:us-east-1:123456789012:db:my-database \
  --apply-action system-update \
  --opt-in-type immediate
```

The `--opt-in-type` options are:
- `immediate`: Apply right now
- `next-maintenance`: Apply during the next maintenance window
- `undo-opt-in`: Remove a previously scheduled immediate application

## Setting Up Maintenance Notifications

You definitely want to know when maintenance is happening. Set up [event notifications](https://oneuptime.com/blog/post/2026-02-12-enable-rds-event-notifications-via-sns/view) for maintenance events:

```bash
# Subscribe to maintenance events
aws rds create-event-subscription \
  --subscription-name rds-maintenance-alerts \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-notifications \
  --source-type db-instance \
  --event-categories '["maintenance"]' \
  --enabled
```

This sends notifications when:
- Maintenance is pending
- Maintenance is being applied
- Maintenance is complete

## Auto Minor Version Upgrades

RDS can automatically apply minor version upgrades (e.g., PostgreSQL 16.1 to 16.2). This happens during your maintenance window:

```bash
# Enable auto minor version upgrade
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --auto-minor-version-upgrade \
  --apply-immediately

# Or disable it if you want manual control
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --no-auto-minor-version-upgrade \
  --apply-immediately
```

For production, I'd recommend enabling auto minor version upgrades. Minor versions contain security fixes and bug patches that you generally want. For major version upgrades, you always want manual control - see our guide on [upgrading RDS engine versions](https://oneuptime.com/blog/post/2026-02-12-upgrade-rds-engine-versions/view).

## Coordinating Maintenance Across Multiple Instances

If you have a primary and read replicas, or multiple related instances, stagger their maintenance windows so they're not all being patched simultaneously:

```bash
# Primary database: Sunday 03:00-04:00 UTC
aws rds modify-db-instance \
  --db-instance-identifier my-database-primary \
  --preferred-maintenance-window "sun:03:00-sun:04:00"

# Read replica 1: Sunday 04:30-05:30 UTC
aws rds modify-db-instance \
  --db-instance-identifier my-database-replica-1 \
  --preferred-maintenance-window "sun:04:30-sun:05:30"

# Read replica 2: Sunday 06:00-07:00 UTC
aws rds modify-db-instance \
  --db-instance-identifier my-database-replica-2 \
  --preferred-maintenance-window "sun:06:00-sun:07:00"
```

## Reducing Maintenance Impact

Here's a checklist to minimize the impact of maintenance:

1. **Use Multi-AZ**: Reduces downtime from minutes to seconds
2. **Set an appropriate window**: Pick your lowest-traffic period
3. **Enable event notifications**: Know when maintenance is happening
4. **Implement connection retry logic**: Your application should handle brief disconnections gracefully
5. **Stagger related instances**: Don't patch everything at once
6. **Keep a recent backup**: Schedule backups before the maintenance window
7. **Monitor after maintenance**: Check [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view) after maintenance to verify everything is running normally

Maintenance windows are a small configuration detail that makes a big difference in operational predictability. Spend five minutes setting them up properly and you'll avoid surprises when AWS needs to apply the next round of patches.
