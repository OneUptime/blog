# How to Configure RDS Parameter Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Performance Tuning

Description: Learn how to create and configure RDS parameter groups to tune database engine settings for optimal performance and behavior.

---

Parameter groups in RDS are how you configure the database engine itself. They're the equivalent of editing mysql.cnf, postgresql.conf, or similar configuration files, but managed through AWS. Every RDS instance has a parameter group, and while the defaults work for many workloads, tuning them can significantly improve performance. Let's walk through how parameter groups work and the most impactful settings for each engine.

## How Parameter Groups Work

Every RDS instance is associated with a DB parameter group. The default parameter group for each engine family is read-only - you can't modify it. To change parameters, you create a custom parameter group, modify the settings, and attach it to your instance.

Parameters fall into two categories:

- **Dynamic parameters**: Take effect immediately without a reboot
- **Static parameters**: Require a reboot to take effect

This distinction matters. Changing a static parameter means scheduling downtime.

## Creating a Custom Parameter Group

Start by creating a parameter group for your engine.

This creates a custom parameter group for PostgreSQL 16.

```bash
aws rds create-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --db-parameter-group-family postgres16 \
  --description "Custom parameters for production PostgreSQL"
```

For other engines:

```bash
# MySQL 8.0
aws rds create-db-parameter-group \
  --db-parameter-group-name my-mysql-params \
  --db-parameter-group-family mysql8.0 \
  --description "Custom parameters for production MySQL"

# MariaDB 10.11
aws rds create-db-parameter-group \
  --db-parameter-group-name my-mariadb-params \
  --db-parameter-group-family mariadb10.11 \
  --description "Custom parameters for production MariaDB"
```

## Modifying Parameters

Use the modify command to change parameter values.

This modifies several PostgreSQL parameters for better performance.

```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --parameters \
    "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory/4},ApplyMethod=pending-reboot" \
    "ParameterName=work_mem,ParameterValue=65536,ApplyMethod=immediate" \
    "ParameterName=maintenance_work_mem,ParameterValue=524288,ApplyMethod=immediate" \
    "ParameterName=effective_cache_size,ParameterValue={DBInstanceClassMemory*3/4},ApplyMethod=pending-reboot" \
    "ParameterName=random_page_cost,ParameterValue=1.1,ApplyMethod=immediate" \
    "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate"
```

Notice the `{DBInstanceClassMemory/4}` syntax. This is a formula that RDS evaluates based on the instance class. It means "one quarter of the instance's total memory." This is better than hardcoding values because the parameter automatically adjusts if you resize the instance.

## Applying the Parameter Group

Attach the custom parameter group to your instance.

```bash
aws rds modify-db-instance \
  --db-instance-identifier my-db \
  --db-parameter-group-name my-postgres-params \
  --apply-immediately
```

After attaching, check if a reboot is needed.

```bash
aws rds describe-db-instances \
  --db-instance-identifier my-db \
  --query 'DBInstances[0].DBParameterGroups[0].ParameterApplyStatus'
```

If the status is "pending-reboot," you need to reboot the instance for static parameter changes to take effect.

```bash
aws rds reboot-db-instance \
  --db-instance-identifier my-db
```

## Key PostgreSQL Parameters

Here are the most impactful PostgreSQL parameters to tune.

### Memory Parameters

These control how PostgreSQL allocates memory.

```
shared_buffers = {DBInstanceClassMemory/4}
  # Main memory cache for data pages. Set to 25% of instance memory.
  # Static - requires reboot.

effective_cache_size = {DBInstanceClassMemory*3/4}
  # Hint to the query planner about available OS cache.
  # Set to 75% of instance memory. Doesn't allocate memory.
  # Static - requires reboot.

work_mem = 65536  (64 MB in KB)
  # Memory per sort/hash operation per query.
  # Be careful - complex queries with many sorts can use multiples of this.
  # Dynamic - takes effect immediately.

maintenance_work_mem = 524288  (512 MB in KB)
  # Memory for maintenance operations like VACUUM and CREATE INDEX.
  # Dynamic - takes effect immediately.
```

### Query Planner

These help the planner make better decisions for SSDs.

```
random_page_cost = 1.1
  # Cost of a random page fetch. Default is 4.0 (for spinning disks).
  # Set to 1.1 for SSD storage (all RDS storage is SSD).
  # Dynamic.

effective_io_concurrency = 200
  # Number of concurrent I/O operations. Higher for SSDs.
  # Static - requires reboot.
```

### Logging

Configure logging for debugging and monitoring.

