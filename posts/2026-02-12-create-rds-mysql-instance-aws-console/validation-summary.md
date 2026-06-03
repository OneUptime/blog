# Validation Summary: How to Create an RDS MySQL Instance from the AWS Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS for MySQL
- AWS Management Console
- Amazon VPC and security groups
- AWS Secrets Manager
- CloudWatch and Enhanced Monitoring
- MySQL client and SQL user management

## Sources Consulted
- AWS RDS User Guide: Creating an Amazon RDS DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.html
- AWS RDS User Guide: Amazon RDS DB instance storage - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- AWS RDS User Guide: Hardware specifications for DB instance classes - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html
- AWS RDS User Guide: Password management with Amazon RDS and AWS Secrets Manager - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- AWS RDS User Guide: Failing over a Multi-AZ DB instance for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- AWS RDS User Guide: Backup retention period - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- AWS RDS User Guide: Database authentication with Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/database-authentication.html
- AWS RDS User Guide: IAM database authentication support - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.IamDatabaseAuthentication.html
- AWS RDS User Guide: Kerberos authentication for Amazon RDS for MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-kerberos.html
- AWS RDS for MySQL pricing - https://aws.amazon.com/rds/mysql/pricing/
- MySQL 8.4 Reference Manual: CREATE USER statement - https://dev.mysql.com/doc/refman/8.4/en/create-user.html

## Issues Found
- Corrected the `db.t3.micro` specification from 1 vCPU to 2 vCPU. AWS documents `db.t3.micro` as 2 vCPU and 1 GiB memory.
- Updated the Free tier template description to avoid implying that only `db.t3.micro` is eligible. AWS currently lists both `db.t3.micro` and `db.t4g.micro` as free tier eligible for supported engines.
- Corrected gp3 storage guidance for RDS MySQL. For 20-399 GiB MySQL volumes, gp3 provides 3,000 IOPS and 125 MiB/s baseline performance, but additional IOPS and throughput provisioning applies at larger storage sizes.
- Corrected the storage comparison table. The previous io1 row understated current RDS Provisioned IOPS limits and omitted that provisioned IOPS storage is billed for both storage and IOPS. The Magnetic row now notes that magnetic storage is legacy and deprecated.
- Removed `FLUSH PRIVILEGES` from the SQL example. `CREATE USER` and `GRANT` take effect without manually reloading grant tables, so the statement was unnecessary for the shown account-management workflow.
- Reworded the production cost example to avoid a narrow dollar estimate that varies significantly with provisioned IOPS and current regional pricing.

## Review Notes
Most console workflow, networking, Secrets Manager, Multi-AZ failover, IAM/Kerberos authentication, backup retention, and MySQL connection guidance matched current official documentation. Pricing remains region- and usage-dependent, so the post correctly points readers to the AWS Pricing Calculator for current estimates.
