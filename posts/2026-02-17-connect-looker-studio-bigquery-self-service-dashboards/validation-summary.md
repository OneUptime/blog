# Validation Summary: How to Connect Looker Studio to BigQuery for Self-Service Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Looker Studio
- BigQuery
- Google Cloud IAM
- BigQuery CLI (`bq`)
- Google Cloud CLI (`gcloud`)
- SQL
- HTML iframe embedding
- Mermaid diagrams

## Sources Consulted
- Looker Studio BigQuery connector documentation: https://docs.cloud.google.com/looker/docs/studio/connect-to-google-bigquery
- Looker Studio data credentials documentation: https://docs.cloud.google.com/looker/docs/studio/data-credentials-article
- Looker Studio data freshness documentation: https://docs.cloud.google.com/looker/docs/studio/manage-data-freshness
- Looker Studio report embedding documentation: https://docs.cloud.google.com/looker/docs/studio/embed-a-report
- Looker Studio data extract documentation: https://cloud.google.com/looker/docs/studio/extract-data-for-faster-performance
- BigQuery dataset creation documentation: https://cloud.google.com/bigquery/docs/datasets
- BigQuery IAM roles documentation: https://cloud.google.com/bigquery/docs/access-control
- BigQuery IAM Conditions documentation: https://docs.cloud.google.com/bigquery/docs/conditions
- BigQuery BI Engine reservation documentation: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity

## Issues Found
- The BigQuery connector section said there were three connection options and omitted the documented Recent Projects selector. Updated the wording to "several connection options" and added Recent Projects.
- The Shared Projects description implied only datasets are shared. Updated it to match the documentation, which describes accessing a shared project and optionally using separate data and billing projects.
- The data credentials section said Looker Studio data sources can use only two credential modes. BigQuery data sources can also use Service Account Credentials in managed organizations, so a concise service account credentials entry was added.
- The BI Engine CLI command used `bq mk --bi_reservation --size=1G`, which does not match the current documented `bq update --reservation --bi_reservation_size=SIZE` syntax. Updated the command accordingly.
- The cache pitfall said Looker Studio caches query results for about 15 minutes. Current documentation lists BigQuery's default data freshness threshold as 12 hours and also says memory use is not guaranteed for the whole interval. Updated the statement to reflect that behavior.

## Review Notes
- The SQL examples are syntactically valid BigQuery Standard SQL examples, assuming the referenced columns exist and are not ambiguous in the sample schema.
- The IAM example is conceptually valid, but in production teams may prefer managing dataset-level access through infrastructure as code or BigQuery dataset IAM policy workflows.
