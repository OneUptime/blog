# Validation Summary: How to Use KMS with RDS for Database Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS RDS
- AWS KMS
- AWS CLI
- Terraform AWS Provider
- Amazon Aurora PostgreSQL
- AWS Config
- AWS Database Migration Service

## Sources Consulted
- AWS RDS User Guide: Encrypting Amazon RDS resources - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- AWS CLI Command Reference: create-db-instance-read-replica - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- AWS CLI Command Reference: copy-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- AWS RDS User Guide: Copying a DB snapshot - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- AWS RDS User Guide: Sharing encrypted snapshots - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- AWS Config Developer Guide: rds-storage-encrypted managed rule - https://docs.aws.amazon.com/config/latest/developerguide/rds-storage-encrypted.html
- AWS RDS for PostgreSQL Release Calendar - https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon Aurora PostgreSQL Release Calendar - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- Terraform AWS Provider: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider: aws_rds_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster

## Issues Found
- The introduction said read replicas use the same KMS key without qualifying the cross-region case. Updated it to clarify that same-region replicas use the same key, while cross-region replicas use a destination-region KMS key.
- The RDS and Aurora PostgreSQL examples used engine version 15.4, which has reached end of standard support. Updated the examples to PostgreSQL 15.17, a currently supported 15.x minor version for both RDS for PostgreSQL and Aurora PostgreSQL as of the review date.
- The cross-region read replica AWS CLI example used `--destination-region`, which is not an option for `create-db-instance-read-replica`. Replaced it with the global `--region eu-west-1` option.
- The cross-region read replica AWS CLI example used a local DB identifier for a source in another Region. Updated it to use the source DB instance ARN, as required for cross-region replicas.
- The cross-region snapshot copy example used a local snapshot identifier for a source snapshot in another Region and did not show the destination Region for the API call. Updated it to use the source snapshot ARN and `--region eu-west-1`.

## Review Notes
The examples are still illustrative and use placeholder IDs, passwords, aliases, subnet groups, and security groups. In a real deployment, users should verify engine-version availability in their specific AWS Region with `aws rds describe-db-engine-versions` and store database credentials in a secrets manager rather than inline CLI arguments.
