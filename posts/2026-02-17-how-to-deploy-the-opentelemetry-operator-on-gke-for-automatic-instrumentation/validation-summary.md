# Validation Summary: How to Deploy the OpenTelemetry Operator on GKE for Automatic Instrumentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes admission webhooks and annotations
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry automatic instrumentation
- Helm
- cert-manager
- Google Cloud Trace
- Google Cloud Managed Service for Prometheus
- Workload Identity Federation for GKE

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator compatibility documentation: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/compatibility.md
- OpenTelemetry Operator Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/values.yaml
- OpenTelemetry Collector Google Cloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md
- OpenTelemetry Collector Google Managed Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlemanagedprometheusexporter/README.md
- Google Cloud documentation for deploying a Google-built OpenTelemetry Collector on GKE: https://cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-gke
- Google Cloud Managed Service for Prometheus OpenTelemetry Collector documentation: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-otel
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- cert-manager installation and supported releases documentation: https://cert-manager.io/docs/installation/kubectl/ and https://cert-manager.io/docs/releases/

## Issues Found
- The prerequisites listed a fixed Kubernetes 1.24 minimum. Current OpenTelemetry Operator and cert-manager support depends on the exact release pair, so this was changed to require a Kubernetes version supported by the releases being installed.
- The cert-manager install snippet used an old release and only waited for pods with `app=cert-manager`, which does not verify all cert-manager components. Updated it to the current official manifest example and rollout checks for controller, cainjector, and webhook deployments.
- The Helm install used the older Docker Hub collector image repository. Updated it to the current GHCR collector-contrib image repository used by official OpenTelemetry releases.
- The post included Go auto-instrumentation examples without enabling Go instrumentation in the operator. Added the Helm value to enable Go auto-instrumentation.
- The introduction and injection flow described all injection as init-container based. Go auto-instrumentation uses a sidecar, so the wording and sequence diagram were corrected.
- The collector was later bound to a Kubernetes service account for Workload Identity Federation, but the collector CR did not set `spec.serviceAccount`. Added `serviceAccount: otel-collector` and created that Kubernetes service account before deploying the collector.
- The Workload Identity commands granted impersonation to `observability/otel-gateway-collector`, but the collector was changed to use `observability/otel-collector`. Updated the IAM binding and added the required Kubernetes service account annotation.
- The sampler comment said 100% sampling while the configured `parentbased_traceidratio` argument was `0.1`. Corrected the comment to 10%.
- The Go annotation example was missing `instrumentation.opentelemetry.io/otel-go-auto-target-exe`, which is required unless the target executable is supplied through the Instrumentation resource. Added the annotation placeholder.

## Review Notes
- The snippets still use placeholder values such as `my-gcp-project`, image names, and Go executable paths. Users must replace those placeholders before applying the manifests.
- The local environment did not have `helm`, `kubectl`, or `gcloud` installed, so command verification was performed against official documentation rather than local CLI help output.
