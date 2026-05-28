# Validation Summary: How to Configure Horizontal Pod Autoscaler Based on Custom Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes custom metrics API
- Prometheus
- Prometheus Adapter
- kube-prometheus-stack Helm chart
- Google Cloud Managed Service for Prometheus
- Custom Metrics Stackdriver Adapter
- Node.js, Express, and prom-client

## Sources Consulted
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes HPA concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- GKE HPA documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/horizontal-pod-autoscaling
- GKE autoscaling based on metrics tutorial: https://cloud.google.com/kubernetes-engine/docs/tutorials/autoscaling-metrics
- Google Cloud Managed Service for Prometheus HPA documentation: https://cloud.google.com/stackdriver/docs/managed-prometheus/hpa
- Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter
- prometheus-community kube-prometheus-stack Helm values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- prometheus-community prometheus-adapter Helm values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/values.yaml
- prom-client package documentation: https://www.npmjs.com/package/prom-client

## Issues Found
- The Node.js `prom-client` gauge used `labelValues`, but prom-client metrics use `labelNames` when labels are needed. Removed the invalid option because the example does not use a custom service label.
- The ServiceMonitor snippet assumed a matching Kubernetes Service and named port without saying so. Added a sentence clarifying that the Service must have label `app: my-app` and a port named `http`.
- The Prometheus Adapter request-duration rule queried `app_request_duration_seconds_count` but used a rename regex for `_total`, so the metric would not be exposed as intended. Changed the regex to match `_count` and clarified that this is a request-rate metric.
- The HPA snippet called CPU a fallback metric. Kubernetes evaluates all configured metrics and scales based on the largest desired replica count, so the comment now describes CPU as another scaling signal.
- The load-test command used `wget` against an Express route that only accepts `POST /process`. Changed the load generator to use `curl -X POST`.
- The GMP section implied that Stackdriver Adapter is the only adapter path. Google Cloud documents KEDA, Custom Metrics Stackdriver Adapter, and Prometheus Adapter options, and warns not to run Stackdriver Adapter and Prometheus Adapter together. Updated the wording accordingly.
- The prerequisites required GKE Standard mode outright. Softened this to say Standard is the most flexible option for the self-managed Prometheus Adapter path, while Autopilot users should use the managed Prometheus path discussed later.

## Review Notes
Helm, gcloud, and kubectl were not installed in the local environment, so CLI verification was done against official documentation rather than local `--help` output. The tutorial still assumes the reader has a working Deployment and Service for `my-app`; the reviewed changes preserve the author's scope without adding a full application manifest.
