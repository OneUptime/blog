# Validation Summary: How to Configure Custom Health Checks with Content Matching on GCP Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud health checks
- Google Cloud CLI
- Terraform Google provider
- Node.js / Express-style health endpoint
- gRPC health checking protocol
- Cloud Logging / Cloud Monitoring

## Sources Consulted
- Google Cloud Load Balancing health checks overview: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud Load Balancing health check usage guide: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud SDK reference for `gcloud compute health-checks create http`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Google Cloud SDK reference for `gcloud compute health-checks create https`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/https
- Google Cloud SDK reference for `gcloud compute health-checks create grpc`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/grpc
- Compute Engine REST API healthChecks resource: https://cloud.google.com/compute/docs/reference/rest/v1/healthChecks
- Terraform Google provider `google_compute_health_check` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- Google Cloud health check logging documentation: https://cloud.google.com/load-balancing/docs/health-check-logging
- Google Cloud load balancing metrics documentation: https://cloud.google.com/load-balancing/docs/metrics
- Cloud Monitoring Google Cloud metrics list for Compute Engine uptime metrics: https://cloud.google.com/monitoring/api/metrics_gcp_c

## Issues Found
- The post said the `--response` string is matched anywhere in the response body. Google Cloud health checks inspect the first 1024 bytes/characters of the HTTP response body, so the wording was corrected.
- The `response` parameter description did not state that the match string must be ASCII and is only checked in the first 1024 bytes. The description was corrected.
- The post said GCP allows multiple health checks on a single backend service. Current Google Cloud documentation states that each backend service must reference a single health check, so the liveness/readiness section was corrected to recommend choosing the readiness check for the load-balanced backend service and using different health checks for different backend services.
- The `gcloud compute health-checks create` examples omitted an explicit health check scope. Because the post's backend service examples are global, the commands were updated with `--global` to avoid regional prompts and scope mismatches.
- The monitoring recommendation referenced `compute.googleapis.com/instance/uptime_total` filtered by health check status. That metric tracks VM uptime and does not expose load balancer health check state. The recommendation was corrected to use health check logging fields such as `healthState` and `detailedHealthState`, optionally with logs-based metrics or alerts.

## Review Notes
The `gcloud compute health-checks create http`, `https`, and `grpc` command forms and the Terraform `google_compute_health_check` fields are current. The example Node.js endpoint is illustrative and assumes existing `app`, `db`, `redis`, and `getDiskFreeSpace` definitions.
