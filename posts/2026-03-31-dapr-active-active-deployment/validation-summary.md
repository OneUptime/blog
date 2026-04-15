# Validation Summary: How to Implement Active-Active Dapr Deployments

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (runtime, state management, pub/sub)
- Redis / Redis Enterprise (CRDT active-active replication)
- Apache Kafka (pub/sub messaging)
- Go (Dapr Go SDK)
- Python (Dapr Python SDK)
- AWS Route53 (latency-based DNS routing)
- Kubernetes (kubectl)

## Sources Consulted
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kafka pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Go SDK client interface: https://github.com/dapr/go-sdk
- Dapr Python SDK DaprClient: https://github.com/dapr/python-sdk
- Go language specification (constant declarations): https://go.dev/ref/spec#Constant_declarations
- AWS Route53 CLI reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Redis CLI reference: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

1. **Go code: `const` used with runtime function call (line 69)**
   - **What was wrong:** `const REGION = os.Getenv("CLUSTER_REGION")` is invalid Go. The `const` keyword requires compile-time constant expressions, but `os.Getenv()` is a runtime function call.
   - **What was changed:** Changed `const` to `var`.
   - **Why:** Go will not compile this code. `var` correctly declares a package-level variable initialized at program startup.

2. **Dapr Redis component YAML: invalid `concurrency` metadata field (line 54)**
   - **What was wrong:** The component spec included `concurrency: "last-write"` as a metadata field. This is not a valid metadata field for the Dapr Redis state store component. Concurrency strategy (first-write-wins or last-write-wins) is specified per-request via the Dapr state API, not in component configuration.
   - **What was changed:** Removed the `concurrency` metadata entry.
   - **Why:** Including an unrecognized metadata field could cause confusion. Readers might expect this to configure concurrency behavior at the component level, when it is actually a per-operation setting.

3. **Python code: unused `hashlib` import (line 108)**
   - **What was wrong:** `import hashlib` was included but never used in the code example.
   - **What was changed:** Removed the unused import.
   - **Why:** Unused imports are misleading and suggest hashlib-based deduplication that doesn't exist in the example.

4. **Monitoring script: invalid `curl`/`redis-cli` combination (lines 168-170)**
   - **What was wrong:** The script used `curl -s "http://us-east-redis:6379" -- redis-cli DBSIZE` which conflates two unrelated tools. `curl` is an HTTP client and cannot communicate with Redis's native protocol on port 6379. The `-- redis-cli DBSIZE` portion was passed as extra curl arguments, not as a separate command.
   - **What was changed:** Replaced with `redis-cli -h us-east-redis DBSIZE` which uses the Redis CLI directly with the `-h` flag to specify the remote host.
   - **Why:** The original command would fail. `redis-cli` is the correct tool for issuing Redis commands from the shell.

## Review Notes
- The Python idempotency example has a race condition: between the `get_state` check and the `save_state` write, another instance could process the same event. This is inherent to the pattern without distributed locking, and the post's approach is pragmatic for most use cases, but readers building exactly-once systems should be aware of this limitation.
- The monitoring script's `DBSIZE` comparison is a rough heuristic for replication health. In practice, CRDT-replicated databases may have transient count differences due to replication lag, and DBSIZE counts all keys (not just application state). This is acceptable as an illustrative example but should not be the sole production monitoring approach.
- The Dapr component YAMLs use `apiVersion: dapr.io/v1alpha1` which is current as of Dapr 1.x. If Dapr graduates to a v1 API, these will need updating.
