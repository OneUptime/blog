# Validation Summary: How to Register a Pluggable Component with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pluggable components)
- Unix Domain Sockets (UDS)
- gRPC / gRPC reflection
- Kubernetes (Deployments, annotations, sidecar injection)
- Dapr CLI (`dapr run`, `dapr components`, `dapr logs`)
- YAML component configuration

## Sources Consulted
- Dapr official docs: How-To: Register a pluggable component — https://docs.dapr.io/operations/components/pluggable-components-registration/
- Dapr CLI reference: `dapr run` — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference: `dapr components` — https://docs.dapr.io/reference/cli/dapr-components/
- Dapr CLI reference: `dapr logs` — https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Fabricated `socketFolder` metadata field (High severity):** The component YAML included `socketFolder` as a metadata entry. This field does not exist in the Dapr API. The socket directory is determined by the default path (`/tmp/dapr-components-sockets`) or configured via CLI flags/pod annotations, not component metadata. Removed the fabricated field.

2. **Deprecated `--components-path` CLI flag (Medium severity):** The `dapr run` command used `--components-path`, which is deprecated. Changed to the current `--resources-path` flag.

3. **Misleading socket filename convention (Medium severity):** The post stated "The socket filename determines the component type name," implying the full type (e.g., `state.my-state-store`) comes from the filename alone. In reality, the socket filename only determines the component name portion. The API prefix (`state.`, `pubsub.`, etc.) is determined by gRPC reflection based on which proto services the component implements. Rewrote the explanation to clarify both parts.

4. **Outdated Kubernetes setup (High severity):** The post showed a manual approach with explicit `emptyDir` volumes, an init container to wait for the socket, and `dapr.io/unix-domain-socket-path` annotation. The recommended approach uses `dapr.io/inject-pluggable-components: "true"` on the pod and `dapr.io/component-container` on the Component resource, letting the Dapr sidecar injector handle volume and container setup automatically. Replaced the entire Kubernetes section with the annotation-based approach.

5. **Invalid `dapr components --app-id` command (High severity):** The `dapr components` command does not accept an `--app-id` flag. It is a Kubernetes-only command requiring the `-k` flag. Changed to `dapr components -k -n default`.

6. **`dapr logs` missing `-k` flag (Medium severity):** The `dapr logs` command is Kubernetes-only and requires the `-k` flag. Added the missing flag.

## Review Notes
- A single pluggable component socket can expose multiple building block APIs (e.g., both state store and pub/sub), requiring separate Component YAML files for each. The post does not mention this but it is not an error — just an advanced use case that could be noted in a future update.
- The pluggable component process must be running and listening on its socket before the Dapr sidecar starts. Dapr does not wait for sockets to appear. The post does not explicitly state this timing requirement.
- For local/self-hosted verification, there is no CLI equivalent of `dapr components` — the post now only shows Kubernetes verification commands. Local verification can be done by checking Dapr sidecar logs at startup.
