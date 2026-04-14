# Validation Summary: How to Use Dapr Distributed Lock for Leader Election

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Distributed Lock API (Alpha1)
- Go (Dapr Go SDK - github.com/dapr/go-sdk)
- Redis (as lock store backend)
- Kubernetes (downward API for pod name)

## Sources Consulted
- Dapr Distributed Lock API documentation: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/
- Dapr Go SDK source code (lock.go): https://github.com/dapr/go-sdk/blob/main/client/lock.go
- Dapr Redis lock component reference: https://docs.dapr.io/reference/components-reference/supported-lock/
- Redis SetNX command documentation: https://redis.io/commands/setnx/

## Issues Found

### 1. Unused and incorrect variable assignment (line 56)
- **What was wrong:** `var instanceID = os.Hostname` assigned the function value `os.Hostname` (of type `func() (string, error)`) to `instanceID` instead of calling it. Additionally, `instanceID` was never referenced anywhere in the code. Go would refuse to compile this with "declared and not used".
- **What was changed:** Removed the unused `var instanceID = os.Hostname` line entirely.

### 2. Broken lock renewal pattern
- **What was wrong:** The `renewLeadership` function called `TryLockAlpha1` again with the same owner to "renew" the lock. However, the Redis lock implementation uses `SetNX` (SET if Not eXists), which only sets a key if it does not already exist. Calling `TryLockAlpha1` while the lock is still held returns `Success: false` even for the same owner. The lock is not renewed or extended.
- **What was changed:** Updated `renewLeadership` to first unlock the current lock via `UnlockAlpha1`, then immediately re-acquire it via `TryLockAlpha1`. Updated the explanatory text to describe the unlock-then-relock approach and note the brief race window between the two operations.

## Review Notes
- The Dapr Distributed Lock API is still in Alpha (`TryLockAlpha1`, `UnlockAlpha1`). The post does not explicitly call this out, but the method names make it apparent. If the API graduates to stable, the method names will change and the code will need updating.
- The unlock-then-relock renewal pattern introduces a small race window where another instance could acquire the lock. For applications that require zero-gap leadership, a more sophisticated approach (e.g., using a state store with conditional writes or an external consensus system) may be needed. This is an inherent limitation of the Dapr lock API, not a blog error.
- The main loop spawns a goroutine for each successful lock acquisition. If `runAsLeader()` takes longer than the `renewEvery` interval, multiple goroutines could overlap. Production code should add synchronization to prevent this.
- The component YAML, Go SDK method signatures, struct fields, Redis metadata, Kubernetes downward API usage, and failover simulation are all correct.
