# Validation Summary: How to Configure RDS Option Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS option groups
- AWS CLI for RDS and IAM
- RDS for SQL Server native backup and restore
- RDS for Oracle APEX, native network encryption, Statspack, and TDE
- RDS for MySQL MariaDB Audit Plugin
- Terraform AWS provider

## Sources Consulted
- AWS CLI `create-option-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-option-group.html
- AWS CLI `add-option-to-option-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/add-option-to-option-group.html
- AWS CLI `remove-option-from-option-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/remove-option-from-option-group.html
- Amazon RDS User Guide, Working with option groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html
- Amazon RDS User Guide, SQL Server native backup and restore: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.Options.BackupRestore.html
- Amazon RDS User Guide, SQL Server native backup/restore IAM role setup: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.Native.Enabling.html
- Amazon RDS User Guide, SQL Server native backup/restore stored procedures: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.Native.Using.html
- Amazon RDS User Guide, Oracle options: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.html
- Amazon RDS User Guide, Oracle APEX requirements: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.APEX.Requirements.html
- Amazon RDS User Guide, Oracle native network encryption settings: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Options.NNE.Options.html
- Amazon RDS User Guide, Oracle Statspack: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.Statspack.html
- Amazon RDS User Guide, Oracle Transparent Data Encryption: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.AdvSecurity.html
- Amazon RDS User Guide, MySQL options: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.html
- Amazon RDS User Guide, MariaDB Audit Plugin support for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.AuditPlugin.html
- Terraform AWS provider `aws_db_option_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_option_group

## Issues Found
- SQL Server native backup/restore IAM policy was missing the current documented `s3:GetBucketLocation` bucket permission and `s3:GetObjectAttributes` object permission. Updated the policy and split bucket-level and object-level resources to match AWS's documented permissions model.
- Oracle Statspack report generation used `@$ORACLE_HOME/rdbms/admin/spreport.sql`, which is not the documented RDS workflow. Replaced it with the RDS-supported snapshot query and `RDSADMIN.RDS_RUN_SPREPORT` procedure.
- The MySQL MariaDB Audit Plugin AWS CLI example used shorthand syntax with a comma-separated setting value. Updated it to JSON syntax so `SERVER_AUDIT_EVENTS` is passed as a single option setting value.

## Review Notes
- The AWS CLI was not installed locally in this environment, so command validation was performed against the official AWS CLI command reference rather than local `--help` output.
- The SQL Server IAM trust policy shown remains functional, but AWS recommends adding `aws:SourceArn` and `aws:SourceAccount` conditions to reduce confused-deputy risk.
- The Oracle APEX example uses `23.1.v1`, which is still documented as supported, though newer APEX versions are available.
