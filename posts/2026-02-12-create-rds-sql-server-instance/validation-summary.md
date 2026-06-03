# Validation Summary: How to Create an RDS SQL Server Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS for Microsoft SQL Server
- AWS CLI
- Microsoft SQL Server
- T-SQL
- Amazon EBS / RDS storage
- AWS Managed Microsoft AD and Active Directory authentication
- Amazon CloudWatch Logs

## Sources Consulted
- Amazon RDS for Microsoft SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html
- Microsoft SQL Server versions on Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.VersionSupport.html
- Licensing Microsoft SQL Server on Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.Licensing.html
- RDS Custom for SQL Server Bring Your Own Media: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-sqlserver.byom.html
- DB instance class support for Microsoft SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.InstanceClasses.html
- Multi-AZ deployments for Amazon RDS for Microsoft SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_SQLServerMultiAZ.html
- Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Working with storage in RDS for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.CommonDBATasks.DatabaseStorage.html
- AWS CLI create-db-instance reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Native backup and restore in SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.Options.BackupRestore.html
- Transparent Data Encryption in SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.Options.TDE.html
- Using SQL Server Agent for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.CommonDBATasks.Agent.html
- Working with Active Directory with RDS for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/User.SQLServer.ActiveDirectoryWindowsAuth.html

## Issues Found
- Corrected the licensing section. Standard Amazon RDS for SQL Server is License Included; Bring Your Own Media is an RDS Custom for SQL Server model, not a standard RDS SQL Server BYOL option.
- Corrected the SQL Server Enterprise edition description so it does not imply Enterprise is uniquely tied to Always On availability groups on RDS.
- Corrected Multi-AZ wording to include Database Mirroring, Always On availability groups, and block-level replication where supported.
- Corrected SQL Server storage minimums. RDS for SQL Server has a 20 GiB minimum across Express, Web, Standard, and Enterprise for supported storage types, not 200 GiB for Enterprise.
- Corrected minimum instance class examples. Standard and Enterprise editions do not support the smaller classes listed in the original table for current SQL Server 2022 support.
- Corrected the storage note. RDS for SQL Server now supports additional storage volumes in supported configurations, so the post should not say data and log files can never be separated.
- Updated the CLI example to use the current latest SQL Server 2022 RDS engine version listed in AWS documentation as of June 3, 2026.
- Corrected the Windows Authentication section to include both AWS Managed Microsoft AD and self-managed Active Directory support.
- Corrected TDE support. SQL Server 2022 Standard and Enterprise support TDE on RDS; older versions have edition-specific support.
- Corrected SQL Server Agent support to note that it applies to Enterprise, Standard, and Web editions, not Express.

## Review Notes
The AWS CLI examples are syntactically consistent with the current AWS CLI documentation. The example resource IDs, passwords, endpoint names, security group IDs, and IAM role ARN are placeholders and must be replaced before use.
