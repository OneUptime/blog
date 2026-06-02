# Validation Summary: How to Export Aurora Snapshots to S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS snapshot export
- Amazon S3
- AWS KMS
- AWS IAM
- AWS CLI
- Amazon Athena
- AWS Glue
- AWS Lambda
- Amazon EventBridge
- Apache Parquet
- Python / boto3

## Sources Consulted
- Amazon Aurora User Guide: Creating snapshot export tasks: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-export-snapshot.Exporting.html
- Amazon Aurora User Guide: Setting up access to an Amazon S3 bucket: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-export-snapshot.Setup.html
- Amazon Aurora User Guide: Monitoring snapshot exports: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-export-snapshot.Monitoring.html
- Amazon Aurora User Guide: Considerations for DB cluster snapshot exports: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-export-snapshot.Considerations.html
- Amazon Aurora User Guide: Supported Regions and Aurora DB engines for exporting snapshot data to Amazon S3: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ExportSnapshotToS3.html
- Amazon RDS API Reference: StartExportTask: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_StartExportTask.html
- AWS CLI Command Reference: rds start-export-task: https://docs.aws.amazon.com/cli/latest/reference/rds/start-export-task.html
- Amazon RDS User Guide: Amazon RDS event categories and event messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon EventBridge User Guide: Amazon Relational Database Service events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- Amazon RDS User Guide: Overview of Amazon RDS event notification: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.overview.html

## Issues Found
- The KMS setup said the default `aws/s3` key could be used. AWS documents `KmsKeyId` as a required snapshot export parameter and describes using an AWS KMS key for export encryption, so the text now directs readers to use an AWS KMS key and create a customer managed key when needed.
- The S3 IAM policy used `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject`. AWS documents the required export permissions as `s3:PutObject*`, `s3:GetObject*`, and `s3:DeleteObject*`, so the policy was updated.
- The Athena table location omitted the export task identifier and Aurora's table base-prefix format. AWS documents the exported table prefix as `export_identifier/database_name/schema_name.table_name/`, so the example now points to `aurora/full-export/my-snapshot-export-20260212/mydb/mydb.users/`.
- The EventBridge rule claimed to trigger on snapshot creation events but only matched `RDS-EVENT-0075`, which is manual cluster snapshot creation. The rule now also includes `RDS-EVENT-0169` for automated cluster snapshots.

## Review Notes
The AWS CLI commands and boto3 `start_export_task` call shape match current AWS documentation. The partial export identifier format shown is valid for Aurora MySQL; Aurora PostgreSQL table exports use `database.schema.table`.
