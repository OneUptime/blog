# Validation Summary: How to Configure Cloud Run CPU Allocation to Always-On

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run services
- Cloud Run CPU allocation and billing settings
- gcloud CLI
- Cloud Run service YAML
- Terraform Google provider
- Python Flask
- Google Cloud Pub/Sub Python client
- Cloud Monitoring metrics

## Sources Consulted
- Google Cloud Run billing settings for services: https://docs.cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run CPU limits for services: https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run minimum instances for services: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run WebSockets guide: https://docs.cloud.google.com/run/docs/triggering/websockets
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Terraform `google_cloud_run_v2_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Google Cloud Monitoring metrics list for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Pub/Sub Python client reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest

## Issues Found
- The gcloud examples used `--cpu-always-allocated` and `--no-cpu-always-allocated`, which are not the current documented flags. Updated them to `--no-cpu-throttling` for instance-based billing and `--cpu-throttling` for request-based billing.
- The WebSocket explanation said a WebSocket connection stays open but code cannot do anything on it after the request. Cloud Run treats WebSocket streams as active HTTP requests while connected, so CPU remains allocated for the active stream. Updated the wording to focus on separate background work outside active requests.
- The background queue example mentioned pulling from Cloud Tasks. Cloud Tasks is primarily an HTTP task dispatch service for Cloud Run targets, so the example now refers to Pub/Sub or another queue.
- The cost section said request-based idle time is free. Updated it to reflect Cloud Run's documented request-based billing behavior: billing applies while processing requests, starting up, and shutting down.
- The minimum instances cost note was too broad. Updated it to specify minimum instances using instance-based billing cost money while kept running.

## Review Notes
The Terraform, YAML annotation, minimum instance configuration, Pub/Sub subscriber pattern, and Cloud Monitoring metric type were consistent with current official documentation. The post remains a service-focused guide; for new pure background worker workloads, Cloud Run worker pools may also be worth mentioning in a future revision.
