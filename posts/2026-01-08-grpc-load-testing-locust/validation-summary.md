# Validation Summary: How to Load Test gRPC Services with Locust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (Python `grpcio`, `grpcio-tools`)
- Locust (load testing framework, 2.x)
- Python 3.11
- Protocol Buffers (`protobuf`)
- gevent
- prometheus-client / Prometheus / Grafana
- Docker / Docker Compose
- GitHub Actions (CI)

## Sources Consulted
- Locust documentation — custom clients, `events.request.fire`, `User`, `wait_time`, `constant_throughput`, `LoadTestShape`, distributed runners: https://docs.locust.io/en/stable/
- Locust CSV stats output format (`*_stats.csv` columns): https://docs.locust.io/en/stable/retrieving-stats.html
- gRPC Python API (`grpc.insecure_channel` / `secure_channel`, channel options, `RpcError`): https://grpc.github.io/grpc/python/grpc.html
- gRPC channel argument keys (keepalive options): https://github.com/grpc/grpc/blob/master/include/grpc/impl/channel_arg_names.h
- Protocol Buffers Python `Message.ByteSize()`: https://protobuf.dev/reference/python/python-generated/
- prometheus-client Python (Counter/Histogram/Gauge, `collect()`, `start_http_server`): https://github.com/prometheus/client_python
- GitHub Actions: actions/checkout@v4, actions/setup-python@v5, actions/upload-artifact@v4

## Issues Found
- **`GRPC_REQUESTS_TOTAL._value.sum()` (metrics reporter)**: This was a real defect. `GRPC_REQUESTS_TOTAL` is a Counter created with label names (`['method', 'status']`), so the parent metric object has no `_value` attribute — `_value` only exists on the per-label child objects, and even there it is a `ValueClass` exposing `.get()`, not `.sum()`. As written the RPS-calculator thread would raise `AttributeError` on the first tick. Replaced it with a summation over the public `collect()` API, filtering samples whose name ends in `_total` (the value sample of a Counter), which correctly aggregates the counter across all label combinations. Behavior of the surrounding RPS logic is unchanged.

## Review Notes
- The generated `*_pb2_grpc.py` files use absolute imports (`import user_pb2`), which is why the test files add `./pb` to `sys.path`. This matches the default `grpc_tools.protoc` output and is correct as written.
- `events.request.fire(...)` uses the unified Locust 2.x event API (a single `request` event with `request_type`/`name`/`response_time`/`response_length`/`exception`/`context`), not the deprecated `request_success`/`request_failure` events. Correct for the pinned `locust>=2.15.0`.
- The threshold checker's CSV column names (`Name`, `Request Count`, `Failure Count`, `Average Response Time`, `50%`, `95%`, `99%`, `Requests/s`) and the `Aggregated` row name match Locust's `--csv` `*_stats.csv` output. Correct.
- `EXPOSE 8089 5557` correctly exposes the Locust web UI (8089) and the default master↔worker communication port (5557).
- The `GrpcUser` base class sets `abstract = True` but does not subclass Locust's `User`; it is also never used by the example tests (which subclass `User` directly). It is harmless but effectively dead code — a candidate for cleanup in a future revision.
- In `docker-compose.yml`, `deploy.replicas: 4` on the `worker` service is honored only by Docker Swarm; with plain `docker-compose up` it is ignored. The Makefile correctly scales via `docker-compose up --scale worker=4`, so the working path is fine, but the `deploy.replicas` field is a no-op for the documented non-swarm workflow.
- `version: '3.8'` in the compose file is obsolete in recent Compose versions (the field is ignored with a warning) but does not cause failures.
- Defining `wait_time` as an instance method (in `RampUpStressTest`) is valid: Locust invokes `self.wait_time()`, so a bound method returning a float works the same as `between(...)`/`constant_throughput(...)`.
