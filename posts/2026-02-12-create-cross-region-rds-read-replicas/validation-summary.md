# Validation Summary: How to Create Cross-Region RDS Read Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Cross-region RDS read replicas
- AWS CLI
- AWS KMS
- Amazon CloudWatch
- Boto3 for Python
- Route 53 disaster recovery patterns

## Sources Consulted
- Amazon RDS User Guide: Creating a read replica in a different AWS Region - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- AWS CLI Command Reference: create-db-instance-read-replica - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Amazon RDS User Guide: Encrypting Amazon RDS resources - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon RDS User Guide: Supported Regions and DB engines for cross-Region read replicas - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.CrossRegionReadReplicas.html
- Amazon RDS User Guide: Monitoring read replication - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html
- Botocore RDS documentation: promote_read_replica - https://docs.aws.amazon.com/botocore/latest/reference/services/rds/client/promote_read_replica.html
- Amazon RDS pricing - https://aws.amazon.com/rds/pricing/

## Issues Found
- Removed the invalid `--storage-encrypted` option from the `aws rds create-db-instance-read-replica` command. The AWS CLI command supports `--kms-key-id` for encrypted cross-region read replicas, but not `--storage-encrypted`.
- Corrected the encryption guidance. AWS documentation says an encrypted cross-region read replica requires an already encrypted source instance; an encrypted read replica cannot be created directly from an unencrypted source DB instance.
- Corrected the default/custom KMS key explanation. Cross-region encrypted replicas use a KMS key in the destination region; AWS documentation does not require the source to use a customer managed key for the same-account cross-region read replica case.
- Replaced the fixed 1-5 second replica-lag expectation with workload- and region-dependent guidance. AWS documents that cross-region replicas can have higher lag because of longer network paths, but does not guarantee a fixed normal range.
- Updated the Boto3 CloudWatch example to pass timezone-aware `datetime` values for `StartTime` and `EndTime`, and to select the latest datapoint by timestamp because CloudWatch datapoints are not guaranteed to be returned in chronological order.
- Updated the data transfer cost section to avoid hard-coded rates that can change and vary by region pair. The revised text points readers to current Amazon RDS pricing.
- Corrected the limitations section. Cross-region replica engine support now includes Db2 and SQL Server where version and edition requirements are met, cascading support is engine-specific, and read replica limits vary by engine.

## Review Notes
The post is technically relevant and contains implementation details. AWS CLI was not installed in the local environment, so CLI verification was performed against the official AWS CLI command reference instead of local `aws --help` output.
