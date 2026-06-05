# Validation Summary: How to Use OpenTelemetry with k3s and Lightweight Kubernetes Distributions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator
- OpenTelemetry Python SDK
- OTLP over gRPC and HTTP
- Kubernetes DaemonSets and custom resources
- k3s
- MicroK8s
- k0s
- Helm
- Prometheus scraping

## Sources Consulted
- OpenTelemetry Operator GitHub documentation: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector Kubernetes distribution manifest: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-releases/main/distributions/otelcol-k8s/manifest.yaml
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python trace export API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- K3s metrics documentation: https://docs.k3s.io/reference/metrics
- k0s kubeconfig admin documentation: https://docs.k0sproject.io/stable/cli/k0s_kubeconfig_admin/
- MicroK8s addons and command documentation: https://microk8s.io/docs/addons and https://microk8s.io/docs/command-reference

## Issues Found
- The OpenTelemetry Operator Helm install assumed cert-manager was already installed. The official chart documentation says the default values expect cert-manager, so the command was updated to use the chart's auto-generated webhook certificate settings for a lightweight cluster.
- The collector config referenced `${OTEL_API_KEY}` without defining the environment variable in the Collector pod and used older-style substitution. Added a Kubernetes Secret creation command, injected `OTEL_API_KEY` into the `OpenTelemetryCollector` spec, and changed the config reference to `${env:OTEL_API_KEY}`.
- The Python example imported and instantiated `BatchSpanExporter`, which is not the current OpenTelemetry Python SDK API. Replaced it with `BatchSpanProcessor`, matching the official Python tracing examples and API reference.
- The k3s component metrics example used `127.0.0.1:10249` as a k3s server metrics endpoint. K3s exposes supervisor metrics from the k3s process on `/metrics` at port 6443 when `supervisor-metrics` is enabled, so the scrape example was corrected to scrape `https://kubernetes.default.svc:443/metrics` with the pod service account token and CA file.
- The k3s datastore description only mentioned SQLite or etcd. Updated it to include external datastores, which k3s supports.
- The k0s example pointed Helm at `open-telemetry/opentelemetry-helm-charts`, which is a repository URL, not a chart reference. Replaced it with `open-telemetry/opentelemetry-operator`.
- The k0s kubeconfig example referenced `/var/lib/k0s/pki/admin.conf` directly. Updated it to use the documented `k0s kubeconfig admin` command.

## Review Notes
- The Prometheus scrape example for k3s supervisor metrics still requires appropriate RBAC for the Collector service account to access the non-resource URL `/metrics`.
- The file-backed sending queue example is technically valid, but production deployments should monitor disk usage and queue metrics because persistent queues can still lose data if the disk fills or fails.
- The MicroK8s observability addon command is plausible for MicroK8s environments where the community addon repository exposes it, but available addons can vary by MicroK8s channel and installed addon repositories.
