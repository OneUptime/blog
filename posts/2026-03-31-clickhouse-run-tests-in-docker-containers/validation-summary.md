# Validation Summary: How to Run ClickHouse Tests in Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (clickhouse/clickhouse-server:24.3 Docker image)
- Docker Compose (v3.8 format)
- Testcontainers for Python (testcontainers-python)
- Testcontainers for Go (testcontainers-go v0.32+)
- clickhouse-connect Python client
- pytest
- GitHub Actions (service containers)

## Sources Consulted
- testcontainers-python ClickHouseContainer docs: https://testcontainers-python.readthedocs.io/en/latest/modules/clickhouse/README.html
- testcontainers-go ClickHouse module docs: https://golang.testcontainers.org/modules/clickhouse/
- ClickHouse Connect (Python driver) GitHub: https://github.com/ClickHouse/clickhouse-connect
- ClickHouse Docker image README: https://github.com/ClickHouse/ClickHouse/blob/master/docker/server/README.md
- ClickHouse Docker Hub: https://hub.docker.com/r/clickhouse/clickhouse-server
- GitHub Actions service containers docs: https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services

## Issues Found

### 1. Go Testcontainers: `RunContainer` is deprecated (fixed)
**What was wrong:** The Go example used `clickhouse.RunContainer(ctx, testcontainers.WithImage("clickhouse/clickhouse-server:24.3"))`, which was deprecated in testcontainers-go v0.32.0. It also imported the `testcontainers` core package solely for `WithImage`, which is unnecessary with the new API.

**What was changed:** Updated to `clickhouse.Run(ctx, "clickhouse/clickhouse-server:24.3")` where the image is passed as the second positional argument. Removed the unused `github.com/testcontainers/testcontainers-go` import.

**Why:** `RunContainer` will be removed in the next major version. The `Run` function is the current recommended API, and the image is now a direct string argument rather than an option.

## Review Notes
- The Docker Compose `version: "3.8"` field is considered obsolete by Docker Compose V2, but it is still accepted and does not cause errors. Not changed since it remains functional.
- The Docker Compose healthcheck uses `clickhouse-client --query "SELECT 1"` without credentials, while the service sets `CLICKHOUSE_USER` and `CLICKHOUSE_PASSWORD`. This works because `clickhouse-client` inside the container connects locally as the `default` user, but a more robust alternative is `wget --spider -q localhost:8123/ping` which avoids authentication entirely.
- The Python Testcontainers example is correct. All APIs (`ClickHouseContainer`, `get_container_host_ip()`, `get_exposed_port()`, `clickhouse_connect.get_client()`, `command()`, `insert()`, `result_rows`) are current and properly used.
- The ClickHouse Docker environment variables (`CLICKHOUSE_DB`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`) are all officially supported and correctly used.
- The GitHub Actions service container configuration is syntactically correct and follows documented patterns.
