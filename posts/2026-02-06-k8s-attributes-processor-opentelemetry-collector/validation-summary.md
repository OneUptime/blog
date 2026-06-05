# Validation Summary: How to Configure the K8s Attributes Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Kubernetes attributes processor
- OpenTelemetry Collector resource detection and batch processors
- Kubernetes RBAC
- Kubernetes Deployments, DaemonSets, Pods, labels, annotations, and Downward API
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes attributes processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector processor ordering guidance: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- OpenTelemetry Collector configuration environment variable documentation: https://opentelemetry.io/docs/collector/configuration/
- Kubernetes Downward API documentation, linked from the processor docs: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/

## Issues Found
- The post described the processor as querying the Kubernetes API for each corresponding pod. Updated this to explain that the processor discovers Kubernetes metadata through API list/watch behavior and matches telemetry against an informer cache.
- The RBAC example omitted permissions needed for several extracted owner/workload metadata fields. Added `deployments`, `statefulsets`, `daemonsets`, and `jobs` permissions.
- Pod association examples used `k8s.pod.name` alone. Updated them to include `k8s.namespace.name`, since pod names are namespace-scoped.
- The environment-variable association text implied SDKs automatically copy arbitrary `POD_NAME` variables to OpenTelemetry resource attributes. Clarified that the application or SDK resource detection must map those values to resource attributes.
- The filter example had duplicate `filter` keys. Combined the example into one valid `filter` block.
- The field extraction example had duplicate `labels` keys and used `key: "*"` for wildcard extraction. Combined the label rules and changed wildcard extraction to `key_regex: (.*)` with `tag_name: $$1`.
- Removed the invalid `owner_lookup_enabled` processor setting. Owner/workload metadata is enabled by listing the relevant metadata fields and granting the needed RBAC.
- The production pipeline placed `batch` before `k8sattributes`, which can break connection-based pod association. Updated the pipeline order to run `k8sattributes` before `batch`.
- The environment variable default syntax used `${VAR:default}`. Updated it to the documented Collector syntax `${env:VAR:-default}` and `${env:VAR}`.
- The caching section referred to a cache TTL that the processor does not expose. Reframed it around `filter.node_from_env_var`, which reduces the informer cache scope.
- Troubleshooting and performance guidance referred to increasing cache TTL and per-pod API queries. Updated those claims to match the processor's cache/list/watch behavior.

## Review Notes
YAML snippets parse successfully and no duplicate YAML keys remain. The examples still use `otel/opentelemetry-collector-contrib:latest`; pinning a Collector version would improve reproducibility in a future editorial pass.
