# Validation Summary: How to Set Up SAP HANA Backup with Backint on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SAP HANA
- Backint for SAP HANA
- AWS Backint Agent for SAP HANA
- Amazon S3
- hdbsql
- cron

## Sources Consulted
- AWS Documentation: Install and configure AWS Backint Agent for SAP HANA, https://docs.aws.amazon.com/sap/latest/sap-hana/aws-backint-agent-s3-installing-configuring.html
- AWS Documentation: Backup and restore your SAP HANA system with the AWS Backint Agent for SAP HANA, https://docs.aws.amazon.com/sap/latest/sap-hana/aws-backint-agent-s3-backup-restore.html
- SAP Help Portal: BACKUP DATA Statement for SAP HANA Platform, https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/75a06c444e9a4b3287a46a6a40b4ee69.html
- SAP Help Portal: RECOVER DATA Statement for SAP HANA Platform, https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/93637a07e3b544398aa02de1541b903c.html
- SAP Help Portal: RECOVER DATABASE Statement for SAP HANA Platform, https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/c4205f73bb571014ba46d209981bc1f5.html
- SAP Help Portal: Backint for SAP HANA certification overview, https://help.sap.com/docs/SUPPORT_CONTENT/saphana/3361896016.html

## Issues Found
- The AWS Backint Agent download URL used an incorrect bucket and object name. Updated it to the current AWS-published S3 URL for the latest agent tarball.
- The manual installation steps extracted the agent into `/opt/aws-backint-agent` without creating the `hdbbackint` and parameter-file links expected by SAP HANA. Updated the example to use `/hana/shared/aws-backint-agent` and create symlinks under `/usr/sap/HDB/SYS/global/hdb/opt`.
- The AWS Backint Agent YAML used non-existent snake_case options such as `s3_bucket`, `region`, `server_side_encryption`, and `compress`. Replaced them with documented AWS Backint Agent keys such as `S3BucketName`, `S3BucketAwsRegion`, `S3BucketOwnerAccountID`, `S3SseEnabled`, `S3SseKmsArn`, `UploadConcurrency`, `UploadChannelSize`, `LogFile`, and `LogLevel`.
- The SAP HANA `global.ini` configuration enabled catalog backup with Backint but did not set `catalog_backup_parameter_file`. Added the missing parameter and updated data/log parameter file paths to the SAP HANA shared `hdbconfig` location.
- The Backint backup examples used a bare prefix in some places. Updated the examples to use AWS's documented Backint destination path format under `/usr/sap/<SID>/SYS/global/hdb/backint`.
- The cron installation command did not preserve the existing crontab because the pipeline applied only to `echo`. Wrapped the existing crontab and new line in a subshell before piping to `crontab -`.
- The recovery example used invalid SQL: `RECOVER DATA ... USING BACKINT UNTIL TIMESTAMP ...` mixes a data-backup recovery statement with point-in-time recovery syntax. Replaced it with a documented `RECOVER DATA ... USING BACKUP_ID ... USING CATALOG BACKINT ... CLEAR LOG` example.

## Review Notes
- The guide uses example values for SID `HDB`, instance number `00`, tenant name, bucket, account ID, and KMS key. These must be replaced for a real deployment.
- AWS recommends using SAP HANA Cockpit for scheduled backups where possible; the cron example is still technically valid as a simple automation pattern.
