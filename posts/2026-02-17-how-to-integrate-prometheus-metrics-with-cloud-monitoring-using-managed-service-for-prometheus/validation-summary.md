# Validation Summary: How to Integrate Prometheus Metrics with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Managed Service for Prometheus
- Google Kubernetes Engine
- Cloud Monitoring
- Prometheus and PromQL
- Kubernetes PodMonitoring and ClusterPodMonitoring custom resources
- Cloud Monitoring alerting policies and dashboards
- Google Cloud Ops Agent

## Sources Consulted
- Google Cloud Managed Service for Prometheus overview: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus
- Google Cloud managed collection setup guide: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- Google Cloud self-deployed collection setup guide: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-unmanaged
- Google Cloud Ops Agent Prometheus receiver guide: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-opsagent
- Google Cloud Monitoring alert policy REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring dashboard REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Monitoring filter syntax reference: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK `gcloud container clusters update` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- GoogleCloudPlatform/prometheus-engine CRD API reference: https://raw.githubusercontent.com/GoogleCloudPlatform/prometheus-engine/main/doc/api.md

## Issues Found
- The post described GMP retention as essentially unlimited. Google Cloud documentation states that Managed Service for Prometheus stores Prometheus data for 24 months, so the retention wording was corrected.
- The post described GMP as having only two collection modes. Current documentation describes four collection options: managed collection, self-deployed collection, the OpenTelemetry Collector, and the Ops Agent. The text was updated.
- The post said enabling managed collection automatically starts collecting cluster and node metrics. Current managed collection documentation states that after enabling managed collection, no metrics are generated until PodMonitoring or ClusterPodMonitoring resources are configured, or a managed metric package such as GKE kube state metrics is enabled. The statement was corrected.
- The self-deployed collection section incorrectly described deploying the GMP operator and configuring remote-write to Cloud Monitoring. Current documentation describes self-deployed collection as running the Managed Service for Prometheus drop-in Prometheus binary. The commands and example were corrected.
- The outside-GKE section showed a direct Prometheus `remote_write` configuration to a GMP write endpoint. Current documentation recommends managed collection for non-GKE Kubernetes, self-deployed collection, OpenTelemetry Collector, Cloud Run sidecar, or Ops Agent depending on the platform. The example was replaced with an Ops Agent Prometheus receiver configuration for Compute Engine VMs.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI flags were verified against official Google Cloud SDK reference pages instead of local `--help` output.
