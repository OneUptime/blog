# Validation Summary: Tune Cloud Run Concurrency Settings to Maximize Request Throughput Per Instance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Cloud Monitoring
- Knative Service YAML
- Artifact Registry container image URLs
- HTTP load testing with hey and wrk

## Sources Consulted
- Google Cloud Run maximum concurrent requests documentation: https://cloud.google.com/run/docs/about-concurrency
- Google Cloud Run concurrency configuration documentation: https://cloud.google.com/run/docs/configuring/concurrency
- Google Cloud Run billing settings documentation: https://cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run CPU limits documentation: https://cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run health checks documentation: https://cloud.google.com/run/docs/configuring/healthchecks
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metric type documentation for Cloud Run metrics: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Artifact Registry transition from Container Registry documentation: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The post stated that Cloud Run's default concurrency is always 80. Current Google Cloud documentation says the maximum is 1000, console-created services default to 80, and services first created with Google Cloud CLI or Terraform default to 80 times the number of vCPUs. Updated the wording and changed the first deployment example from "default concurrency" to a "baseline concurrency" of 80.
- The CPU allocation example used `--cpu-throttling` while describing always-allocated CPU. Current gcloud documentation uses `--no-cpu-throttling` for instance-based billing / always-allocated CPU and `--cpu-throttling` for request-based billing. Updated the command and narrowed the recommendation to steady high-concurrency services with background work.
- The alert policy command used non-current flags `--condition-threshold-value` and `--condition-threshold-duration`. The current `gcloud monitoring policies create` reference uses `--if` and `--duration` for threshold conditions. Updated the snippet accordingly.
- The container image examples used `gcr.io` URLs. Container Registry is shut down for writes and Artifact Registry is the recommended current service. Updated examples to use Artifact Registry-style `pkg.dev` image URLs.

## Review Notes
The language-specific concurrency ranges are reasonable starting points, but they remain workload-dependent guidance rather than Cloud Run guarantees. The post correctly emphasizes load testing and observing latency, CPU, memory, and instance count before choosing a final concurrency setting.
