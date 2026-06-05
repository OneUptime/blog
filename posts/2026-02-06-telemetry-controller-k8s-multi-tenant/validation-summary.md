# Validation Summary: How to Use the Telemetry Controller for Kubernetes Multi-Tenant Observability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinition
- Kubernetes custom resources and status subresources
- Kubernetes Python client
- Kopf Python operator framework
- OpenTelemetry Collector
- OpenTelemetry Protocol receiver and OTLP/HTTP exporter
- OpenTelemetry Collector processors

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes custom resources and status subresource documentation: https://kubernetes.io/docs/concepts/api-extension/custom-resources/
- Kubernetes CRD task documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kopf handlers documentation: https://kopf.readthedocs.io/en/stable/handlers/
- Kopf results delivery documentation: https://kopf.readthedocs.io/en/stable/results.html
- Kopf patching documentation: https://docs.kopf.dev/en/stable/patches/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The controller returned a dictionary from the Kopf handler as if it would directly set `status.state`, `status.collectorReady`, and `status.lastReconciled`. Kopf stores returned handler results under the handler id, so the post now uses `patch.status[...]` for direct status updates.
- The code referenced `kopf.datetime.datetime.utcnow()`, which is not a valid Kopf API. The post now imports `datetime` and `timezone` from Python's standard library and uses `datetime.now(timezone.utc).isoformat()`.
- The CRD and tenant examples included `rateLimit` and `retentionDays` fields that the controller never consumed and that were not represented in the generated Collector config. Those fields were removed so the declared custom resource matches the implemented behavior.
- The delete handler cleaned up resources in the custom resource metadata namespace, while create/update deployed resources in `spec.namespace`. The cleanup code now uses `spec.get("namespace", namespace)` so deletion targets the same namespace used for deployment.

## Review Notes
The example is still intentionally minimal. A production controller would usually add RBAC manifests, owner references, validation constraints for names and sampling ranges, Services or other traffic routing to reach the DaemonSet, readiness checks instead of unconditional `collectorReady: true`, and more explicit backend authentication/TLS handling.
