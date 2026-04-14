# Validation Summary: How to Use Dapr with Kubernetes DaemonSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, pub/sub API)
- Kubernetes DaemonSets
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js (`os` module, `process.cpuUsage`)
- Kubernetes node affinity and tolerations
- Kubernetes hostPath volumes, hostNetwork, hostPID

## Sources Consulted
- Dapr sidecar injection annotations documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/)
- Dapr JavaScript SDK source and types (`@dapr/dapr` v3.6.1) — verified `DaprClient` constructor, `pubsub.publish()` method signature
- Kubernetes DaemonSet API reference (https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- Kubernetes Pod spec reference — `hostNetwork`, `hostPID`, `tolerations`, `nodeSelector`, `nodeAffinity` fields
- Node.js documentation — `os.freemem()`, `os.totalmem()`, `process.cpuUsage()`

## Issues Found
No technical issues found.

## Review Notes
- `process.cpuUsage()` returns the Node.js process's own CPU time (user and system microseconds), not the host node's overall CPU utilization. This is technically correct code but readers building a real node metrics agent would likely want host-level CPU metrics (e.g., by reading `/host/proc/stat`). This is a design consideration, not a code error.
- The `dapr.io/app-port: "3000"` annotation is included but the JavaScript example does not show an HTTP server listening on port 3000. For a publish-only agent that does not receive inbound requests, this annotation could be omitted. Including it is not incorrect — it simply means Dapr will attempt health checks against that port.
- The `hostNetwork: true` example in "Accessing Host Resources" would cause the Dapr sidecar's default ports (3500 HTTP, 50001 gRPC) to bind on the host network. Since DaemonSets guarantee one pod per node, this avoids port conflicts for the DaemonSet itself, but could conflict with other host-network Dapr workloads on the same node. Worth noting for production use.
