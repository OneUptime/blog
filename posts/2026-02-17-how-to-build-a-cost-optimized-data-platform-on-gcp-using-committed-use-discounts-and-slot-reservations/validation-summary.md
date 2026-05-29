# Validation Summary: How to Build a Cost-Optimized Data Platform on GCP Using Committed Use Discounts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery reservations and capacity commitments
- BigQuery Information Schema
- Terraform Google provider resources for BigQuery reservations
- Google Cloud CLI (`bq` and `gcloud`)
- Compute Engine committed use discounts
- Compute Engine Spot VMs and managed instance groups
- BigQuery storage billing models
- Python BigQuery Reservation API client

## Sources Consulted
- Google Cloud BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery purchase and manage slot commitments: https://cloud.google.com/bigquery/docs/reservations-commitments
- BigQuery manage workload reservations: https://cloud.google.com/bigquery/docs/reservations-tasks
- BigQuery workload management and idle slots: https://cloud.google.com/bigquery/docs/reservations-workload-management
- BigQuery reservation assignments: https://cloud.google.com/bigquery/docs/reservations-assignments
- BigQuery `INFORMATION_SCHEMA.JOBS`: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery `INFORMATION_SCHEMA.TABLE_STORAGE`: https://cloud.google.com/bigquery/docs/information-schema-table-storage
- BigQuery storage billing models: https://cloud.google.com/bigquery/docs/storage_overview
- Terraform `google_bigquery_capacity_commitment`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_capacity_commitment
- Terraform `google_bigquery_reservation`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_reservation
- Terraform `google_bigquery_reservation_assignment`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_reservation_assignment
- Compute Engine CUD overview: https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- `gcloud compute commitments create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/commitments/create
- Compute Engine Spot VMs: https://cloud.google.com/compute/docs/instances/spot
- Python BigQuery Reservation client reference: https://cloud.google.com/python/docs/reference/bigqueryreservation/latest

## Issues Found
- Corrected BigQuery on-demand units from TB to TiB and noted the free monthly query processing tier.
- Replaced the inaccurate 15-20 TB/month reservation break-even rule with a cost comparison based on a 100-slot Enterprise annual commitment.
- Updated `bq mk --capacity_commitment` examples to use current editions-based fields: `--capacity_commitment=true`, `--edition=ENTERPRISE`, and `--renewal_plan=NONE` for annual commitments.
- Fixed `bq mk --reservation` examples to pass the reservation name as an argument, include `--edition`, and avoid unsupported `--reservation_id` usage for reservation creation.
- Fixed Terraform reservation syntax by replacing invalid `slot_count` on `google_bigquery_reservation` with `slot_capacity` and adding editions-based commitment fields.
- Fixed a possible division-by-zero error in the BigQuery slot usage query.
- Replaced an invalid parent/child reservation example using slash-separated reservation IDs with separate valid reservation names.
- Corrected idle slot sharing scope to reservations in the same administration project and edition with `ignore_idle_slots=false`.
- Updated Compute Engine CUD discount language and changed the N2 commitment type from invalid `GENERAL_PURPOSE` to `general-purpose-n2`.
- Corrected the physical storage billing recommendation by replacing the unrelated "BigQuery Storage API" wording with dataset-level BigQuery physical storage billing.
- Updated flex slot examples to include editions-based capacity commitment fields and the one-minute minimum.
- Updated the Python BigQuery Reservation API example to use enum constants for `plan` and `edition`, and to compare commitment plans against the enum value.

## Review Notes
The examples use representative pricing values that can vary by region, edition, billing account terms, and date. Readers should verify current pricing in Google Cloud Pricing before purchasing commitments.
