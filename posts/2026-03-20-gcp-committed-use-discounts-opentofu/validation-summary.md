# Validation Summary: How to Manage GCP Committed Use Discounts with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Google Cloud Platform (GCP)
- Compute Engine committed use discounts
- Cloud SQL committed use discounts
- Cloud Billing Budgets API
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Terraform Google provider: `google_compute_region_commitment` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_commitment
- Terraform Google provider: `google_billing_budget` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- Terraform Google provider: `google_compute_reservation` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_reservation
- Terraform Google provider: `google_monitoring_notification_channel` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Terraform Google provider: `google_pubsub_topic` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Google provider: `google_project` data source https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/project
- Compute Engine committed use discounts overview https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Resource-based committed use discounts for Compute Engine https://cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts
- Combine reservations with committed use discounts https://cloud.google.com/compute/docs/instances/reservations-with-commitments
- GPU locations https://cloud.google.com/compute/docs/regions-zones/gpu-regions-zones
- Accelerator-optimized machine family https://cloud.google.com/compute/docs/accelerator-optimized-machines
- Cloud SQL committed use discounts https://cloud.google.com/sql/cud
- Cloud Billing Budget API reference https://cloud.google.com/billing/docs/reference/budget/rest/v1/billingAccounts.budgets
- Analyze the effectiveness of your CUDs https://cloud.google.com/billing/docs/how-to/analyze-cuds
- `gcloud compute commitments list` https://cloud.google.com/sdk/gcloud/reference/compute/commitments/list
- `gcloud compute commitments describe` https://cloud.google.com/sdk/gcloud/reference/compute/commitments/describe
- Cloud SQL SKU groups / service ID reference https://cloud.google.com/skus/sku-groups/cloud-sql-enterprise-compute
- Compute Engine SKU groups / service ID reference https://cloud.google.com/skus/sku-groups/on-demand-balanced-persistent-disk

## Issues Found
- The provider version constraint was outdated at `~> 5.0`. I updated it to `~> 7.0` to reflect the current provider major version and kept the syntax compatible with OpenTofu.
- The original Compute Engine examples used undocumented or invalid commitment resource types such as `N2_CPUS` and `NVIDIA_A100_GPUS`. I replaced them with the documented `type` values on the commitment plus valid `resources` entries (`VCPU`, `MEMORY`, `ACCELERATOR`).
- The N2 example was incomplete because N2 family commitments are expressed with `type = "GENERAL_PURPOSE_N2"` and matching vCPU and memory resources. I corrected that example accordingly.
- The GPU example was not valid because GPU commitments must be attached to a reservation and must include matching vCPU, memory, and accelerator resources. I added a matching `google_compute_reservation` and corrected the commitment fields.
- The Cloud SQL section was materially inaccurate. Cloud SQL CUDs are spend-based commitments purchased through Cloud Billing, not automatic discounts based solely on steady usage and not `google_compute_region_commitment` resources. I rewrote that explanation and kept the OpenTofu example focused on budget tracking.
- The Cloud SQL budget filter used the wrong service ID and the wrong project identifier format. I changed the service ID to `9662-B51E-5089` and switched the `projects` filter to `projects/${data.google_project.current.number}`, which matches the Budget API and provider documentation.
- The Compute Engine budget filter also used the wrong project identifier format. I corrected it to use the project number.
- The compute budget snippet used `COMMITTED_USAGE_DISCOUNT_PROGRAM`, which does not match the documented billing credit type values. I replaced it with `COMMITTED_USAGE_DISCOUNT`.
- The monitoring notification channel reference used `.name`; the provider’s own billing budget example uses the channel resource ID/full name form. I changed the snippet to `.id` and added the missing Pub/Sub topic and notification channel resources so the example is internally consistent.
- The CLI example for listing commitments used `--region`, but the documented flag for `gcloud compute commitments list` is `--regions`. I corrected the command.
- The CLI subsection claimed to show utilization, but the command only described the commitment payload. I changed the wording and added a note directing readers to the Cloud Billing CUD analysis report for utilization and savings analysis.
- The original description and conclusion overstated or blurred how Compute Engine and Cloud SQL CUDs are managed. I revised them so the post now accurately distinguishes Compute Engine resource-based commitments from Cloud SQL spend-based commitments.

## Review Notes
- The post is now technically accurate, but Cloud SQL CUD purchases themselves are still performed through Cloud Billing rather than through the Google provider resources shown here.
- Compute Engine GPU commitment examples are sensitive to machine family and zone availability. The corrected example uses `a2-highgpu-4g` in `us-central1-a`, which is listed as an A2 Standard GPU zone in the current GPU locations documentation.
- Provider minor versions will continue to change. If this post is revisited later, the main things to re-check are provider version constraints, commitment type names, and billing credit type values.
