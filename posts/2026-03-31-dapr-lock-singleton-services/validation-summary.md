# Validation Summary: How to Use Dapr Distributed Lock for Singleton Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — Distributed Lock building block
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Go (Golang)
- Kubernetes (Deployments, pod environment variables)

## Sources Consulted
- Dapr Distributed Lock API reference — https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr How-To: Use a lock — https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/howto-use-distributed-lock/
- Dapr Go SDK client documentation — https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Kubernetes Deployment API reference (apps/v1) — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found
1. **Kubernetes Deployment YAML missing required `spec.selector` field**: The `apps/v1` Deployment kind requires `spec.selector` to be explicitly set. Without it, the Kubernetes API server rejects the manifest with a validation error. Added `spec.selector.matchLabels` with `app: data-sync`.
2. **Kubernetes Deployment YAML missing pod template `metadata.labels`**: The pod template needs `metadata.labels` matching the selector so the Deployment controller can identify and manage its pods. Added `labels.app: data-sync` to the pod template metadata.

## Review Notes
- The Dapr distributed lock API (`TryLockAlpha1`/`UnlockAlpha1`) is still in Alpha1 status. If Dapr graduates this API to stable in a future release, the method names will change to `TryLock`/`Unlock` and this post will need updating.
- The lock renewal pattern (heartbeat at 15s with a 20s lock expiry) relies on the lock store supporting re-acquisition by the same owner to extend the TTL. This works with the Redis lock store component (the most common backing store), but the post does not mention this store-specific behavior.
- The `workCancel` package-level variable and `isLeader` struct field are accessed from multiple goroutines without synchronization, which constitutes a data race. Acceptable for illustrating the pattern but not production-ready.
- Error from `dapr.NewClient()` is silently discarded in `main()`. Acceptable for a tutorial but worth noting.
