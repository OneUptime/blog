# Validation Summary: Use Cloud Functions Gen 2 Concurrency to Handle Multiple Requests Per Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions 2nd gen
- Cloud Run concurrency and autoscaling
- gcloud CLI
- Terraform `google_cloudfunctions2_function`
- Node.js Functions Framework examples
- Cloud Monitoring metrics
- PostgreSQL connection pooling with `pg`

## Sources Consulted
- Google Cloud Run functions comparison: https://docs.cloud.google.com/run/docs/functions/comparison
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run maximum concurrent requests concept doc: https://docs.cloud.google.com/run/docs/about-concurrency
- Cloud Run concurrency configuration doc: https://docs.cloud.google.com/run/docs/configuring/concurrency
- Cloud Run instance autoscaling doc: https://docs.cloud.google.com/run/docs/about-instance-autoscaling
- Cloud Run billing settings / CPU allocation doc: https://docs.cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Monitoring Cloud Run metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Terraform `google_cloudfunctions2_function` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The CPU allocation example used `gcloud functions deploy --cpu-throttling` and `--no-cpu-throttling`, but those flags are Cloud Run service flags, not `gcloud functions deploy` flags. Updated the section to describe Cloud Run request-based and instance-based billing and changed the examples to `gcloud run services update`.
- The shared cache example claimed only one request would fetch a missing config, but simultaneous cache misses could all call the database. Added an in-flight promise so concurrent requests share the same fetch and reset it safely after completion or failure.
- The monitoring command claimed to check concurrent requests per instance but listed `run.googleapis.com/container/instance_count`. Changed it to list `run.googleapis.com/container/max_request_concurrencies`, the Cloud Run metric for maximum concurrent requests per container instance.

## Review Notes
- The post uses the older "Cloud Functions Gen 2" terminology. Google documentation now presents this as Cloud Run functions, formerly Cloud Functions 2nd gen, but the old term remains understandable for users migrating from Cloud Functions.
- The general guidance about starting conservatively, load testing, and tuning concurrency based on CPU, memory, latency, and error rate is consistent with Google Cloud's current recommendations.
