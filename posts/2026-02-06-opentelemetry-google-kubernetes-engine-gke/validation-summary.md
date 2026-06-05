# Validation Summary: How to Set Up OpenTelemetry on Google Kubernetes Engine (GKE)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Helm chart
- Google Kubernetes Engine (GKE)
- Kubernetes DaemonSets, Deployments, Services, and ServiceAccounts
- GKE Workload Identity Federation
- Google Cloud Trace and Cloud Monitoring
- OTLP gRPC and OTLP HTTP

## Sources Consulted
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Helm chart source and default values: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector
- OpenTelemetry Collector Kubernetes distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-k8s/manifest.yaml
- OpenTelemetry Collector Contrib distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector Google Cloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector Kubelet Stats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter
- OpenTelemetry Collector File Storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The Helm values snippets omitted `image.repository`, which is required by the current OpenTelemetry Collector Helm chart. Added `otel/opentelemetry-collector-k8s` for the agent and `otel/opentelemetry-collector-contrib` for the gateway.
- The gateway used the `googlecloud` exporter, which is not included in the Kubernetes Collector distribution. Set the gateway image to the Contrib distribution, which includes that exporter.
- The agent forwarded to `otel-gateway-collector`, but the Helm chart generates the service name `otel-gateway-opentelemetry-collector` for the `otel-gateway` release. Corrected the endpoint.
- The agent manually configured `kubeletstats` and `k8sattributes` without enabling the chart presets that add the needed Kubernetes RBAC and environment variables. Enabled the `kubeletMetrics` and `kubernetesAttributes` presets.
- The gateway verification command port-forwarded service port `8888`, but the chart's metrics service port is disabled by default. Enabled `ports.metrics`.
- The gateway used the deprecated `otlphttp` exporter alias. Updated it to `otlp_http` and changed pipeline references accordingly.
- The metrics pipeline did not export to Google Cloud Monitoring despite the architecture, IAM permissions, and surrounding text saying it could. Added `googlecloud` to the metrics pipeline exporters.
- The persistent queue example referenced `file_storage` without defining or enabling the File Storage extension. Added the minimal extension configuration and `service.extensions` entry.
- The post description claimed log instrumentation, but the examples only configure traces and metrics. Updated the description to match the implemented pipelines.

## Review Notes
The local environment did not have `helm`, `kubectl`, or `gcloud` installed, so command validation was performed against official documentation and upstream chart/source files rather than local CLI execution.
