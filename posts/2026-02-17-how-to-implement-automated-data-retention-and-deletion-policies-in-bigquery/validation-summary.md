# Validation Summary: How to Implement Automated Data Retention and Deletion Policies in BigQuery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- BigQuery bq CLI
- GoogleSQL DDL and DML
- BigQuery scheduled queries
- BigQuery INFORMATION_SCHEMA
- Terraform Google provider
- GDPR, HIPAA, and PCI DSS retention considerations

## Sources Consulted
- BigQuery create and use tables documentation: https://docs.cloud.google.com/bigquery/docs/tables
- BigQuery update dataset properties documentation: https://docs.cloud.google.com/bigquery/docs/updating-datasets
- BigQuery create partitioned tables documentation: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery manage partitioned tables documentation: https://docs.cloud.google.com/bigquery/docs/managing-partitioned-tables
- BigQuery scheduled queries documentation: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery DML syntax documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery INFORMATION_SCHEMA.PARTITIONS documentation: https://cloud.google.com/bigquery/docs/information-schema-partitions
- BigQuery audit logs overview: https://docs.cloud.google.com/bigquery/docs/reference/auditlogs
- Terraform Google provider documentation for google_bigquery_dataset, google_bigquery_table, and google_bigquery_data_transfer_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- European Commission GDPR storage limitation guidance: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/how-long-can-data-be-kept-and-it-necessary-update-it_en
- HHS HIPAA medical record retention FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- PCI DSS audit log retention guidance from PCI DSS SAQ documentation: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf

## Issues Found
- The scheduled query bq CLI example used `--destination_table=""` together with `--target_dataset`. BigQuery documentation says to use either `--destination_table` or `--target_dataset`, not both. Removed the empty destination table flag.
- The scheduled query example claimed to run at 2 AM UTC but used `--schedule="every 24 hours"`, which runs relative to creation time. Changed it to `--schedule="every day 02:00"`.
- The scheduled DELETE comment said it targeted PII-containing columns, but the statement deletes rows. Updated the comment to describe rows containing stale PII.
- The tiered retention example aggregated one day of detailed records, then deleted all records at or older than 90 days, including data not shown as aggregated. Changed the DELETE predicate to delete the same 91-day-old partition/date that was aggregated.
- The INFORMATION_SCHEMA.PARTITIONS examples filtered only `__NULL__`, but `partition_id` can also be `NULL` or `__UNPARTITIONED__`; `PARSE_DATE('%Y%m%d', partition_id)` can fail on non-date partition IDs. Changed the filter to keep only `YYYYMMDD` partition IDs.
- The compliance mapping overstated fixed HIPAA and PCI DSS retention periods for broad data categories. Revised the table to distinguish HIPAA documentation retention, jurisdiction-specific medical-record retention, PCI DSS audit-log retention, and anonymized/de-identified data caveats.
- The audit logging best practice said BigQuery audit logs capture partition drops. BigQuery audit logs documentation states partitioned tables do not generate `TableDataChange` entries for partition expirations. Updated the wording to avoid overclaiming.

## Review Notes
The BigQuery table expiration, dataset default expiration, partition expiration, GoogleSQL DDL/DML, label update, and Terraform resource examples are otherwise aligned with current official documentation. Local `bq` and `terraform` binaries were not installed in the workspace, so CLI behavior was verified against official documentation rather than local command help.
