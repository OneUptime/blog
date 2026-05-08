# Validation Summary: How to Secure Filters in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble and Hubble Relay
- Hubble exporter filters and field masks
- Hubble CLI
- Kubernetes RBAC and audit policy
- Helm

## Sources Consulted
- Cilium Hubble exporter configuration: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Layer 7 protocol visibility and redaction: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble overview: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium flow API reference: https://docs.cilium.io/en/stable/_api/v1/flow/README.html
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes audit policy documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Helm history command reference: https://helm.sh/docs/helm/helm_history/

## Issues Found
- The exporter field mask used `destination.port`, which is not a field in the Hubble flow proto. Changed it to `l4`, matching Cilium's documented field mask examples for retaining port/protocol data.
- The field mask used deprecated `drop_reason`. Changed it to `drop_reason_desc`, which Cilium documents as the replacement.
- The L7 redaction Helm values used non-existent flat keys (`httpURLQuery`, `httpUserInfo`, `kafkaApiKey`). Changed them to the documented nested keys under `hubble.redact.http`. Removed the Kafka key because Cilium marks `hubble.redact.kafka.apiKey` as deprecated.
- The metrics comment claimed the configuration enabled L7 metrics only for non-sensitive namespaces. Hubble metrics configuration does not filter metrics by namespace in that way, so the wording was corrected to describe namespace-level label granularity.
- The CLI/RBAC section implied namespace isolation through Hubble CLI tooling and Kubernetes RBAC. Updated the wording to clarify that Kubernetes RBAC does not natively authorize Hubble Relay results by namespace, and that wrappers are only suitable in trusted environments where direct Hubble API access is separately controlled.

## Review Notes
The exporter allowList/denyList syntax, Helm upgrade pattern, namespace-prefix pod filters such as `vault/`, Hubble redaction concept, static exporter restart requirement, Hubble metrics `httpV2` usage, and Kubernetes audit policy structure were consistent with current Cilium and Kubernetes documentation. Future hardening could add explicit Hubble Relay TLS/mTLS configuration, but that would be an expansion rather than a correction.
