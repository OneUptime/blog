# Validation Summary: How to Create RDS Read Replicas with OpenTofu - Rds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider `aws_db_instance` resource
- Amazon RDS for PostgreSQL read replicas
- Amazon CloudWatch alarms and RDS metrics
- AWS CLI for RDS promotion

## Sources Consulted
- OpenTofu docs: Initializing working directories — https://opentofu.org/docs/cli/init/
- OpenTofu docs: Command `apply` — https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu docs: Provider configuration and aliases — https://opentofu.org/docs/language/providers/configuration/
- Terraform AWS provider docs: `aws_db_instance` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider docs: Version 5 upgrade guide (`aws_db_instance.id` vs `identifier`) — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/guides/version-5-upgrade.html.markdown
- Amazon RDS docs: Working with read replicas for Amazon RDS for PostgreSQL — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- Amazon RDS docs: Read replica configuration with PostgreSQL — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.Configuration.html
- Amazon RDS docs: Creating a read replica in a different AWS Region — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- Amazon RDS docs: Monitoring read replication — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html
- Amazon RDS docs: Supported Regions and DB engines for cross-Region read replicas — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.CrossRegionReadReplicas.html
- Amazon RDS docs: Amazon RDS for PostgreSQL updates — https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS CLI reference: `promote-read-replica` — https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html

## Issues Found
1. The cross-region replica snippet implied that `storage_encrypted = true` encrypts the destination replica. In the current AWS provider docs, `storage_encrypted` is ignored for cross-region read replicas and the destination-region `kms_key_id` is the relevant setting. I removed the ignored argument and corrected the comment.

2. The CloudWatch alarm used `aws_db_instance.read_replica_1.id` for the `DBInstanceIdentifier` dimension. In current AWS provider versions, `aws_db_instance.id` is the DBI resource ID rather than the DB identifier. I changed this to `aws_db_instance.read_replica_1.identifier`, which matches what CloudWatch expects.

3. The promotion command in the conclusion was incomplete. `aws rds promote-read-replica` requires `--db-instance-identifier`, so I updated the command to include the required flag.

4. The conclusion overstated the meaning of high `ReplicaLag` for PostgreSQL. AWS documents that idle PostgreSQL sources can report up to five minutes of lag because WAL segments switch every five minutes by default. I updated the wording so it distinguishes normal idle behavior from sustained lag during write activity.

## Review Notes
- The post is technically relevant and salvageable; it is a code-focused infrastructure tutorial.
- The code snippets are illustrative rather than a complete standalone module. Resources such as the aliased `aws.dr_region` provider, subnet groups, security groups, and parameter groups are assumed to be defined elsewhere.
- The pinned PostgreSQL version `16.2` is still listed in the current Amazon RDS for PostgreSQL release notes, so it did not need correction during this review.
