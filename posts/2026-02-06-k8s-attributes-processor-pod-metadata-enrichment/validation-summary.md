# Validation Summary: How to Use the K8s Attributes Processor for Pod Metadata Enrichment

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Kubernetes Attributes Processor
- Kubernetes metadata enrichment
- Kubernetes RBAC
- Kubernetes DaemonSet and gateway collector deployment patterns
- OpenTelemetry resource attributes and semantic conventions

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Kubernetes semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/k8s/
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/

## Issues Found
- The post stated that ReplicaSet RBAC permissions are required to resolve deployment names. Current k8sattributesprocessor documentation says `k8s.deployment.name` is derived from the ReplicaSet name by default, and ReplicaSet permissions are only required for cases such as `k8s.deployment.uid`, deployment label or annotation extraction, or `deployment_name_from_replicaset: false`. Updated the RBAC example and explanatory text.
- The filtering example contained duplicate `filter` keys in the same YAML mapping. This is invalid or ambiguous YAML and would commonly cause the namespace filter to be overwritten. Split the namespace/label filter and node filter into separate examples.
- The filtering section claimed the example filtered by labels, but the snippet did not include label filters. Added a valid `filter.labels` example using the documented `key`, `value`, and `op` fields.
- Pod association examples matched on `k8s.pod.ip` and `k8s.pod.uid` without consistently including those fields in `extract.metadata`. Added the relevant metadata entries where resource-attribute association depends on them.
- The gateway-mode explanation implied that the `resource` processor can discover pod IPs. Clarified that the agent-side `k8sattributes` processor should add pod IP, while the `resource` processor can normalize identity attributes that already exist.
- The troubleshooting section repeated the outdated ReplicaSet-permission requirement for deployment names. Updated it to distinguish default deployment-name extraction from the cases that need ReplicaSet access.

## Review Notes
All YAML snippets were parsed successfully after the edits. The post remains version-neutral; the validation was performed against the current upstream OpenTelemetry Collector Contrib documentation available on 2026-06-05.
