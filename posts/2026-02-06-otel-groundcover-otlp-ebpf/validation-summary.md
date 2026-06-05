# Validation Summary: How to Send OpenTelemetry Data to Groundcover via OTLP for K8s-Native

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK and OTLP exporter
- Groundcover OpenTelemetry ingestion
- Kubernetes DaemonSet, Service, and RBAC
- Kubernetes metadata enrichment
- eBPF-based Kubernetes observability

## Sources Consulted
- Groundcover OpenTelemetry collector integration docs: https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-an-opentelemetry-collector
- Groundcover Kubernetes pods OpenTelemetry ingestion docs: https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-kubernetes-pods
- Groundcover ingestion keys docs: https://docs.groundcover.com/use-groundcover/remote-access-and-apis/ingestion-keys
- Groundcover ingestion endpoints docs: https://docs.groundcover.com/architecture/incloud-managed/ingestion-endpoints
- OpenTelemetry Collector Kubernetes components docs: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector k8sattributes processor package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector k8sevents receiver package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python exporter docs: https://opentelemetry.io/docs/languages/python/exporters/
- Kubernetes DaemonSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Service Internal Traffic Policy docs: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/

## Issues Found
- The Collector configuration used `k8s_attributes`, but the current OpenTelemetry Collector processor component name is `k8sattributes`. Updated the processor key and all pipeline/prose references.
- The Groundcover exporter used `otlp` with `ingest.groundcover.com:443` and `x-groundcover-api-key`. Groundcover's current docs show OTLP/HTTP export to the workspace BYOC endpoint with an ingestion key header such as `apikey` or `Authorization`. Updated the example to `otlphttp/groundcover`, `${env:GROUNDCOVER_OTLP_ENDPOINT}`, and `${env:GROUNDCOVER_INGESTION_KEY}`.
- The Collector config used legacy-style environment substitution. Updated it to the documented Collector syntax `${env:VAR_NAME}`.
- The DaemonSet Service was described as node-local, but a normal ClusterIP Service can route to non-local endpoints. Added `internalTrafficPolicy: Local`, which Kubernetes documents for node-local internal Service routing.
- The Kubernetes metadata processor only associated pods by `k8s.pod.ip`, but the Python example did not set that attribute. Added the documented connection-based fallback association and a DaemonSet node filter using `NODE_NAME`.
- The config collected Kubernetes events with `k8s_events` inside a DaemonSet, which would duplicate cluster-wide event collection unless leader election or a singleton collector is used. Removed `k8s_events` from the DaemonSet example so logs are received through OTLP only.
- The RBAC example included deployments and nodes. For the shown metadata extraction, current OpenTelemetry docs require pods, namespaces, and replicasets. Adjusted the RBAC resources accordingly.
- The DaemonSet did not set a service account even though the RBAC instructions require binding permissions to the Collector service account. Added `serviceAccountName: otel-collector`.
- The Secret key name was `api-key`, but Groundcover's current ingestion guidance distinguishes ingestion keys from general API keys. Updated the example to use `ingestion-key`.

## Review Notes
- The snippets were checked locally for YAML and Python syntax with `python3`.
- The Collector image still uses `latest`, which is syntactically valid but not ideal for production reproducibility. Pinning a tested Collector version would be a good future improvement.
