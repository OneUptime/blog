# How to Fix Error Modifying RDS Instance InvalidDBInstanceState

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Database, Troubleshooting

Description: Learn how to resolve the InvalidDBInstanceState error when modifying RDS instances with Terraform, including handling maintenance windows, backups, and instance states.

---

The `InvalidDBInstanceState` error occurs when Terraform tries to modify an RDS instance that is not in an available state. RDS instances go through various states during operations like backups, maintenance, scaling, and snapshots. If Terraform tries to make a change while the instance is in one of these transitional states, AWS rejects the modification.

## What the Error Looks Like

```text
Error: error modifying RDS DB Instance (my-database):
InvalidDBInstanceState: Instance my-database is not currently
available. Please try again later.
    status code: 400, request id: abc123-def456
```

Or sometimes:

```text
Error: error modifying RDS DB Instance (my-database):
InvalidDBInstanceState: Cannot modify a DB instance that is
currently being modified.
```

## Understanding RDS Instance States

An RDS instance can be in many states. Here are the common ones:

- **available** - Normal operation, modifications are allowed
- **backing-up** - Automated or manual backup in progress
- **modifying** - A modification is already in progress
- **rebooting** - Instance is restarting
- **starting** - Instance is starting from a stopped state
- **stopping** - Instance is being stopped
- **stopped** - Instance is stopped
- **storage-optimization** - Storage scaling in progress
- **maintenance** - Maintenance is being applied
- **upgrading** - Engine version upgrade in progress

You can only modify an instance when it is in the `available` state (with some exceptions). Any other state will result in the `InvalidDBInstanceState` error.

## Common Causes and Fixes

### 1. Automated Backup in Progress

RDS performs daily automated backups during the backup window. If your Terraform run coincides with this window, modifications will fail.

**Check the current state:**

```bash
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query "DBInstances[0].DBInstanceStatus"
```

**Fix:** Wait for the backup to complete and run Terraform again. Or schedule your Terraform runs outside the backup window:

```hcl
resource "aws_db_instance" "database" {
  identifier     = "my-database"
  # Set backup window to a time when you do not run Terraform
  backup_window  = "03:00-04:00"  # 3 AM to 4 AM UTC
  # ...
}
```

### 2. Previous Modification Still In Progress

If you previously applied a modification that requires a reboot or is still being applied, the instance will be in the `modifying` state:

```bash
# Check for pending modifications
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query "DBInstances[0].PendingModifiedValues"
```

**Fix:** Wait for the current modification to complete. You can monitor the status:

```bash
# Watch the status until it becomes available
watch -n 10 'aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text'
```

### 3. Maintenance Window Conflict

AWS applies maintenance during the defined maintenance window. If your Terraform run overlaps:

```hcl
resource "aws_db_instance" "database" {
  identifier          = "my-database"
  # Set maintenance window to a convenient time
  maintenance_window  = "Sun:04:00-Sun:05:00"
  # ...
}
```

### 4. Instance Is Stopped

If the RDS instance is stopped, most modifications are not allowed:

```bash
# Check if the instance is stopped
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query "DBInstances[0].DBInstanceStatus"
# Output: "stopped"
```

**Fix:** Start the instance first:

```bash
aws rds start-db-instance --db-instance-identifier my-database
```

Or manage the instance lifecycle in Terraform. Note that Terraform does not have a native way to stop/start RDS instances, so you might need to handle this outside of Terraform or use a `null_resource` with a local-exec provisioner.

### 5. Storage Scaling In Progress

If you previously changed the storage size or type, the instance may be in `storage-optimization` state, which can last for hours:

```bash
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query "DBInstances[0].DBInstanceStatus"
# Output: "storage-optimization"
```

**Fix:** Wait for storage optimization to complete. This process cannot be interrupted or accelerated. Depending on the amount of data, it could take anywhere from minutes to several hours.

### 6. Trying to Modify During a Failover

Multi-AZ instances go through a failover state during planned or unplanned failovers:

```bash
aws rds describe-events \
  --source-identifier my-database \
  --source-type db-instance \
  --duration 60
```

**Fix:** Wait for the failover to complete and the instance to return to `available` state.

## Terraform Strategies for Handling This Error

### Use apply_immediately Carefully

By default, some RDS modifications are applied during the next maintenance window. If you want them applied right away:

```hcl
resource "aws_db_instance" "database" {
  identifier        = "my-database"
  instance_class    = "db.t3.medium"
  apply_immediately = true  # Apply changes right away instead of waiting
  # ...
}
```

Be cautious with `apply_immediately` in production, as some changes cause a brief outage during the reboot.

### Batch Your Changes

Instead of making multiple small Terraform changes, batch them into a single apply. Each modification puts the instance into a `modifying` state, and you cannot make another change until the first one completes:

```hcl
# Make all changes at once
resource "aws_db_instance" "database" {
  identifier          = "my-database"
  instance_class      = "db.t3.large"     # Changed
  allocated_storage   = 100               # Changed
  engine_version      = "8.0.35"          # Changed
  apply_immediately   = true
  # ...
}
```

### Add Retry Logic with Timeouts

Terraform has built-in timeout support for RDS operations:

```hcl
resource "aws_db_instance" "database" {
  identifier     = "my-database"
  instance_class = "db.t3.medium"
  # ...

  timeouts {
    create = "60m"
    update = "60m"
    delete = "60m"
  }
}
```

This gives Terraform more time to wait for operations to complete rather than timing out immediately.

### Use Lifecycle Rules

For changes that should not trigger a modification, use `ignore_changes`:

```hcl
resource "aws_db_instance" "database" {
  identifier     = "my-database"
  # ...

  lifecycle {
    ignore_changes = [
      engine_version,  # Managed manually or by AWS
    ]
  }
}
```

## Recovering from a Failed Modification

If a modification fails and the instance is stuck in a bad state:

1. **Check the RDS events log:**

```bash
aws rds describe-events \
  --source-identifier my-database \
  --source-type db-instance \
  --duration 1440  # Last 24 hours
```

2. **Try rebooting the instance:**

```bash
aws rds reboot-db-instance --db-instance-identifier my-database
```

3. **If the instance is stuck in a modifying state**, contact AWS Support. Some stuck states require AWS intervention to resolve.

## Monitoring RDS Instance State

Set up proactive monitoring with [OneUptime](https://oneuptime.com) to track your RDS instance states. Getting notified when an instance enters an unexpected state (like being stuck in `modifying` for too long) lets you intervene before it affects your Terraform pipelines or application availability.

## Practical Tips

1. **Schedule Terraform runs around backup and maintenance windows.** Know when your backups run and avoid scheduling CI/CD pipelines during those times.

2. **Use `terraform plan` first.** If the plan shows an in-place modification to an RDS instance, check the instance state before applying.

3. **Be patient with storage modifications.** Storage scaling is a background operation that takes time. Plan your storage changes well in advance.

4. **Tag your modification patterns.** If you know certain changes cause long modification periods (like storage scaling), document them for your team.

## Conclusion

The `InvalidDBInstanceState` error simply means the RDS instance is busy doing something else. Check the current state, wait for it to become `available`, and then retry your Terraform operation. To prevent this error in your CI/CD pipelines, schedule runs outside of backup and maintenance windows, batch your changes together, and use appropriate timeout values.
