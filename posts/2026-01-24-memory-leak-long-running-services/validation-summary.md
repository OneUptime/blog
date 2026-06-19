# Validation Summary: How to Fix 'Memory Leak' in Long-Running Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- psutil
- psycopg2
- pytest
- tracemalloc
- Node.js
- V8 heap snapshots
- Node.js EventEmitter
- Go goroutines and context cancellation
- Prometheus alerting rules and PromQL
- Kubernetes kubectl

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python functools documentation: https://docs.python.org/3/library/functools.html
- Python tracemalloc documentation: https://docs.python.org/3/library/tracemalloc.html
- psutil documentation: https://psutil.readthedocs.io/stable/
- Psycopg 2 connection pooling documentation: https://www.psycopg.org/docs/pool.html
- Node.js V8 API documentation: https://nodejs.org/api/v8.html
- Node.js EventEmitter documentation: https://nodejs.org/api/events.html
- Node.js heap snapshot diagnostics guide: https://nodejs.org/learn/diagnostics/memory/using-heap-snapshot
- Go context package documentation: https://pkg.go.dev/context
- Go runtime package documentation: https://pkg.go.dev/runtime
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes kubectl set resources documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes kubectl autoscale documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale/
- Kubernetes kubectl cp documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The Python memory growth calculation used `timedelta.seconds`, which omits complete days from a duration. Changed it to `total_seconds()` so the growth rate is correct for any retained monitoring window.
- The psycopg2 example used `psycopg2.connect()` without importing `psycopg2`. Added the missing import.
- The Node.js event listener cleanup only handled `finish` and `error`. Added cleanup on `close` so listeners are removed when the response connection closes before a normal finish.
- The bounded cache `set()` method evicted an entry even when updating an existing key at capacity. Changed it to move existing keys before checking capacity.
- The Go worker pool could block forever sending a result during shutdown if the results channel was full or unconsumed. Changed the result send to also observe context cancellation.
- The safe operation queue's stale cleanup checked `createdAt`, but queued operations did not store that timestamp. Changed queued entries to store both the operation and creation time.
- The Prometheus memory leak alert used `rate()` and `increase()` on `process_resident_memory_bytes`, which is a gauge-style memory value. Changed the expression to use `delta()` for six-hour growth and `deriv()` for recent positive slope.
- The high-memory Prometheus alert compared a fraction but formatted it as a percentage. Changed the expression to multiply by 100 and compare against `85`.
- The automated Python leak test used `time.sleep()` without importing `time`. Added the missing import.
- The Kubernetes heap dump command launched a new Node.js process, so it would not snapshot the running service. Changed it to signal the running Node.js process, with the documented `--heapsnapshot-signal=SIGUSR2` prerequisite, and copy the newest generated heap snapshot.

## Review Notes
Some examples remain intentionally illustrative and depend on application-specific objects such as request clients, database helpers, Go `Job`/`Result` types, and application health endpoints. The reviewed APIs and commands are current, but production usage should adapt labels, container names, pod names, authentication, and paths to the target environment.
