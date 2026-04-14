# Validation Summary: How to Fix Dapr Sidecar Not Starting on Kubernetes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- kubectl CLI
- Dapr sidecar (daprd)
- Dapr control plane services (dapr-api/operator, dapr-sentry)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr CLI/daprd arguments reference (for port defaults and annotation support)
- Dapr Helm chart source (for control plane service names and ports)

## Issues Found

1. **Incorrect internal gRPC port (line 70)**: The post stated Dapr uses port 3501 for internal communication. The correct default internal gRPC port is **50002**, as documented in the `dapr.io/internal-grpc-port` annotation and the `--dapr-internal-grpc-port` CLI flag. Changed `3501 (internal)` to `50002 (internal gRPC)`.

2. **Non-existent `dapr.io/http-port` annotation (line 77)**: The post suggested using `dapr.io/http-port: "3600"` to change the Dapr HTTP port. This annotation does not exist in Kubernetes — the `--dapr-http-port` flag is a daprd CLI argument that is explicitly listed as "not supported" for Kubernetes annotations. Replaced with the valid `dapr.io/grpc-port` annotation as an example and added a note that the HTTP port (3500) cannot be changed via annotation, advising users to change their app's port instead.

3. **Incorrect dapr-sentry service port (line 87)**: The post stated the sidecar needs to reach dapr-sentry on port 50001. While 50001 is the container's internal targetPort, the Kubernetes Service for dapr-sentry exposes port **443**. For network policy configuration and connectivity testing, users should reference port 443. Changed the comment to reflect the correct service port.

## Review Notes
- All kubectl commands are syntactically correct and use valid flags.
- The sidecar container name `daprd` is correct.
- The `dapr-api` service name for the operator is correct (the Kubernetes Service is named `dapr-api`, not `dapr-operator`).
- The sidecar resource limit annotations (`dapr.io/sidecar-memory-limit`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-cpu-request`) are all valid.
- The `dapr.io/log-level: "debug"` annotation is correct.
- The `dapr-api` operator service on port 80 is correct (it exists as a legacy/backwards-compatible port alongside the primary port 443).
