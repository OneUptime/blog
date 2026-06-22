# Validation Summary: How to Fix 'Quota Exceeded' Errors in GCP

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Platform quotas
- Google Cloud CLI (`gcloud`)
- Cloud Quotas API and quota preferences
- Cloud Monitoring metrics and alerting policies
- Terraform Google provider resources for Cloud Monitoring
- Python Google Cloud client libraries
- Compute Engine Spot VMs

## Sources Consulted
- Google Cloud documentation: View and manage quotas: https://docs.cloud.google.com/docs/quotas/view-manage
- Google Cloud documentation: Manage quotas using the gcloud beta CLI: https://docs.cloud.google.com/docs/quotas/gcloud-cli-examples
- Google Cloud SDK reference: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK reference: `gcloud alpha services quota create/update/list`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/services/quota/create
- Google Cloud Monitoring documentation: Chart and monitor quota metrics: https://docs.cloud.google.com/monitoring/alerts/using-quota-metrics
- Google Cloud Monitoring documentation: Create alerting policies with Terraform: https://docs.cloud.google.com/monitoring/alerts/terraform
- Compute Engine documentation: Spot VMs quotas: https://docs.cloud.google.com/compute/docs/instances/spot

## Issues Found
- The service quota listing example used `gcloud alpha services quota list` without the current Cloud Quotas flow. Replaced it with `gcloud beta quotas info list --service=compute.googleapis.com --project=my-project`, matching the current Cloud Quotas CLI documentation.
- The Python quota monitoring example was missing `import time`, included an unused `query` import, and used a non-current Compute Engine-specific quota metric for CPU quota usage. Updated it to query `serviceruntime.googleapis.com/quota/allocation/usage` on the `consumer_quota` resource with `metric.label.quota_metric="compute.googleapis.com/cpus"`.
- The quota increase example used `gcloud alpha services quota update`, which updates consumer quota overrides rather than representing the current documented quota adjustment request flow. Replaced it with `gcloud beta quotas preferences create` using `--quota-id=CPUS-per-project-region`, dimensions, contact email, and justification. Updated the status check to list reconciling quota preferences.
- The batch Compute Engine Python example used `time.sleep()` without importing `time`, and described the loop as true batch operations. Added the missing import and clarified that the code throttles individual insert calls in small groups.
- The Cloud Monitoring alert command used incorrect flags (`--condition-threshold-value` and `--condition-threshold-comparison`) and an incorrect quota metric. Updated it to current `gcloud monitoring policies create` syntax with `--if`, `--duration`, and the consumer quota allocation usage metric.
- The Terraform alert policy used the same incorrect quota metric and described an 80% threshold while comparing against a raw usage value. Updated the metric filter and changed the example to an absolute 80 vCPU threshold.
- The Spot VM emergency guidance stated that Spot VMs have separate quota pools without qualification. Updated it to note that Spot VMs use preemptible quota only when Google Cloud has granted that quota for the region; otherwise they can consume standard quota.

## Review Notes
The post is technically relevant and was validated after corrections. Some examples remain illustrative and require project-specific values, IAM permissions, enabled APIs, and notification channel IDs before they can be run in a real project.
