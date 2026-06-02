# Validation Summary: How to Set Up RDS Custom for SQL Server Workloads

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Amazon RDS Custom for SQL Server
- AWS CLI
- AWS IAM instance profiles
- Amazon VPC security groups and DB subnet groups
- AWS KMS
- AWS Systems Manager Session Manager
- Microsoft SQL Server Agent
- SQL Server linked servers
- SQL Server CLR assemblies
- Amazon CloudWatch and Enhanced Monitoring

## Sources Consulted
- Amazon RDS User Guide: Creating and connecting to a DB instance for Amazon RDS Custom for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-creating-sqlserver.html
- Amazon RDS User Guide: Setting up your environment for Amazon RDS Custom for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-setup-sqlserver.html
- Amazon RDS User Guide: Pausing and resuming RDS Custom automation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-managing-sqlserver.pausing.html
- Amazon RDS User Guide: Requirements and limitations for Amazon RDS Custom for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-reqs-limits-MS.html
- Amazon RDS User Guide: Connecting to your RDS Custom DB instance using RDP: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-creating-sqlserver.rdp.html
- Amazon RDS User Guide: Connecting to your RDS Custom DB instance using AWS Systems Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-creating-sqlserver.ssm.html
- Amazon RDS User Guide: Using SQL Server Agent for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.CommonDBATasks.Agent.html
- Amazon RDS User Guide: Features not supported and features with limited support for RDS for SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.FeatureNonSupport.html
- Amazon RDS User Guide: Monitoring OS metrics with Enhanced Monitoring: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html
- Microsoft Learn: SQL Server Native Client deprecation guidance: https://learn.microsoft.com/en-us/sql/relational-databases/native-client/sql-server-native-client
- Microsoft Learn: sp_addlinkedserver Transact-SQL reference: https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-addlinkedserver-transact-sql

## Issues Found
- The tag list used "Window" instead of "Windows". Changed the tag to "Windows".
- The IAM role and instance profile names did not match AWS's documented manual setup names for RDS Custom for SQL Server. Updated them to `AWSRDSCustomSQLServerInstanceRole` and `AWSRDSCustomSQLServerInstanceProfile`.
- The `create-db-instance` example included `--license-model license-included`, but AWS documentation does not use this option for RDS Custom DB instance creation. Removed it from the command.
- The automation pause command used `--automation-mode full`, which resumes automation instead of pausing it. Changed the pause example to `--automation-mode all-paused`.
- The automation resume command used `--automation-mode all-paused` with a zero-minute resume value. Changed it to `--automation-mode full`, matching AWS documentation.
- The linked server example used `SQLNCLI`, which Microsoft marks as deprecated and not recommended for new development. Changed the provider to `MSOLEDBSQL`.
- The monitoring section claimed that RDS Custom for SQL Server supports Performance Insights and showed a Performance Insights enablement command. AWS documents Performance Insights and Database Insights as unsupported for RDS Custom for SQL Server, so the section now references CloudWatch metrics and Enhanced Monitoring and uses an Enhanced Monitoring example.
- The post said you can install "any Windows software" through RDP. Narrowed this to compatible Windows software that stays within the RDS Custom support perimeter.
- The summary overstated that standard RDS cannot support SQL Server Agent, linked servers, or CLR at all. Standard RDS has SQL Server Agent support and limited linked server and CLR support, so the wording now focuses on OS-level Agent workflows, linked-server providers, and CLR scenarios beyond standard RDS support.

## Review Notes
- The sample SQL Server version `15.00.4355.3.v1` is still listed by AWS as a SQL Server 2019 engine version, though newer SQL Server 2019 versions are available.
- The Enhanced Monitoring command assumes that the `rds-monitoring-role` IAM role already exists with the required RDS monitoring permissions.
