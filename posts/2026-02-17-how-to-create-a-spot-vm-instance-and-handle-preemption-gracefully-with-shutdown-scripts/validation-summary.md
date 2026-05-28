# Validation Summary: How to Create a Spot VM Instance and Handle Preemption Gracefully

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Spot VMs and preemptible VM behavior
- Google Cloud CLI
- Compute Engine metadata server
- Compute Engine startup and shutdown scripts
- Managed instance groups
- Terraform Google provider
- Cloud Storage and gsutil
- Bash and Python

## Sources Consulted
- Google Cloud Compute Engine Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud Create and use Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Google Cloud SDK `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK `gcloud compute instance-templates create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud shutdown scripts documentation: https://docs.cloud.google.com/compute/docs/shutdownscript
- Google Cloud Compute Engine pricing documentation: https://cloud.google.com/products/compute/pricing
- Terraform Google provider `google_compute_instance_template` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Cloud Storage resumable uploads documentation: https://docs.cloud.google.com/storage/docs/resumable-uploads

## Issues Found
- The preemption sequence described the notice as arriving 30 seconds before termination and then separately sending an ACPI G2 signal. Google documents the preemption notice itself as an ACPI G2 soft-off signal, with a best-effort shutdown period of up to 30 seconds by default, followed by ACPI G3 mechanical off if needed. Updated the sequence to match that behavior.
- The Terraform instance template used `preemptible = false` with `provisioning_model = "SPOT"`. The current Terraform Google provider documentation says Spot templates should use `preemptible = true` and `automatic_restart = false`. Updated `preemptible` to `true`.
- The committed-use discount rows in the cost comparison used outdated/incorrect percentages for general-purpose machines. Current Google Cloud pricing docs list up to 37% for one-year resource-based CUDs and 55% for three-year resource-based CUDs for non-memory-optimized machine types. Updated the rough hourly and monthly values accordingly.

## Review Notes
Spot VM prices are variable and can change over time, so the Spot row remains an illustrative rough estimate. Google Cloud's current docs also mention an optional 120-second preemption notice duration in preview; the post's 30-second guidance is still correct for the default Spot VM behavior.
