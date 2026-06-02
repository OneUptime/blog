# Validation Summary: How to Troubleshoot Aurora Failover Events

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS
- AWS CLI
- Amazon CloudWatch metrics and logs
- Amazon RDS Enhanced Monitoring
- AWS CloudTrail
- Amazon SNS and RDS event subscriptions
- Aurora MySQL and MySQL Performance Schema
- Python and PyMySQL
- Java DNS cache TTL configuration

## Sources Consulted
- Amazon Aurora User Guide: High availability for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Amazon Aurora User Guide: Cluster endpoints for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html
- Amazon Aurora User Guide: Amazon RDS event categories and event messages for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_Events.Messages.html
- AWS CLI Command Reference: describe-events - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- AWS CLI Command Reference: create-event-subscription - https://docs.aws.amazon.com/cli/latest/reference/rds/create-event-subscription.html
- Amazon Aurora User Guide: Viewing OS metrics using CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_Monitoring.OS.CloudWatchLogs.html
- Amazon Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon Aurora User Guide: Aurora MySQL configuration parameters - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ParameterGroups.html
- Amazon Aurora User Guide: Turn on the Performance Schema for Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.EnableMySQL.RDS.html
- PyMySQL API Reference: Connection Object - https://pymysql.readthedocs.io/en/latest/modules/connections.html

## Issues Found
- Corrected Aurora failover timing from "typically takes 15-30 seconds" to AWS's documented guidance that service is typically restored in less than 60 seconds and often less than 30 seconds.
- Corrected endpoint wording from "old writer endpoint DNS record" to "cluster endpoint DNS record" to match Aurora's documented writer endpoint behavior.
- Replaced imprecise failover event messages with documented Aurora event messages such as "Completed failover to DB instance" and same-AZ/cross-AZ failover start messages.
- Corrected the Enhanced Monitoring CloudWatch Logs example to use the DB instance or cluster resource identifier (`DbiResourceId`) as the log stream prefix, not the DB instance identifier.
- Changed the memory parameter inspection command from `describe-db-cluster-parameters` to `describe-db-parameters` because `innodb_buffer_pool_size`, `max_connections`, and `table_open_cache` are instance-level Aurora MySQL parameters.
- Clarified that the Performance Schema SQL only enables statement instruments when Performance Schema is already enabled; enabling or disabling Performance Schema itself requires parameter-group configuration and a DB instance reboot.
- Replaced the storage-limit indicator with `AuroraVolumeBytesLeftTotal` approaching zero for Aurora MySQL, which AWS recommends over comparing `VolumeBytesUsed` with the storage limit.
- Fixed PyMySQL examples by removing the unsupported `ping=True` connection argument and avoiding deprecated `ping(reconnect=True)`. The retry example now validates existing connections with `ping(reconnect=False)` and creates a new connection when needed.

## Review Notes
- The AWS CLI is not installed in this local environment, so CLI verification was performed against the official AWS CLI command reference and Aurora documentation.
- Python code blocks were parsed successfully with Python AST after the fixes.
