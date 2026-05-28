# Validation Summary: How to Fix GKE HorizontalPodAutoscaler Not Scaling Based on Custom Metrics

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes custom.metrics.k8s.io and external.metrics.k8s.io APIs
- Custom Metrics Stackdriver Adapter
- Google Cloud Monitoring API
- Google Cloud Managed Service for Prometheus
- Google Cloud IAM / Workload Identity Federation for GKE
- Python google-cloud-monitoring client library

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- GKE optimize Pod autoscaling based on metrics tutorial: https://cloud.google.com/kubernetes-engine/docs/tutorials/autoscaling-metrics
- GKE custom and external metrics concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/custom-and-external-metrics
- Google Cloud Managed Service for Prometheus HPA documentation: https://cloud.google.com/stackdriver/docs/managed-prometheus/hpa
- Cloud Monitoring create user-defined metrics documentation: https://cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Monitoring retrieve time-series data documentation: https://cloud.google.com/monitoring/custom-metrics/reading-metrics
- Cloud Monitoring monitored resource types documentation: https://cloud.google.com/monitoring/api/resources
- Google Cloud CLI monitoring reference: https://cloud.google.com/sdk/gcloud/reference/monitoring

## Issues Found
- The post used `gcloud monitoring metrics list` and `gcloud monitoring time-series list`, but the current Google Cloud CLI monitoring command group does not document these as supported commands. Replaced the examples with Cloud Monitoring REST API calls authenticated with `gcloud auth print-access-token`.
- The time-series example used `date -u -v-10M`, which is BSD/macOS-specific and fails on typical Linux environments such as Cloud Shell. Replaced it with `date -u -d '10 minutes ago'`.
- The Workload Identity permissions example granted `roles/monitoring.viewer` to a placeholder Google service account. Current GKE documentation grants this role directly to the Kubernetes service account principal for the adapter. Updated the IAM check and grant commands to use the documented `principal://.../subject/ns/custom-metrics/sa/custom-metrics-stackdriver-adapter` member.

## Review Notes
The HPA `autoscaling/v2` examples, Stackdriver pipe-separated metric naming, Pub/Sub external metric selector, custom metrics adapter install URL, HPA scaling formula, tolerance behavior, and scaling behavior fields matched current Kubernetes and Google Cloud documentation. Local `gcloud` and `kubectl` binaries were not installed in the review environment, so CLI validation was performed against official documentation rather than local `--help` output.
