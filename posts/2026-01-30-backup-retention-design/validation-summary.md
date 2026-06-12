# Validation Summary: How to Build Backup Retention Design

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Backup retention policy design and GFS rotation
- Python
- Bash, GNU coreutils, and GNU findutils
- Amazon S3 lifecycle policies and storage classes
- Kubernetes and Velero schedules
- pgBackRest and PostgreSQL backup/restore
- Prometheus alerting rules and Prometheus Operator PrometheusRule resources
- Compliance retention concepts for GDPR, HIPAA, SOX, PCI DSS, GLBA, and SEC Rule 17a-4

## Sources Consulted
- Python standard library documentation for `datetime`, `dataclasses`, `calendar`, `subprocess`, and `hashlib`: https://docs.python.org/3/library/
- GNU Bash manual and local `bash -n` syntax checks: https://www.gnu.org/software/bash/manual/
- GNU coreutils `date` documentation and local `date --version`: https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html
- GNU findutils documentation and local `find --version`: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Velero Schedule API documentation: https://velero.io/docs/main/api-types/schedule/
- pgBackRest configuration reference: https://pgbackrest.org/configuration.html
- Amazon S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Amazon S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 Glacier storage class documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PostgreSQL Backup and Restore documentation: https://www.postgresql.org/docs/current/backup.html
- NIST SP 800-184: https://csrc.nist.gov/pubs/sp/800/184/final
- HIPAA Security Rule documentation retention, 45 CFR 164.316: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.316
- SEC Rule 17a-4 reference: https://www.finra.org/rules-guidance/guidance/interpretations-financial-operational-rules/sea-rule-17a-4-and-related-interpretations
- PCI DSS audit log retention reference: https://www.pcisecuritystandards.org/documents/PCIDSS_QRGv3_1.pdf
- GDPR storage limitation principle: https://gdpr-info.eu/art-5-gdpr/

## Issues Found
- The GFS example claimed exactly 29 retained backups and exactly 2,555 daily backups over 7 years. Changed this to "up to 29" and "roughly 2,555" because overlaps and leap years can change exact counts.
- The Python GFS calculator accepted `reference_date` and `monthly_day` but did not actually use them. Updated the code to ignore backups after the reference date and to apply the configured monthly day, with `0` meaning the last day of the month.
- The Python weekly retention logic used calendar year with ISO week number, which can be wrong around year boundaries. Updated it to use ISO year and week together.
- The Python yearly retention logic kept the last available backup of each year even though the article describes yearly backups on December 31. Updated it to keep December 31 backups.
- The Bash GFS cleanup script used `((counter++))` under `set -e`, which can terminate Bash when the old counter value is zero. Replaced those increments with `((counter += 1))`.
- The HIPAA table described the 6-year retention as applying to health records broadly. Corrected it to required policies, procedures, and documentation, matching 45 CFR 164.316.
- The SEC Rule 17a-4 row implied a blanket 6-year retention period. Updated it to 3-6 years with the first 2 years easily accessible.
- The S3 Glacier row used a rounded storage price and incomplete retrieval-time wording. Updated it to Glacier Flexible Retrieval, approximately $0.0036/GB/month, with retrieval ranging from minutes to 12 hours depending on retrieval tier.
- The pgBackRest configuration block was labeled as YAML even though pgBackRest uses INI-style configuration. Changed the code fence language to `ini`.
- The recovery test script used shell pipelines with `shell=True` and interpolated file paths, which can fail with spaces and is unsafe for untrusted paths. Reworked it to call `gunzip`, `psql`, and `pg_dump` with argument arrays and to compute the MD5 checksum in Python.

## Review Notes
- The S3 cost table remains region- and date-sensitive; the numbers are representative for common AWS public pricing and should be periodically rechecked.
- The Velero example fields `ttl`, `snapshotVolumes`, `storageLocation`, `volumeSnapshotLocations`, and scheduled-backup metadata match the current Velero Schedule API, but exact snapshot behavior depends on installed Velero plugins and CSI/provider configuration.
- The Prometheus alert examples assume custom backup metrics such as `backup_last_success_timestamp` and `backup_retained_count`; those metrics must be exported by the backup system.
- Validation performed: Python snippets parsed with Python 3.12 AST, Bash snippets passed `bash -n`, and YAML snippets parsed with PyYAML. The examples were not executed against live PostgreSQL, AWS, Kubernetes, Velero, pgBackRest, or Prometheus environments.
