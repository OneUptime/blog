# Validation Summary: How to Configure Dapr for Cross-Namespace Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Namespaces, RBAC, NetworkPolicy)
- Python Dapr SDK
- Dapr Service Invocation API
- Dapr Pub/Sub Component Scoping
- Kubernetes Name Resolution

## Sources Consulted
- Dapr docs: Service invocation across namespaces — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-namespaces/
- Dapr docs: Service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr docs: Kubernetes DNS name resolution component — https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr docs: Component schema reference — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr docs: Scope components to applications — https://docs.dapr.io/operations/components/component-scopes/
- Dapr docs: Annotations and arguments overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr docs: Configuration schema — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Python SDK source — https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr CLI reference (dapr run) — https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Component `scopes` field incorrectly nested under `spec` (Critical)
**What was wrong:** The `scopes` field in the Dapr Component YAML was indented under `spec`, but `scopes` is a root-level field in the Component schema (at the same level as `spec` and `metadata`).
**What was changed:** Moved `scopes` and its list items out from under `spec` to the root level of the Component resource.
**Why:** With `scopes` nested under `spec`, Dapr would ignore the scoping configuration entirely, making the component available to all apps rather than restricting it to the listed app IDs.

### 2. NetworkPolicy used annotation as label selector (Critical)
**What was wrong:** The NetworkPolicy used `dapr.io/enabled: "true"` in both `podSelector.matchLabels` and `namespaceSelector.matchLabels`. However, `dapr.io/enabled` is a Dapr pod **annotation**, not a label. Kubernetes NetworkPolicy selectors can only match on labels, so this policy would not select any pods or namespaces correctly.
**What was changed:** Changed `podSelector` to `{}` (select all pods in the namespace) and changed `namespaceSelector` to use a custom label `dapr-enabled: "true"`. Added instructions before the YAML to label source namespaces with `kubectl label namespace <name> dapr-enabled=true`.
**Why:** The original configuration would silently fail to match any pods, leaving the NetworkPolicy ineffective.

### 3. Name resolution template hardcoded port 50001 (Minor)
**What was wrong:** The Dapr Configuration `nameResolution` template hardcoded port `50001` instead of using the `{{.Port}}` template variable.
**What was changed:** Replaced `50001` with `{{.Port}}` in the template string.
**Why:** Hardcoding the port bypasses Dapr's dynamic port resolution. If a sidecar is configured with a non-default gRPC port, cross-namespace resolution would break. The `{{.Port}}` variable ensures the resolved address uses the correct port from the target sidecar's configuration.

## Review Notes
- The RBAC section is technically valid YAML and not incorrect, but may be redundant in standard Helm-based Dapr installations since the `dapr-operator` service account already receives cluster-wide RBAC via the `dapr-operator-admin` ClusterRole. The section could be useful for custom or minimal installations.
- The Python SDK code example is correct and uses current API names (`invoke_method`, `app_id`, `method_name`, `http_verb`, `response.data`).
- The namespace-qualified app ID format `{appId}.{namespace}` and the HTTP API URL format are both correct per official docs.
- Port 50002 (Dapr internal gRPC port) is not mentioned in the NetworkPolicy. For most cross-namespace service invocation scenarios, ports 3500 and 50001 are sufficient, but environments with strict network policies may also need to allow port 50002.
