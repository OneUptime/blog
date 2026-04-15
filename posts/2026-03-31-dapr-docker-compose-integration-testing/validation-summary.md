# Validation Summary: How to Use Docker Compose for Dapr Integration Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, placement service)
- Docker Compose
- Redis (state store, pub/sub)
- GitHub Actions CI
- Bash scripting

## Sources Consulted
- [Dapr Health API reference](https://docs.dapr.io/reference/api/health_api/) — verified `/v1.0/healthz` returns HTTP 204 when healthy
- [Dapr arguments and annotations overview](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified daprd flags use `--` prefix; confirmed `--components-path` is deprecated in favor of `--resources-path`
- [How-To: Run Dapr in self-hosted mode with Docker](https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/) — verified Docker Compose sidecar pattern, placement service configuration, and `--resources-path` usage
- [Redis state store component reference](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/) — verified component YAML format and `redisHost` metadata field
- [Redis Streams pub/sub component reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/) — verified pub/sub component YAML format

## Issues Found

1. **daprd flags used single dash instead of double dash**: All `daprd` command flags (`-app-id`, `-app-port`, `-placement-host-address`, etc.) used a single dash prefix. While Go's flag parser accepts both forms, the official Dapr documentation consistently uses double-dash (`--app-id`, `--app-port`, etc.). Changed all daprd flags to use `--` for consistency with official docs.

2. **`--components-path` is deprecated**: The `daprd` flag `-components-path` has been deprecated in favor of `--resources-path`. Updated to `--resources-path` to match current Dapr documentation and avoid deprecation warnings.

3. **Placement service flags used single dash**: Same single-dash issue as daprd flags. Changed `-port` and `-log-level` to `--port` and `--log-level`.

4. **`set -e` prevented cleanup on test failure**: The test runner script used `set -e` but then relied on capturing `$?` after `docker-compose run test-runner`. With `set -e` active, a non-zero exit from the test runner would cause the script to exit immediately, skipping the `docker-compose down -v` cleanup entirely. Fixed by using a `trap cleanup EXIT` pattern, which ensures cleanup always runs regardless of how the script exits.

## Review Notes
- The `docker-compose` CLI (standalone Python tool) has been superseded by `docker compose` (Docker CLI plugin). Both still work, but new projects may prefer the plugin syntax. Not changed since both are functional.
- The `version: "3.8"` field in the Compose file is ignored by Docker Compose v2 but is harmless to include for backward compatibility.
- Dapr version 1.14.0 is used in the examples. Newer Dapr versions may also require a `--scheduler-host-address` flag and a scheduler service in the Compose file. Users on newer versions should consult the official Docker self-hosted guide.
