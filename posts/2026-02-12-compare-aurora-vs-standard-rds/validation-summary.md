# Validation Summary: How to Compare Aurora vs Standard RDS

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS for MySQL
- Amazon RDS for PostgreSQL
- AWS CLI
- Amazon CloudWatch metrics
- MySQL replication status commands
- RDS Multi-AZ deployments

## Sources Consulted
- Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora quotas and size limits: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- Amazon Aurora high availability and failover: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Amazon Aurora replication: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- Amazon RDS storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- RDS for PostgreSQL read replica configuration: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.Configuration.html
- Monitoring replication lag for MySQL read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_MySQL.Replication.ReadReplicas.Monitor.html
- RDS Multi-AZ failover: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- AWS CLI failover-db-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/failover-db-cluster.html
- AWS CLI describe-events command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- AWS CLI CloudWatch get-metric-statistics command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- MySQL SHOW REPLICA STATUS reference: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- Aurora Backtrack documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html
- Aurora MySQL Parallel Query documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query.html
- Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- RDS for MySQL pricing: https://aws.amazon.com/rds/mysql/pricing/

## Issues Found
- The Standard RDS architecture explanation implied that instance failure recovery always creates a replacement instance and attaches the same EBS volume. Updated it to distinguish Single-AZ recovery from Multi-AZ failover to a synchronous standby.
- The MySQL replica lag command used `SHOW SLAVE STATUS`, which is deprecated in MySQL 8.0.22 and later. Updated it to `SHOW REPLICA STATUS`.
- The storage comparison listed Aurora's maximum storage as 128 TB. Updated it to note 128 TiB for many versions and 256 TiB for newer Aurora MySQL and PostgreSQL versions.
- The storage comparison used uppercase storage type names and omitted io2 Block Express wording. Updated the names to current AWS storage type names.
- The Aurora failover section stated failover typically completes under 30 seconds and often under 15 seconds. Updated it to match AWS documentation: typically less than 60 seconds and often less than 30 seconds when an Aurora Replica is available.
- The Aurora-only feature list did not mention that Backtrack is Aurora MySQL only and unavailable for Aurora PostgreSQL. Added that caveat.
- The Aurora-only feature list described Parallel Query too broadly. Updated it to identify Aurora MySQL analytic queries.
- The compute pricing section gave a fixed 20-30% premium. Updated it to explain that pricing depends on engine, Region, and deployment model.
- The decision framework said Aurora should be chosen when more than two read replicas are needed, but standard RDS supports up to 15 read replicas for supported engines. Updated the decision point and bullet to focus on Aurora's low-lag shared-storage reader endpoint instead.

## Review Notes
The monthly pricing block is still a rough illustrative estimate and should be recalculated for the target Region, database engine, instance family, deployment model, and current AWS pricing before being used for procurement decisions.
