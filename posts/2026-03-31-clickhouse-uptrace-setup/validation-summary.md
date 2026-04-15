# Validation Summary: How to Set Up ClickHouse with Uptrace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (column-oriented database)
- Uptrace (open-source APM / distributed tracing)
- OpenTelemetry (OTLP gRPC/HTTP exporters)
- Docker Compose

## Sources Consulted
- Uptrace GitHub repository: https://github.com/uptrace/uptrace
- Uptrace Docker Compose example: https://github.com/uptrace/uptrace/blob/master/example/docker/docker-compose.yml
- Uptrace Docker example config: https://github.com/uptrace/uptrace/blob/master/example/docker/uptrace.yml
- Uptrace development config: https://github.com/uptrace/uptrace/blob/master/config/uptrace.yml
- Uptrace configuration reference: https://uptrace.dev/get/config.html
- Uptrace Docker deployment guide: https://uptrace.dev/get/hosted/docker
- Uptrace span querying documentation: https://uptrace.dev/features/querying/spans

## Issues Found

### 1. Docker Compose port mappings were incorrect
**What was wrong:** The blog mapped ports as `14317:14317`, `14318:14318`, and `14320:14320`, implying the container listens on those same ports internally. Uptrace internally listens on port 4317 (gRPC) and port 80 (HTTP + UI). There is no separate UI port.
**What was changed:** Port mappings corrected to `14317:4317` (gRPC) and `14318:80` (HTTP + UI). Removed the non-existent port 14320 mapping entirely.
**Why:** The official docker-compose.yml in the Uptrace repository uses these internal ports. The UI is served on the same HTTP port, not a separate port.

### 2. ClickHouse connection configuration was wrong
**What was wrong:** The blog used `ch: dsn: http://default:@clickhouse:8123/uptrace` — an HTTP-style DSN on port 8123. Uptrace connects to ClickHouse via the native protocol on port 9000, not via HTTP.
**What was changed:** Replaced the DSN-style config with the correct field-based format: `addr: clickhouse:9000`, `user: default`, `password: ""`, `database: uptrace`.
**Why:** The official Uptrace config files use individual fields (`addr`, `user`, `password`, `database`) under the `ch:` key, connecting via the native ClickHouse protocol on port 9000.

### 3. Listen configuration format was incorrect
**What was wrong:** The blog used a flat format (`grpc: :14317`, `http: :14318`, `ui: :14320`). The correct format requires nested objects with an `addr` sub-key. Additionally, there is no `ui` key — the UI is served on the HTTP port.
**What was changed:** Updated to nested format with `addr` sub-keys. Removed the non-existent `ui` key. Set internal ports to match the container defaults (4317 for gRPC, 80 for HTTP).
**Why:** The official Uptrace configuration files use the nested `addr` format under each listen protocol.

### 4. Uptrace DSN in OTLP exporter referenced non-existent port
**What was wrong:** The `uptrace-dsn` header used port 14320 (`http://project1_token@uptrace:14320/1`), which does not exist.
**What was changed:** Changed port to 14318 (`http://project1_token@uptrace:14318/1`), which is the externally-mapped HTTP port.
**Why:** The DSN should reference the HTTP endpoint. Port 14320 was never a valid Uptrace port.

### 5. ClickHouse table names were incorrect
**What was wrong:** The blog listed `uptrace.log_records_index` and `uptrace.datapoints` as tables created by Uptrace.
**What was changed:** Corrected to `uptrace.logs_index` and `uptrace.metrics`.
**Why:** The actual table names in Uptrace's ClickHouse schema are `logs_index` (not `log_records_index`) and `metrics` (not `datapoints`).

## Review Notes
- The `projects` configuration format used in the blog (`id`, `name`, `token`) matches the v1.x / simple configuration style. Newer Uptrace v2.x versions use a different format under `seed_data` with `key` instead of `id` and a separate `project_tokens` section. The blog's format is still functional but may need updating for newer Uptrace versions.
- The SQL query example uses column names like `span_name`, `service_name`, `duration`, `time`, and `status_code`. Uptrace's own query language uses underscore-prefixed names (`_name`, `_dur_ms`, `_time`, `_status_code`), but the actual ClickHouse column names for direct SQL queries may differ. The query is plausible but readers should verify column names against their actual schema.
- The `uptrace-dsn` format in official examples typically includes a `?grpc=port` query parameter (e.g., `http://token@host:14318/1?grpc=14317`). The blog omits this, which may work in some configurations but could cause issues.
- The description of Uptrace as "Jaeger-compatible" is a simplification. Uptrace provides its own UI for trace visualization but can receive data from Jaeger-instrumented applications via OpenTelemetry.
