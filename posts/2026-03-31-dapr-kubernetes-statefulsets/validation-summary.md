# Validation Summary: How to Use Dapr with Kubernetes StatefulSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, actor framework, placement service)
- Kubernetes StatefulSets
- Kubernetes Headless Services
- Persistent Volume Claims (PVC)
- Node.js / JavaScript (actor code example)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr actor overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Headless Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Dapr sidecar port defaults (HTTP: 3500, gRPC: 50001, internal gRPC: 50002, metrics: 9090)

## Issues Found
- **Incorrect Dapr internal port in headless service**: The headless service defined port `3501` with name `dapr-internal`. The Dapr sidecar's internal gRPC port (used for sidecar-to-sidecar communication) defaults to **50002**, not 3501. Port 3501 is not a standard Dapr sidecar listening port. Since no `targetPort` was specified, the service port must match the actual container port. Fixed `3501` to `50002`.

## Review Notes
- The JavaScript example demonstrates manual actor partitioning based on pod ordinal. In practice, Dapr's placement service handles actor placement automatically — the manual partitioning shown is a custom optimization pattern, not a standard Dapr actor usage. This is not incorrect but could be clarified in a future revision.
- The `rollingUpdate.partition: 0` in the update strategy section is the default value (all pods get updated). Including it is fine for explicitness but could note that non-zero values enable canary-style updates.
- All Kubernetes YAML manifests (StatefulSet, Service, update strategy) use correct apiVersions, field names, and structure.
- The `kubectl` commands in the scaling section are all valid.
- The DNS entry format `actor-service-0.actor-service.default.svc.cluster.local` is correct for StatefulSet pods with headless services.