```
log_min_duration_statement = 1000
  # Log queries that take longer than 1000ms (1 second).
  # Dynamic. Set to 0 to log all queries (very verbose).

log_statement = 'ddl'
  # Log DDL statements (CREATE, ALTER, DROP).
  # Options: none, ddl, mod, all. Dynamic.

log_connections = 1
  # Log new connections. Useful for monitoring. Dynamic.
```

## Key MySQL Parameters

For MySQL, these are the parameters that matter most.

This modifies critical MySQL parameters.

```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-mysql-params \
  --parameters \
    "ParameterName=innodb_buffer_pool_size,ParameterValue={DBInstanceClassMemory*3/4},ApplyMethod=pending-reboot" \
    "ParameterName=innodb_log_file_size,ParameterValue=1073741824,ApplyMethod=pending-reboot" \
    "ParameterName=innodb_flush_log_at_trx_commit,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=max_connections,ParameterValue=500,ApplyMethod=immediate" \
    "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=long_query_time,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=innodb_io_capacity,ParameterValue=3000,ApplyMethod=immediate" \
    "ParameterName=innodb_io_capacity_max,ParameterValue=6000,ApplyMethod=immediate"
```

Key MySQL settings explained:

```
innodb_buffer_pool_size = {DBInstanceClassMemory*3/4}
  # InnoDB's main memory cache. Set to 75% of memory.
  # This is the single most impactful MySQL parameter.

innodb_log_file_size = 1073741824  (1 GB)
  # Size of InnoDB redo log files. Larger = better write performance
  # but longer crash recovery. 1 GB is good for most production.

max_connections = 500
  # Maximum client connections. Default varies by instance size.
  # Each connection uses about 10 MB of memory.

slow_query_log = 1
  # Enable slow query logging.

long_query_time = 1
  # Queries longer than 1 second are logged as slow.

innodb_io_capacity = 3000
  # Estimated IOPS capability. Match to your storage IOPS.
```

## Viewing Current Parameters

Check what parameters are currently set.

This lists all non-default parameter values.

```bash
# List all parameters (filtered for modified ones)
aws rds describe-db-parameters \
  --db-parameter-group-name my-postgres-params \
  --query 'Parameters[?Source!=`system`].{Name:ParameterName,Value:ParameterValue,ApplyType:ApplyType}' \
  --output table
```

You can also check a specific parameter.

```bash
aws rds describe-db-parameters \
  --db-parameter-group-name my-postgres-params \
  --query 'Parameters[?ParameterName==`shared_buffers`]'
```

## Comparing Parameter Groups

When troubleshooting, it's useful to compare parameter groups.

This script compares two parameter groups and shows differences.

```python
import boto3

rds = boto3.client('rds')

def get_params(group_name):
    params = {}
    paginator = rds.get_paginator('describe_db_parameters')
    for page in paginator.paginate(DBParameterGroupName=group_name):
        for param in page['Parameters']:
            if 'ParameterValue' in param:
                params[param['ParameterName']] = param['ParameterValue']
    return params

default_params = get_params('default.postgres16')
custom_params = get_params('my-postgres-params')

# Find differences
for key in custom_params:
    if key in default_params and custom_params[key] != default_params[key]:
        print(f"{key}:")
        print(f"  Default: {default_params[key]}")
        print(f"  Custom:  {custom_params[key]}")
```

## Terraform Example

Managing parameter groups with Terraform makes changes reviewable and repeatable.

This Terraform configuration defines a PostgreSQL parameter group with production-tuned settings.

```hcl
resource "aws_db_parameter_group" "postgres" {
  name   = "production-postgres-params"
  family = "postgres16"

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "work_mem"
    value = "65536"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "immediate"
  }

  tags = {
    Environment = "production"
  }
}
```

## Best Practices

1. **Never modify the default parameter group**: Always create custom groups. This makes it clear what you've changed.
2. **Use formulas, not hardcoded values**: `{DBInstanceClassMemory/4}` adapts when you resize. Hardcoded values don't.
3. **Document your changes**: Add descriptions or tags explaining why each parameter was changed.
4. **Test changes in dev first**: Parameter changes can cause unexpected behavior. Test in non-production first.
5. **Monitor after changes**: Watch CloudWatch metrics after any parameter change to verify the impact.

For monitoring the impact of parameter changes, set up [CloudWatch alerting](https://oneuptime.com/blog/post/aws-cloudwatch-alerting/view) to catch any performance regressions.

## Wrapping Up

Parameter groups are how you unlock the full performance potential of your RDS instance. The defaults are conservative and work for many workloads, but production databases almost always benefit from tuning memory allocation, logging, and I/O settings. Start with the parameters covered in this guide, measure the impact, and iterate. Just remember that static parameters require a reboot, so plan changes around maintenance windows.
