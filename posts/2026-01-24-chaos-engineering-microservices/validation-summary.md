# Validation Summary: How to Handle Chaos Engineering in Microservices

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Chaos engineering
- Microservices resilience testing
- Python
- FastAPI and Starlette middleware
- Redis / redis-py
- OpenTelemetry Python tracing
- Prometheus and PromQL
- prometheus-client Python metrics
- Linux stress-ng
- Linux tc / netem / tbf
- iptables
- CI/CD chaos test orchestration

## Sources Consulted
- Principles of Chaos Engineering: https://principlesofchaos.org/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- FastAPI advanced middleware documentation: https://fastapi.tiangolo.com/advanced/middleware/
- Starlette BaseHTTPMiddleware documentation: https://www.starlette.io/middleware/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Python contextlib documentation: https://docs.python.org/3/library/contextlib.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client documentation: https://prometheus.github.io/client_python/
- stress-ng manual page: https://manpages.ubuntu.com/manpages/focal/man1/stress-ng.1.html
- Linux tc-netem manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux tc-tbf manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- iptables command help from local system: `iptables v1.8.10`

## Issues Found
- The core `ChaosEngine` could start handler objects shown later in the post, but `_stop_chaos()` was a no-op, so latency/error injections would not be cleared even though the text says the engine stops chaos injection. I updated handler registration and stopping so callable handlers, handler objects with `inject()`, explicit stop handlers, and handler objects with `stop()` are supported.
- `ResourceChaos.inject()` referenced `_stress_disk()` but the method was missing. I added a disk I/O stress method using `stress-ng --hdd`, `--hdd-bytes`, and `--timeout`.
- The network partition catalog passed `target_b`, but `NetworkChaos.inject()` ignored it and partitioned only `target_service`. I updated the partition branch to use `target_b` when provided.
- The FastAPI middleware snippet used undefined `redis_client`, `service_name`, and `verify_chaos_authorization` names. I added minimal definitions so the example is internally consistent.
- The Redis example decoded `redis.get()` directly with `json.loads(config)`. redis-py returns bytes by default, so I configured the client with `decode_responses=True`.
- The circuit breaker recovery test used `asyncio.sleep()` without importing `asyncio`. I added the missing import.
- The PromQL p99 latency query used `histogram_quantile()` over raw bucket rates. Prometheus recommends aggregating classic histogram buckets with `sum by (le)` before calculating a quantile, so I corrected the query.
- The PostgreSQL connection pool query divided vectors with mismatched labels. I changed it to aggregate active connections and max connections before division.
- The CI entrypoint could reference `results` before assignment for an unknown `CHAOS_TEST_LEVEL`. I added an explicit `ValueError`.
- `ChaosObserver.observe_experiment()` used `yield` inside `async def`, which creates an async generator rather than a usable async context manager. I added `@asynccontextmanager` from `contextlib`.

## Review Notes
The post is technically relevant and useful as a conceptual implementation guide. Several snippets still intentionally depend on application-specific components such as `metrics_client`, `alerting_client`, service registry fault APIs, Kubernetes pod termination, and concrete Prometheus metric names. Those are acceptable as integration placeholders, but a production implementation should replace them with the platform's actual clients, authentication, safety controls, and cleanup logic.
