# Validation Summary: How to Set Up BigQuery Custom Cost Controls with Quotas and Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- BigQuery
- BigQuery custom query quotas
- Google Cloud Billing budgets and budget alerts
- Pub/Sub budget notifications
- Cloud Functions
- Python BigQuery client library
- BigQuery INFORMATION_SCHEMA
- GoogleSQL

## Sources Consulted
- BigQuery custom query quotas: https://docs.cloud.google.com/bigquery/docs/custom-quotas
- BigQuery quotas and limits: https://cloud.google.com/bigquery/quotas
- gcloud alpha services quota update reference: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/update
- gcloud billing budgets create reference: https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Cloud Billing programmatic notifications: https://cloud.google.com/billing/docs/how-to/notify
- Cloud Billing budgets guide: https://docs.cloud.google.com/billing/docs/how-to/budgets
- BigQuery Python QueryJobConfig reference: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.QueryJobConfig
- BigQuery INFORMATION_SCHEMA JOBS view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery partitioned table management: https://docs.cloud.google.com/bigquery/docs/managing-partitioned-tables
- Google Cloud BigQuery SKU group / service ID reference: https://cloud.google.com/skus/sku-groups/bigquery

## Issues Found
- The quota examples used `gcloud services set-quota`, which is not a valid current `gcloud services` command. Replaced the examples with `gcloud alpha services quota update` using the documented quota command group.
- The quota examples used byte values and units such as `1/d/project`; Service Usage quota overrides use units such as `1/d/{project}` and `1/d/{project}/{user}`, with BigQuery query usage values expressed in MiB. Updated the units and values for 10 TiB and 1 TiB limits.
- The post described custom quotas as a hard spending ceiling. Google documents BigQuery custom quotas as approximate safeguards, so the wording now avoids presenting them as exact hard caps.
- The budget example used the incorrect flag `--notifications-pubsub-topic`. Updated it to the documented `--notifications-rule-pubsub-topic` flag and added `--calendar-period=month` to match the monthly budget description.
- The post implied budget alerts could be relied on as hard controls. Added a caveat that budget alerts are not real-time hard caps and should be combined with quotas and query limits.
- The Cloud Function example imported `bigquery_reservation_v1` but did not use it. Removed the unused import.
- The labels section claimed labels can control costs. Labels provide cost attribution and tracking, not quota enforcement, so the section title and wording were corrected.
- The INFORMATION_SCHEMA cost queries estimated cost from `total_bytes_processed`. BigQuery cost estimates should use `total_bytes_billed`, so the queries now use billed bytes and label the result as TiB billed.
- The governance query counted quota rejections with `quotaExceeded`; BigQuery custom quota errors use `usageQuotaExceeded`, so the query was updated.
- The INFORMATION_SCHEMA cost queries did not exclude script parent jobs, which can double-count multi-statement query costs. Added `statement_type != 'SCRIPT'`.

## Review Notes
The remaining cost estimates assume the standard on-demand price of $6.25 per TiB and do not account for every billing nuance, such as BigQuery ML multipliers, row-level security visibility limits, free tier, reservations, or regional price differences. The examples are still appropriate as illustrative governance queries.
