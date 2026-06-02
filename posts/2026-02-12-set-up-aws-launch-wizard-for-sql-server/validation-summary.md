# Validation Summary: How to Set Up AWS Launch Wizard for SQL Server

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Launch Wizard
- Amazon EC2
- AWS IAM
- Amazon S3
- Amazon EBS
- Amazon CloudWatch
- AWS Managed Microsoft AD / Active Directory
- Windows Server Failover Clustering
- Microsoft SQL Server Always On Availability Groups
- Amazon RDS for SQL Server

## Sources Consulted
- AWS Launch Wizard for SQL Server User Guide: https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sql.html
- Get started with AWS Launch Wizard for SQL Server: https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-getting-started.html
- AWS CLI `launch-wizard` command reference: https://docs.aws.amazon.com/cli/latest/reference/launch-wizard/index.html
- AWS CLI `list-deployments` command reference: https://docs.aws.amazon.com/cli/latest/reference/launch-wizard/list-deployments.html
- AWS CLI `get-deployment` command reference: https://docs.aws.amazon.com/cli/latest/reference/launch-wizard/get-deployment.html
- AWS CLI `list-deployment-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/launch-wizard/list-deployment-events.html
- AWS Launch Wizard managed policies: https://docs.aws.amazon.com/launchwizard/latest/userguide/security-iam-awsmanpol.html
- Microsoft SQL Server backup to URL for S3-compatible object storage: https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-backup-to-url-s3-compatible-object-storage
- Amazon RDS for SQL Server User Guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html
- Amazon RDS for SQL Server unsupported and limited features: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.FeatureNonSupport.html
- Amazon RDS for SQL Server Agent documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.CommonDBATasks.Agent.html

## Issues Found
- Fixed the AWS CLI service namespace from `aws launchwizard` to `aws launch-wizard`; the documented AWS CLI namespace includes the hyphen.
- Corrected the Launch Wizard architecture diagram so the SQL Server instances are also the WSFC nodes, instead of showing separate WSFC-only nodes.
- Clarified that Launch Wizard uses two Availability Zones for Windows SQL Server deployments, with an optional third AZ for additional SQL cluster nodes.
- Updated SQL Server licensing guidance for Launch Wizard BYOL to reference Dedicated Hosts and the documented `LaunchWizard-*` S3 bucket media requirement.
- Replaced the incomplete EC2 instance profile example with the documented `AmazonEC2RoleForLaunchWizard` role and its required managed policies.
- Added the required `AmazonLaunchWizardFullAccessV2` permission for the user or role running Launch Wizard.
- Updated supported SQL Server version wording to include SQL Server 2025 and to note edition support depends on version and deployment pattern.
- Replaced the non-documented `aws:launchwizard:deployment-id` EC2 tag filter with the documented `LaunchWizardResourceGroupID` tag workflow.
- Corrected the backup-to-S3 wording from an "S3 backup extension" to SQL Server 2022 `BACKUP TO URL` support for S3-compatible object storage.
- Corrected the monitoring wording to say Application Insights configures CloudWatch metrics, logs, and alarms when enabled, instead of claiming the CloudWatch agent is always pre-installed by Launch Wizard.
- Corrected deletion wording to note that shared resources are not deleted when deleting a Launch Wizard deployment.
- Removed inaccurate examples of RDS gaps by changing the RDS comparison to features that are unsupported or only partially supported, such as FILESTREAM and custom OS-level components.

## Review Notes
The SQL database creation and Always On commands are syntactically valid, but real deployments still need the Availability Group name, seeding mode, secondary replica state, backup path, and file paths to match the environment created by Launch Wizard.
