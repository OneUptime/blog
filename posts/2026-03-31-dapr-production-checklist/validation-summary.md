# Validation Summary: How to Create a Dapr Production Checklist

## Status
validated

## Post Type
Guide / Checklist

## Technologies Covered
- Dapr (runtime, sidecar, control plane)
- Kubernetes (kubectl, Helm, StatefulSets, annotations)
- Dapr CLI
- Dapr mTLS and access control configuration
- Dapr Resiliency policies
- Dapr Workflow and Actors
- Prometheus metrics
- Redis (state store)

## Sources Consulted
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr Configuration spec — mTLS settings (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr access control / service invocation allow-list (https://docs.dapr.io/operations/configuration/invoke-allowlist/)
- Dapr Resiliency CRD reference (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr CLI reference — `dapr list`, `dapr logs` (https://docs.dapr.io/reference/cli/)
- Dapr production guidelines — placement service HA (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/)
- Dapr metrics configuration (https://docs.dapr.io/operations/observability/metrics/metrics-overview/)
- Dapr workflow architecture — supported state stores (https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-architecture/)

## Issues Found

### 1. Incorrect field name `namespaceId` in access control policy (Section 2)
- **What was wrong:** The access control policy YAML used `namespaceId: "production"` as the field name for specifying the namespace in a policy entry.
- **What was changed:** Corrected to `namespace: "production"`.
- **Why:** The official Dapr access control documentation uses `namespace` (not `namespaceId`) as the field name in policy definitions. The SPIFFE ID format extracts the namespace value to match against the `namespace` field.

### 2. Workflow state store overly specific to Redis (Section 7)
- **What was wrong:** The checklist item stated "Workflow state store is Redis (not in-memory)", implying Redis is the only valid option.
- **What was changed:** Reworded to "Workflow state store uses a durable, actor-compatible store (e.g., Redis, PostgreSQL — not in-memory)".
- **Why:** Dapr workflows support any actor-compatible state store with transaction support (Redis, PostgreSQL, MySQL, SQL Server, MongoDB, etc.), not just Redis. The key requirement is `actorStateStore: "true"` in the component metadata.

### 3. Replaced non-functional `kubectl exec` command (Section 8)
- **What was wrong:** The command `kubectl exec -it <pod> -c daprd -- /daprd help` would fail on default Dapr installations because the sidecar uses a distroless base image with no shell.
- **What was changed:** Replaced with `kubectl logs <pod> -c daprd` which reliably retrieves sidecar logs directly.
- **Why:** The default Dapr sidecar image (`daprd`) is built on a distroless base, which does not include a shell. Interactive exec into the container is not possible without using `kubectl debug` with an ephemeral container, which adds complexity not suitable for a quick-reference checklist.

## Review Notes
- The mTLS configuration correctly shows `workloadCertTTL: "24h"` which matches the Dapr default.
- The sidecar resource annotation names (`dapr.io/sidecar-cpu-request`, etc.) are all correct per the official reference.
- The placement service StatefulSet name `dapr-placement-server` is correct.
- The default Dapr metrics port 9090 is correct.
- The recommendation of `replicaCount >= 3` for the actor placement service aligns with official Dapr production guidelines.
- The `kubectl get resiliency` command works since Kubernetes accepts the singular form of the CRD kind.
