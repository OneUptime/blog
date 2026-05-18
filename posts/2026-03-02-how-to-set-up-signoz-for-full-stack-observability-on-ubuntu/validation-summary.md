# Validation Summary: How to Set Up SigNoz for Full-Stack Observability on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- SigNoz (open-source observability platform)
- OpenTelemetry (collector, Node.js SDK, Python SDK)
- ClickHouse (columnar storage backend)
- Docker / Docker Compose
- Ubuntu (20.04 / 22.04)
- UFW (firewall configuration)
- Node.js (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-grpc`)
- Python (`opentelemetry-distro`, `opentelemetry-exporter-otlp`, `opentelemetry-instrument`)

## Sources Consulted
- SigNoz Docker install docs: https://signoz.io/docs/install/docker/
- SigNoz Python instrumentation docs: https://signoz.io/docs/instrumentation/python/
- SigNoz Node.js instrumentation docs: https://signoz.io/docs/instrumentation/nodejs/
- SigNoz retention configuration docs: https://signoz.io/docs/userguide/retention-period/
- SigNoz GitHub repository (paths verified): https://github.com/SigNoz/signoz
  - `deploy/install.sh` (confirmed)
  - `deploy/docker/docker-compose.yaml` (confirmed)
  - `deploy/docker/otel-collector-config.yaml` (confirmed)
- OpenTelemetry JS exporters docs: https://opentelemetry.io/docs/languages/js/exporters/

## Issues Found

1. **UI port was outdated (3301 → 8080)**. The SigNoz UI used to be served on `:3301`, but current SigNoz Docker installs expose the UI on `:8080`. Updated both the access URL and the corresponding `ufw allow` rule.

2. **OTLP gRPC URL used invalid `grpc://` scheme**. The Node.js example used `url: 'grpc://your-signoz-host:4317'`. `@opentelemetry/exporter-trace-otlp-grpc` expects `http://host:port` (gRPC runs over HTTP/2), and `grpc://` is not a recognised scheme. Updated to `http://your-signoz-host:4317`.

3. **Python OTLP example pointed HTTP port `:4318` without the required protocol override**. The Python OTLP exporter defaults to gRPC. Setting `OTEL_EXPORTER_OTLP_ENDPOINT=http://...:4318` without `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` would attempt gRPC against an HTTP endpoint and fail. Switched the example to the gRPC port `:4317` (which works with the default protocol) and added a comment noting how to opt into HTTP/protobuf instead.

4. **Compose file path was wrong (`deploy/docker-compose.yaml` does not exist)**. The actual location is `deploy/docker/docker-compose.yaml`. Updated all references — `cat`, `docker compose -f ... ps`, `docker compose -f ... restart`, `docker compose -f ... pull`, `docker compose -f ... up -d` — to use `docker/docker-compose.yaml`.

5. **OpenTelemetry Collector config path was outdated**. The post referenced `deploy/docker/clickhouse-setup/otel-collector-config.yaml`, but in the current repository the file is at `deploy/docker/otel-collector-config.yaml`. Updated.

6. **Retention section recommended a non-existent `STORAGE` env var, and the stated default was wrong**. SigNoz does not expose a `STORAGE` env var for `install.sh`; retention is configured through the SigNoz UI under **Settings > General**. Defaults are 15 days (logs & traces) and 30 days (metrics), not 3 days. Rewrote the section to point users at the Settings UI and kept the ClickHouse TTL inspection command, which is still valid.

## Review Notes

- The Node.js example uses the `serviceName` top-level option on `NodeSDK`, which is valid in current versions of `@opentelemetry/sdk-node`. (Older guides often set it via `Resource`/`SemanticResourceAttributes.SERVICE_NAME` instead — both work.)
- `clickhouselogsexporter` is correct for SigNoz's bundled OTel Collector distribution and was left as-is.
- ClickHouse Docker image UID `101` (used in the `chown` example) is correct.
- The `git clone -b main` works because `main` is SigNoz's default branch; `-b main` is redundant but not wrong.
- The collector container name `signoz-otel-collector` and ClickHouse container name `signoz-clickhouse` match the current compose setup.
- The post does not pin a specific SigNoz version; readers running significantly older versions may still see the legacy `:3301` UI port and `clickhouse-setup/` config path. A future revision could call this out explicitly.
