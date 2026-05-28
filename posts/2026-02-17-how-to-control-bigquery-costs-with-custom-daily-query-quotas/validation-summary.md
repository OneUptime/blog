# Validation Summary: How to Control BigQuery Costs with Custom Daily Query Quotas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery custom query quotas
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- BigQuery `INFORMATION_SCHEMA`
- Python BigQuery client library
- Cloud Monitoring alert policies

## Sources Consulted
- BigQuery custom query quotas: https://cloud.google.com/bigquery/docs/custom-quotas
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery cost controls and maximum bytes billed: https://cloud.google.com/bigquery/docs/best-practices-costs
- BigQuery `INFORMATION_SCHEMA.JOBS` schema: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery bq command-line reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery capacity commitments: https://cloud.google.com/bigquery/docs/reservations-commitments
- Google Cloud Monitoring metrics list for BigQuery: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- `gcloud alpha services quota list`: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/list
- `gcloud alpha services quota update`: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/update
- `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post described BigQuery on-demand pricing and free tier in TB. Updated this to TiB to match BigQuery pricing documentation.
- The Cloud Console quota step said to enter limits in bytes. Updated it to TiB, matching the BigQuery custom quotas UI documentation.
- The quota-checking command used `gcloud services quotas list`, which is not the documented command. Updated it to `gcloud alpha services quota list`.
- The quota automation example was a Python stub that did not actually call the Service Usage API. Replaced it with the documented alpha quota update command pattern and placeholders for metric/unit values copied from the quota list output.
- The user-level quota section implied per-user quotas are configured in BigQuery project settings and could be user-specific. Clarified that they are edited through Quotas & System Limits, apply separately to every user and service account, and cannot be customized for one individual user.
- The usage analysis queries estimated cost from `total_bytes_processed`. Updated them to use `total_bytes_billed`, which is the better field for on-demand billing estimates, and aligned daily grouping with Pacific Time where quota reset behavior matters.
- The maximum bytes billed SQL example included a comment-style directive that BigQuery does not treat as a query setting. Removed the pseudo-directive and added a valid `bq query --maximum_bytes_billed` example.
- The flat-rate pricing section used outdated terminology and an invalid `--edition=STANDARD` capacity commitment example. Updated the section to BigQuery Editions pricing and changed the example to a valid Enterprise commitment with a renewal plan.
- The Cloud Monitoring alert command used obsolete or invalid flag names. Updated it to the documented `gcloud monitoring policies create` flags using `--if`, `--duration`, and `--aggregation`.
- Added a note that custom query quotas are approximate safeguards rather than strict byte-by-byte caps, matching the BigQuery custom quotas documentation.

## Review Notes
The examples are now aligned with current official documentation as of 2026-05-28. The Service Usage quota update command intentionally uses placeholders for metric, unit, and value because Google exposes these from quota list output and the exact unit should be copied from the project's returned quota metadata.
