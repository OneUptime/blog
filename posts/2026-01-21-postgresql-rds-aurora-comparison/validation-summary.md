# Validation Summary: Amazon RDS vs Aurora vs Self-Hosted PostgreSQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- Amazon RDS for PostgreSQL
- Amazon Aurora PostgreSQL
- AWS CLI
- Amazon EC2 self-hosting

## Sources Consulted
- Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Working with Amazon RDS for PostgreSQL read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- Amazon RDS create-db-instance AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon Aurora overview: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html
- Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora high availability: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Amazon Aurora replication: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- Amazon Aurora PostgreSQL replication: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Replication.html
- Amazon Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- Failing over a Multi-AZ DB instance for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- PostgreSQL limits: https://www.postgresql.org/docs/current/limits.html

## Issues Found
- The Quick Comparison table listed Aurora PostgreSQL maximum storage as 128 TB. Current AWS documentation says Aurora cluster volumes can grow to 256 TiB for supported engine versions, so this was updated to 256 TB.
- The Quick Comparison table listed RDS PostgreSQL read replicas as 5. Current AWS documentation and CLI references describe up to 15 read replicas for PostgreSQL, so this was updated to 15.
- The Quick Comparison table listed self-hosted maximum storage as "Unlimited." PostgreSQL database size has no hard database-size limit, but practical limits such as disk space apply, so this was changed to "Hardware dependent."
- The RDS cons said storage performance was tied to the instance. RDS storage performance also depends on storage type and provisioned settings, so this was clarified.
- The AWS CLI examples used `secret` as the master password. That is too short for RDS PostgreSQL and Aurora PostgreSQL password constraints, so both examples now use `ExamplePassword123`.
- The HA cost row listed Aurora Multi-AZ as `1.3x`. Aurora pricing charges for database instances, and replicas add compute cost, so this was changed to "Varies (replicas add compute cost)."

## Review Notes
The cost comparison remains approximate and region/workload dependent. For production planning, AWS Pricing Calculator should be used because Aurora Standard, Aurora I/O-Optimized, storage, I/O, backup, data transfer, and reserved capacity choices can materially change totals.
