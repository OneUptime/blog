# Validation Summary: How to Optimize Cloud Storage Costs by Using the Right Storage Class

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud CLI (`gcloud storage`)
- Cloud Storage storage classes
- Object Lifecycle Management
- Cloud Billing export to BigQuery
- Cloud Storage Autoclass

## Sources Consulted
- Google Cloud Storage classes: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Google Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage Autoclass: https://cloud.google.com/storage/docs/autoclass
- Google Cloud Storage bucket locations: https://cloud.google.com/storage/docs/locations
- Google Cloud CLI `gcloud storage buckets create`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI `gcloud storage cp`: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud CLI `gcloud storage objects update`: https://cloud.google.com/sdk/gcloud/reference/storage/objects/update
- Google Cloud CLI `gcloud storage ls`: https://cloud.google.com/sdk/gcloud/reference/storage/ls
- Cloud Billing export BigQuery schema: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables

## Issues Found
- Updated us-central1 storage prices from older approximate values to current published rates: Standard $0.022, Nearline $0.011, Coldline $0.0044, and Archive $0.0014 per GB/month.
- Recalculated the 10 TB monthly and annual cost examples and the estimated annual overpayment based on the corrected prices.
- Corrected the storage class selection explanation to avoid implying that colder Cloud Storage classes have slower retrieval. Google Cloud Storage classes remain low-latency; the main tradeoffs are access frequency, storage duration, retrieval fees, and operation charges.
- Renamed the BigQuery query alias from `total_usage_gb` to `total_usage_in_pricing_units` because Cloud Billing export usage values are expressed in pricing units, not always raw GB.
- Corrected the `gcloud storage ls` comment, because the shown command lists object sizes but does not produce an aggregated storage-class breakdown.
- Corrected the dual-region bucket creation example. `--location=us-central1+us-east1` is not valid for `gcloud storage buckets create`; the predefined dual-region for `us-central1` plus `us-east1` is `nam4`.
- Updated the multi-region pricing statement. Current pricing makes US multi-region Standard storage about 18% more than regional Standard storage, while colder classes can differ by substantially more.
- Corrected the Autoclass description. By default, Autoclass uses Nearline as the terminal storage class; Coldline and Archive transitions require configuring Archive as the terminal storage class. Also clarified that Autoclass avoids retrieval fees, but some warmer transitions from Coldline or Archive can incur Class A operation charges.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against the official Google Cloud CLI reference rather than local `--help` output.
