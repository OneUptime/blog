# Validation Summary: How to Deploy Pluggable Components on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pluggable components)
- Kubernetes (Deployments, Pods, Volumes, RBAC)
- Unix domain sockets
- gRPC (implicit, used by pluggable component protocol)

## Sources Consulted
- Dapr official documentation on pluggable components: https://docs.dapr.io/operations/components/pluggable-components/
- Dapr sidecar injector source code (`pkg/injector/consts/consts.go`) for canonical volume names, env vars, and annotation names
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Kubernetes documentation on init containers, sidecar containers, and emptyDir volumes

## Issues Found

### 1. Wrong annotation name (Critical)
- **What was wrong:** The post used `dapr.io/unix-domain-socket-path` which controls app-to-Dapr-sidecar communication via Unix domain sockets, not pluggable component sockets.
- **What was changed:** Replaced with `dapr.io/pluggable-components-sockets-folder` which is the correct annotation for configuring the pluggable component socket directory.

### 2. Wrong environment variable name (Critical)
- **What was wrong:** The post used `DAPR_COMPONENT_SOCKET_FOLDER` (singular "SOCKET").
- **What was changed:** Corrected to `DAPR_COMPONENT_SOCKETS_FOLDER` (plural "SOCKETS"), matching the constant defined in the Dapr injector source code.

### 3. Init container would deadlock (Critical)
- **What was wrong:** The post included an init container that waited for the pluggable component's socket file to exist. Init containers in Kubernetes run before ALL regular containers start, so the pluggable component container (which creates the socket) would never be running when the init container checks for it. This would cause the pod to hang indefinitely.
- **What was changed:** Removed the init container entirely. Dapr handles component startup ordering through its sidecar injector and, with Kubernetes 1.29+, via native sidecar containers (`dapr.io/enable-native-sidecar` annotation).

### 4. Wrong default socket path (Minor)
- **What was wrong:** The post used `/tmp/dapr-components` as the socket directory path throughout.
- **What was changed:** Corrected to `/tmp/dapr-components-sockets` which matches the Dapr default (`ComponentsUDSDefaultFolder` in source).

### 5. Inconsistent volume name
- **What was wrong:** The post used `dapr-unix-socket` as the volume name, which doesn't match Dapr conventions.
- **What was changed:** Updated to `dapr-components-unix-domain-socket` to match the Dapr injector's canonical volume name (`ComponentsUDSVolumeName`).

## Review Notes
- The post takes a manual approach to deploying the pluggable component container (defining it directly in the Deployment spec). Dapr 1.11+ supports automatic injection via the `dapr.io/component-container` annotation on the Component manifest, which is the recommended approach. The manual approach shown is still valid for users who need more control.
- The RBAC section defines a ServiceAccount but does not assign it to the pod via `spec.serviceAccountName`. This is technically incomplete but is a common pattern in illustrative snippets.
- The health checks use `test -S` to verify socket existence, which is a basic but reasonable approach. A more robust check would use a gRPC health check against the socket.
- The Dapr State API usage (`POST /v1.0/state/<storename>` with JSON array body) is correct.
