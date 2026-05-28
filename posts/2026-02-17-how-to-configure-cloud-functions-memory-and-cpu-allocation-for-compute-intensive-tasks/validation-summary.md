# Validation Summary: Configure Cloud Functions Memory and CPU Allocation for Compute-Intensive Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Google Cloud CLI (`gcloud functions deploy`, `gcloud run services update`)
- Terraform Google provider (`google_cloudfunctions2_function`)
- Node.js Functions Framework
- Python runtime memory inspection
- Cloud Run billing and resource limits

## Sources Consulted
- Google Cloud SDK reference: `gcloud functions deploy` - https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run documentation: Configure CPU limits for services - https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run documentation: Configure memory limits for services - https://docs.cloud.google.com/run/docs/configuring/services/memory-limits
- Google Cloud Run documentation: Billing settings for services - https://cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run pricing - https://cloud.google.com/run/pricing
- Terraform Google provider documentation: `google_cloudfunctions2_function` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The CPU options list was too restrictive and implied only fixed fractional values. Updated it to reflect that Cloud Run supports 1, 2, 4, 6, and 8 vCPUs, and fractional values below 1 with additional constraints.
- The CPU/memory relationship was described as a simple minimum-memory chart. Replaced it with Cloud Run's current valid CPU/memory ranges.
- The lightweight API example used fractional CPU with `--concurrency=80`, which violates the fractional CPU requirement that maximum concurrency be 1. Changed it to `--concurrency=1`.
- The CPU throttling section used `--cpu-throttling` and `--no-cpu-throttling` with `gcloud functions deploy`, but those flags are Cloud Run service billing-setting flags. Changed the examples to `gcloud run services update`.
- The post claimed compute-intensive functions should always use `--no-cpu-throttling` to get full CPU during request processing. Corrected this: request-based billing still provides configured CPU while handling requests; instance-based billing is needed for CPU outside request handling.
- The pricing table understated or overstated current rough costs. Recalculated the examples using us-central1 request-based billing rates, excluding the free tier, for one million 100ms requests.
- The image-processing note said Sharp loads images entirely into memory. Softened this to the more accurate claim that image processing often needs decompressed pixel buffers.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was done against the official Google Cloud SDK reference. The cost table remains an estimate because Cloud Run pricing varies by region, billing mode, discounts, and free-tier usage.
