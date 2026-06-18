# Validation Summary: How to Implement Backup Retention Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash scripting
- GNU tar and find
- Restic
- BorgBackup
- Velero
- Amazon S3 lifecycle rules and Object Lock legal holds
- PostgreSQL WAL archiving
- MySQL binary log retention
- Python boto3
- HIPAA, SOX, GDPR, PCI-DSS, and IRS retention considerations

## Sources Consulted
- Restic documentation: Removing backup snapshots - https://restic.readthedocs.io/en/stable/060_forget.html
- BorgBackup documentation: borg prune - https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- Velero documentation and CLI source: schedule create and TTL behavior - https://velero.io/docs/v1.9/disaster-case/ and https://github.com/velero-io/velero/blob/main/pkg/cmd/cli/schedule/create.go
- AWS CLI Command Reference: put-object-legal-hold - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-legal-hold.html
- Amazon S3 User Guide: Lifecycle configuration examples - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- PostgreSQL documentation: Write Ahead Log configuration and log-shipping standby servers - https://www.postgresql.org/docs/current/runtime-config-wal.html and https://www.postgresql.org/docs/current/warm-standby.html
- MySQL Reference Manual: Binary logging options and variables - https://dev.mysql.com/doc/en/replication-options-binary-log.html
- HHS HIPAA FAQ and Security Rule summary - https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html and https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- PCI Security Standards Council Quick Reference Guide - https://www.pcisecuritystandards.org/pdfs/pci_ssc_quick_guide.pdf
- IRS recordkeeping guidance - https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records

## Issues Found
- Corrected the HIPAA retention claim. The post stated that HIPAA requires medical records to be retained for 6 years; HHS says HIPAA does not set medical-record retention periods, while HIPAA Security Rule documentation must be retained for 6 years.
- Corrected PCI-DSS audit-log wording from a simple 1-year statement to 12 months with at least 3 months immediately available.
- Narrowed SOX wording from broad financial records to audit and review workpapers.
- Clarified IRS tax-record retention because IRS periods vary by record type rather than always being 7 years.
- Updated the compliance-aware Bash example to use corrected data-type labels for SOX audit records and HIPAA Security Rule documentation.
- Fixed the PostgreSQL WAL section. It now enables `archive_mode` and avoids deleting WAL files by file age, replacing the unsafe `find ... -mtime ... -delete` example with `pg_archivecleanup` driven by the oldest WAL still required by the backup/recovery process.
- Updated the MySQL binary-log configuration to prefer `binlog_expire_logs_seconds` for current MySQL versions and moved `expire_logs_days` to an older-version comment.
- Fixed the S3 legal-hold script. `put-object-legal-hold` applies to a specific object key, not a prefix, so the script now lists objects under the prefix and applies the legal hold per object.
- Updated the boto3 monitoring and cost examples to use timezone-aware `datetime.now(timezone.utc)` comparisons against S3 `LastModified` values.

## Review Notes
- The GFS examples are valid as illustrative retention examples, but real backup schedules should account for time zones, missed backup windows, restore testing, and immutable/append-only storage requirements.
- The S3 legal-hold example assumes Object Lock is enabled on the bucket and that the caller has permission to list objects and put object legal holds.
