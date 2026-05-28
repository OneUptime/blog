# Validation Summary: How to Integrate Datadog with Google Cloud Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Datadog Google Cloud integration
- Google Cloud IAM and service accounts
- Google Cloud Monitoring
- Google Cloud Logging
- Pub/Sub
- Dataflow
- Datadog API
- Datadog monitor queries
- Terraform Datadog provider

## Sources Consulted
- Datadog Google Cloud Platform integration documentation: https://docs.datadoghq.com/integrations/google-cloud-platform/
- Datadog GCP Integration API documentation: https://docs.datadoghq.com/api/latest/gcp-integration/
- Datadog Google Cloud Log Forwarding setup: https://docs.datadoghq.com/logs/guide/google-cloud-log-forwarding/
- Datadog Pub/Sub Push Subscription legacy guide: https://docs.datadoghq.com/logs/guide/collect-google-cloud-logs-with-push/
- Google Cloud Pub/Sub to Datadog Dataflow template documentation: https://cloud.google.com/dataflow/docs/guides/templates/provided/pubsub-to-datadog
- Google Cloud Logging sinks CLI documentation: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Pub/Sub topic CLI documentation: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Datadog Metrics API documentation: https://docs.datadoghq.com/api/latest/metrics/
- Datadog Monitors API documentation: https://docs.datadoghq.com/api/latest/monitors/
- Datadog Google Compute Engine integration metrics: https://docs.datadoghq.com/integrations/google-compute-engine/
- Datadog Google Kubernetes Engine integration metrics: https://docs.datadoghq.com/integrations/google-kubernetes-engine/
- Datadog Terraform provider dashboard resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard

## Issues Found
- The post used the older JSON service account key flow for the Datadog GCP integration. Updated it to Datadog's current service account impersonation flow, including granting the Datadog principal `roles/iam.serviceAccountTokenCreator`.
- The Datadog API example used the legacy `/api/v1/integration/gcp` payload with private key fields. Updated it to the current `/api/v2/integration/gcp/accounts` request format with `client_email` and `type: gcp_service_account`.
- The host filter examples used invalid search-style syntax such as `tags:env:production` and zone filters. Updated examples to Datadog's documented label filter format, including wildcard and exclusion examples.
- The log forwarding section used a Pub/Sub push subscription to Datadog's intake endpoint. Updated it to the current recommended Pub/Sub pull subscription plus Dataflow template flow, and noted that push subscriptions are legacy for this integration.
- The verification command used `date -v-1H`, which is BSD/macOS-specific. Replaced it with a Bash-compatible Unix timestamp calculation.
- Several Datadog GCP metric names were incorrect or outdated: `gcp.compute.*` was changed to `gcp.gce.*`, `gcp.gke.container.cpu.usage_time` was changed to `gcp.gke.container.cpu.core_usage_time`, and `gcp.gke.container.memory.usage` was changed to `gcp.gke.container.memory.used_bytes`.
- The multi-project example said to create a service account at the organization level and granted only `roles/monitoring.viewer`. Updated it to create the service account in an admin project and grant the documented organization-level roles.
- Timing claims were adjusted from 5-10 minutes to about 15 minutes to align with Datadog's current setup expectations.

## Review Notes
The Dataflow command uses a placeholder staging bucket and the default US Datadog intake endpoint. Users on other Datadog sites should use the endpoint for their Datadog site, and production deployments should consider pinning a dated Dataflow template version instead of `latest`.
