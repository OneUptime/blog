# Validation Summary: How to Deploy MySQL on AWS RDS with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS RDS
- Amazon RDS for MySQL
- AWS IAM
- AWS KMS
- Amazon VPC security groups

## Sources Consulted
- AWS RDS for MySQL version management: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- AWS RDS storage types and gp3 storage characteristics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#gp3-storage
- AWS RDS MySQL options reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.html
- AWS RDS MySQL read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_MySQL.Replication.ReadReplicas.html
- AWS RDS MySQL Multi-AZ read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_MySQL.Replication.ReadReplicas.MultiAZ.html
- AWS RDS API reference for `CreateDBInstanceReadReplica`: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstanceReadReplica.html
- AWS RDS parameter formulas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- AWS provider resource docs for `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS provider resource docs for `aws_db_option_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_option_group.html.markdown
- AWS provider resource docs for `aws_db_parameter_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_parameter_group.html.markdown

## Issues Found
- The post pinned `engine_version = "8.0.35"` for the primary RDS instance. On the review date, AWS listed newer supported RDS for MySQL 8.0 minors and no longer listed 8.0.35 as a supported minor version. I changed this to `engine_version = "8.0"` so the example stays within the current supported 8.0 line and matches the provider's documented version-prefix behavior.
- The primary instance example set `iops = 3000` on `gp3` storage while also using `allocated_storage = 100`. For RDS MySQL gp3 volumes at that size, the 3,000 IOPS level is baseline behavior rather than a provisioned IOPS setting to declare in the resource. I removed the explicit `iops` line so the example matches current RDS gp3 storage rules.
- The same-Region MySQL read replica example explicitly set `parameter_group_name`. AWS documents that specifying a parameter group is not supported for same-Region MySQL DB instance read replicas; the source instance's parameter group is inherited automatically. I removed that line and clarified the comment.
- The read replica comment said replicas "don't need Multi-AZ." AWS supports creating MySQL read replicas as Multi-AZ DB instances to provide failover support for the replica itself. I updated the comment to reflect that `multi_az = false` is a choice, not a platform limitation.

## Review Notes
- The post is technically relevant and salvageable; after the fixes above, the examples align with current AWS RDS and provider behavior.
- The snippets assume supporting resources and variables already exist, including the DB subnet group, KMS key, and security group referenced by name.
- The example still uses the `password` argument directly, which the provider documents as being stored in state. That is valid, but a future revision could prefer `manage_master_user_password` or `password_wo` for stronger secret-handling guidance.
