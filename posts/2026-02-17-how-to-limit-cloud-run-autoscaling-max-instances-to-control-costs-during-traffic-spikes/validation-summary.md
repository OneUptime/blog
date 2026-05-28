# Validation Summary: Limit Cloud Run Autoscaling Max Instances to Control Costs During Traffic Spikes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run autoscaling
- Google Cloud CLI
- Cloud Run service YAML
- Terraform Google provider
- Cloud Billing budgets
- Cloud Monitoring alerting policies
- Cloud Logging
- Python requests retry logic

## Sources Consulted
- Google Cloud Run: Set maximum instances for services: https://docs.cloud.google.com/run/docs/configuring/max-instances
- Google Cloud Run: About maximum instances: https://docs.cloud.google.com/run/docs/configuring/max-instances-limits
- Google Cloud Run: About instance autoscaling in Cloud Run services: https://docs.cloud.google.com/run/docs/about-instance-autoscaling
- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Cloud Run: Set minimum instances for services: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run: Maximum concurrent requests for services: https://docs.cloud.google.com/run/docs/about-concurrency
- Google Cloud SDK: gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK: gcloud billing budgets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Google Cloud SDK: gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Registry: google_cloud_run_v2_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Google Cloud Monitoring metrics list for Cloud Run: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z

## Issues Found
- The post stated that the default Cloud Run maximum is 1000 instances. Current Google Cloud documentation distinguishes service-level maximum instances from revision-level maximum instances, and service capacity is bounded by regional CPU, memory, and GPU quotas. I changed the statement to say Cloud Run can scale up to the maximum allowed by regional quotas, which can be 1000 instances or more.
- The cost example used an outdated or incomplete CPU-only estimate. I updated the example to include current Tier 1 request-based CPU and memory pricing for 1 vCPU and 512 MiB memory, and adjusted the hourly, eight-hour, capped-hour, and budget-derived values.
- The gcloud examples used `--max-instances`, which configures revision-level scaling. For service-level cost safeguards, current Cloud Run documentation uses `--max`, so I updated the deploy, update, combined configuration, per-service, and emergency response commands.
- The YAML example used the revision-level `autoscaling.knative.dev/maxScale` annotation. I changed it to the service-level `run.googleapis.com/maxScale` annotation.
- The Terraform example placed `scaling` inside `template`, which is revision-level configuration. I moved the `scaling` block to the service level for `google_cloud_run_v2_service`.
- The retry backoff comment said `2s, 5s, 9s`, but the code computes `2s, 3s, 5s`. I corrected the comment.
- The scaling envelope described throughput as `instances x concurrency`. I changed this to concurrent capacity, because concurrency is simultaneous request capacity, not requests per second.
- The budget command used `--threshold-rules` with whole-number percentages. The current gcloud flag is repeatable `--threshold-rule`, and percent values are fractional from 0.0 to 1.0. I corrected the command.
- The monitoring policy command used unsupported threshold flags. I updated it to the current `gcloud monitoring policies create` syntax with `--duration` and `--if`.
- The log query attempted to filter logs by a Cloud Monitoring metric type. I replaced it with a Cloud Logging query for recent autoscaling-related log entries and left the 429 log query intact.

## Review Notes
The examples are now technically valid against current official documentation. The cost estimates remain approximate because Cloud Run prices vary by region, billing mode, free-tier usage, currency, and committed-use discounts.
