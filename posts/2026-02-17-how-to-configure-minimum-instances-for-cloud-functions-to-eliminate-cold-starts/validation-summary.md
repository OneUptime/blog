# Validation Summary: How to Configure Minimum Instances for Cloud Functions to Eliminate Cold Starts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Cloud Run minimum instances and request-based billing
- Google Cloud CLI (`gcloud functions`, `gcloud run`, `gcloud monitoring`, `gcloud scheduler`)
- Cloud Monitoring metrics
- Terraform `google_cloudfunctions2_function`
- Node.js runtimes on Cloud Run functions

## Sources Consulted
- Google Cloud Run minimum instances documentation: https://cloud.google.com/functions/docs/configuring/min-instances
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK `gcloud run services update` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update
- Google Cloud Run billing settings documentation: https://cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Cloud Monitoring Google Cloud metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Terraform Google provider `google_cloudfunctions2_function` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The post repeatedly claimed minimum instances "eliminate" cold starts. Minimum instances keep provisioned capacity warm, but instances can restart and scale-out instances can still cold start. Changed wording to "reduce" cold starts or avoid the usual cold start path for warm baseline capacity.
- The Gen 2 update example used `--update-no-code`, which is not a documented `gcloud functions deploy` flag. Removed the unsupported flag; `--runtime` and `--source` are optional when updating an existing function.
- The Gen 1 example did not force first generation deployment. Added `--no-gen2` because the `functions/gen2` gcloud property can otherwise affect the command.
- The traffic analysis command used `gcloud monitoring metrics list` while describing historical concurrency data. Changed the surrounding text so the command accurately describes confirming the metric to chart in Cloud Monitoring, and used the documented `cloudfunctions.googleapis.com/function/instance_count` metric.
- The billing section said idle minimum instances only cost memory when CPU throttling/request-based billing is used. Cloud Run pricing documents lower idle CPU and memory charges for request-based billing when minimum instances are idle. Updated the billing explanation and changed the command to `gcloud run services update ... --cpu-throttling`, which is the documented way to set request-based billing on the underlying Cloud Run service.
- The cost estimate omitted idle CPU charges. Clarified that the $0.11/day figure is the 512MB memory portion only and that CPU idle charges, requests, free tier, and regional pricing also affect total cost.

## Review Notes
Node.js 20 is currently listed as supported for both 1st gen and Cloud Run functions, but it is in deprecation as of 2026-04-30 with decommission scheduled for 2026-10-30. A future refresh should move examples to Node.js 22 or newer.
