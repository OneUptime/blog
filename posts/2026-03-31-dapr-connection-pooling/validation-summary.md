# Validation Summary: How to Configure Dapr Connection Pooling

## Status
validated

## Post Type
Configuration Guide / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Redis state store component (state.redis)
- Apache Kafka pub/sub component (pubsub.kafka)
- PostgreSQL output binding (bindings.postgresql)
- Prometheus metrics
- gRPC (grpc-go library)
- Go programming language

## Sources Consulted
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kafka pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr PostgreSQL binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/
- Dapr observability/metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr Helm chart documentation
- grpc-go API documentation (grpc.Dial deprecation notice)
- pgxpool connection string parameter documentation
- Dapr components-contrib source code (common/component/redis/settings.go)

## Issues Found

1. **Kafka `fetchMin` field name was wrong**: Changed `fetchMin` to `consumerFetchMin`. The Dapr Kafka component uses the `consumer` prefix for consumer-specific fetch settings.

2. **Kafka `fetchMax` field does not exist**: Replaced `fetchMax` (value `"10485760"` / 10MB) with `consumerFetchDefault` (value `"1048576"` / 1MB). There is no max fetch field in the Dapr Kafka component spec. The closest real field is `consumerFetchDefault`, which controls the default number of bytes fetched per request (default 1MB).

3. **Prometheus metric names were incorrect**: Changed `dapr_component_state_get_total` to `dapr_component_state_count{operation="get",status="success"}` and `dapr_component_state_get_latencies_ms_bucket` to `dapr_component_state_latencies_bucket`. Dapr does not embed the operation name or `_ms` suffix in the metric name; instead it uses labels for operation type.

4. **gRPC Helm config was misleading/incorrect**: Removed the Helm values snippet that claimed `--max-api-level=10` under `dapr_operator.extraArgs` configures gRPC connection concurrency. The `--max-api-level` flag is actually for controlling Actor API stability levels on the Placement service and has nothing to do with connection pooling. The `extraArgs` key is also not a documented Helm chart option.

5. **`grpc.Dial()` is deprecated**: Replaced `grpc.Dial()` with `grpc.NewClient()` in the Go gRPC code example. `grpc.Dial` has been deprecated in grpc-go in favor of `grpc.NewClient`.

## Review Notes
- The Redis state store connection pool values use raw millisecond integers (e.g., `"300000"` for 5 minutes). While technically correct (Dapr's Duration type accepts plain integers as milliseconds), the official documentation uses Go duration strings (e.g., `"5m"`, `"1h"`). The current format works but is less readable than duration strings.
- The PostgreSQL binding section correctly embeds pgxpool parameters in the connection string. This is a valid approach, and the parameter names (`pool_max_conns`, `pool_min_conns`, `pool_max_conn_lifetime`, `pool_max_conn_idle_time`) are correct pgxpool parameters.
- The pool sizing formula and arithmetic (500 * 0.020 + 5 = 15) are correct.
- The Dapr gRPC port 50001 is confirmed as the correct default.
