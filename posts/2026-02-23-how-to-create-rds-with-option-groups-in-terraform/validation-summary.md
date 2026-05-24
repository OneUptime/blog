# Validation Summary: How to Create RDS with Option Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS (MySQL, SQL Server, Oracle)
- AWS `aws_db_option_group` resource
- AWS `aws_db_parameter_group` resource
- AWS `aws_db_instance` resource
- AWS IAM roles and policies (for SQL Server audit/backup, Oracle S3 integration)
- AWS S3 (for audit log delivery and Oracle native backup)
- AWS Security Groups (Oracle SSL)
- MariaDB Audit Plugin (for MySQL)
- SQL Server TDE, SQLSERVER_AUDIT, SQLSERVER_BACKUP_RESTORE options
- Oracle S3_INTEGRATION, SSL, Timezone options

## Sources Consulted
- Terraform AWS Provider — `aws_db_option_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_option_group
- Terraform AWS Provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider — `aws_db_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider — `aws_rds_orderable_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/rds_orderable_db_instance
- AWS RDS User Guide — MariaDB Audit Plugin for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.AuditPlugin.html
- AWS RDS User Guide — Oracle Statspack: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.Statspack.html
- AWS RDS User Guide — Oracle S3 Integration: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html
- AWS RDS User Guide — Oracle SSL Option: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.SSL.html
- AWS RDS User Guide — Oracle Timezone Option: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.Timezone.html
- AWS RDS User Guide — SQL Server TDE: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.Options.TDE.html
- AWS RDS User Guide — SQL Server Audit: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.Options.Audit.html
- AWS RDS User Guide — SQL Server Native Backup and Restore: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html

## Issues Found
- **Oracle Statspack on Oracle 19c**: The Oracle option group example used `major_engine_version = "19"` but included a `STATSPACK` option. AWS RDS does not support Statspack on Oracle Database 19c (or 21c) per the AWS documentation. Applying this Terraform would fail at plan-time or option-attach-time. Fix: removed the `STATSPACK` option block from the Oracle 19 option group example.

## Review Notes
- The MariaDB Audit Plugin settings (`SERVER_AUDIT_EVENTS`, `SERVER_AUDIT_FILE_ROTATIONS`, `SERVER_AUDIT_FILE_ROTATE_SIZE`, `SERVER_AUDIT_EXCL_USERS`) and their value formats are valid per AWS docs.
- SQL Server option names (`TDE`, `SQLSERVER_AUDIT`, `SQLSERVER_BACKUP_RESTORE`) and their settings (`IAM_ROLE_ARN`, `S3_BUCKET_ARN`) match AWS documentation.
- Oracle `S3_INTEGRATION` with `version = "1.0"` is correct.
- Oracle `SSL` option name and `SQLNET.SSL_VERSION = "1.2"` setting are valid; port 2484 is the standard Oracle SSL port.
- Oracle `Timezone` option (capital T) with the `TIME_ZONE` setting matches AWS docs.
- SQL Server `major_engine_version = "15.00"` is the correct format for SQL Server 2019.
- The `aws_rds_orderable_db_instance` data source is real and the arguments are valid; however, the section heading "Checking Available Options" is a bit misleading — this data source returns orderable DB instance metadata (instance classes, storage, AZs, etc.), not the list of available *option group options*. The CLI command `aws rds describe-option-group-options` (or `aws_db_engine_version` data source) is what actually lists option group options. The code itself works as written, so no change made — but this section could be reframed in a future revision.
- Several resources referenced in examples (`aws_vpc.main`, `aws_subnet.private`, `aws_security_group.app`, `aws_security_group.rds`) are not defined in the snippets. This is normal for a focused tutorial but readers should be aware they need to define these.
- The `aws_iam_role.sqlserver_audit` policy uses the action `s3:GetBucketACL`. AWS IAM is case-insensitive for actions, but the canonical form is `s3:GetBucketAcl`. This is not functionally incorrect.
- The `password = var.db_password` pattern works, but readers should be aware AWS RDS now supports managed master user passwords via Secrets Manager (`manage_master_user_password = true`), which is a stronger pattern. Out of scope for this fix.
