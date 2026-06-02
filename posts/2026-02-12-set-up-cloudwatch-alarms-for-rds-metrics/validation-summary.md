# Validation Summary: How to Set Up CloudWatch Alarms for RDS Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Amazon CloudWatch metrics and alarms
- Amazon SNS notifications
- AWS CLI
- Python boto3

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: `cloudwatch set-alarm-state` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/set-alarm-state.html
- AWS CLI Command Reference: `sns subscribe` - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Amazon RDS User Guide: CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS User Guide: Managing capacity automatically with Amazon RDS storage autoscaling - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- Amazon RDS User Guide: Quotas and constraints for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Boto3 documentation: CloudWatch `put_metric_alarm` - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/put_metric_alarm.html
- Boto3 documentation: RDS `describe_db_instances` - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/describe_db_instances.html

## Issues Found
- The low-storage section said running out of disk space would "crash your database" and that RDS does not auto-expand storage by default. Updated this to say low storage can put the database into a storage-full state, and clarified that storage autoscaling only expands storage when enabled and within its configured maximum threshold.
- The database connections example tied `db.r6g.large` to a default `max_connections` value around 700. That value is engine- and memory-calculation-dependent, so the comment now presents 700 only as an example `max_connections` setting.
- The swap section said any swap usage is a bad sign and necessarily means the database has run out of RAM. Updated this to focus on sustained or growing swap usage and memory pressure, which is a more accurate operational interpretation.

## Review Notes
The AWS CLI commands use current option names and valid CloudWatch alarm syntax. The RDS metric names and units for CPU, free storage, freeable memory, database connections, read/write latency, replication lag, and swap usage match the current Amazon RDS CloudWatch metrics documentation. The Python boto3 example uses valid client calls, though production scripts should paginate `describe_db_instances` if an account has enough DB instances to require multiple result pages.
