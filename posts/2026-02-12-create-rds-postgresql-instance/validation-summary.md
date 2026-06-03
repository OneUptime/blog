# Validation Summary: How to Create an RDS PostgreSQL Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS for PostgreSQL
- AWS CLI
- PostgreSQL SQL roles and privileges
- PostgreSQL extensions
- Amazon CloudWatch Logs and metrics
- Amazon Aurora PostgreSQL

## Sources Consulted
- AWS CLI Command Reference: `aws rds create-db-instance` - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS DB instance storage - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- RDS for PostgreSQL database log files - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- Available PostgreSQL database versions / RDS for PostgreSQL release notes - https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Using PostgreSQL extensions with Amazon RDS for PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html
- Supported PostgreSQL extension versions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.Extensions.html
- Setting up and enabling Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- Amazon Aurora features - https://aws.amazon.com/rds/aurora/features/
- Amazon Aurora FAQs - https://aws.amazon.com/rds/aurora/faqs/
- Amazon Aurora storage - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora DB clusters - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html
- PostgreSQL GRANT documentation - https://www.postgresql.org/docs/current/sql-grant.html

## Issues Found
- The post recommended the latest PostgreSQL 16.x version. RDS now supports newer PostgreSQL major versions, so this was changed to recommend the latest RDS-supported PostgreSQL major version unless compatibility constraints apply.
- The gp3 storage table and CLI command provisioned custom IOPS and throughput for a 100 GiB PostgreSQL gp3 instance. AWS documents that for PostgreSQL gp3, additional provisioned IOPS and throughput are available only at 400 GiB or higher. The staging row was changed to baseline gp3 performance, and the CLI example was changed to 500 GiB with 12,000 IOPS and 500 MiB/s throughput.
- The CLI example used PostgreSQL engine version 16.4. This version is still available, but the example was updated to PostgreSQL 18.4 to align with current RDS-supported versions.
- The PostgreSQL role setup granted table privileges but not sequence privileges. PostgreSQL table grants do not automatically grant privileges on sequences, so sequence grants and default sequence privileges were added for both application and read-only roles.
- The Aurora PostgreSQL comparison claimed up to 5x PostgreSQL throughput, 128 TB storage, sub-10ms replica lag, and failover in under 30 seconds. AWS currently describes Aurora as up to 3x PostgreSQL throughput on similar hardware, storage scaling up to 256 TiB, replica lag usually around 10-20ms, and failover typically completing within 30 seconds. The bullets were corrected.

## Review Notes
The AWS CLI command syntax, RDS PostgreSQL log export value, Enhanced Monitoring flags, connectivity guidance, PostgreSQL extension examples, and internal OneUptime links were otherwise technically plausible. The example still uses a literal master password for readability; in production, the post correctly recommends AWS Secrets Manager.
