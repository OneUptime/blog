# Validation Summary: How to Set Up ClickHouse Healthchecks

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (HTTP interface `/ping`, `/replicas_status`, `system.replicas`, MergeTree, Enum8)
- Bash shell scripting (healthcheck script)
- Kubernetes (StatefulSet, livenessProbe, readinessProbe, startupProbe, exec probe)
- HAProxy (httpchk, http-check expect, tcp-check)
- curl (HTTP probes)

## Sources Consulted
- ClickHouse HTTP Interface documentation (`/ping`, `/replicas_status`): https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `system.replicas` table documentation (columns `is_readonly`, `absolute_delay`): https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `clickhouse-client` CLI documentation: https://clickhouse.com/docs/en/interfaces/cli
- Kubernetes Probe documentation (liveness/readiness/startup): https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- HAProxy Configuration Manual (`option httpchk`, `http-check expect`, `tcp-check`): https://docs.haproxy.org/
- ClickHouse Docker Hub (`clickhouse/clickhouse-server`): https://hub.docker.com/r/clickhouse/clickhouse-server
- ClickHouse MergeTree / TTL / Enum8 DDL reference: https://clickhouse.com/docs/en/sql-reference/statements/create/table

## Issues Found
No technical issues found.

All claims were verified against ClickHouse documentation:
- `/ping` on HTTP port 8123 returns `Ok.` when the server is alive and does not execute SQL — correct.
- `/replicas_status` returns `Ok.` when all replicated tables are healthy, otherwise returns a non-200 response with details — correct.
- `system.replicas` columns `absolute_delay` (UInt64 seconds) and `is_readonly` (UInt8) are valid — correct.
- Kubernetes probe fields (`httpGet`, `exec`, `initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`) are valid v1 fields.
- HAProxy directives (`option httpchk GET /ping`, `http-check expect string Ok.`, `option tcp-check`, `tcp-check connect port`, `check inter ... fall ... rise ...`) are valid.
- `clickhouse/clickhouse-server:24.3` is a published image tag (24.3 LTS).
- Enum8 DDL `Enum8('ok' = 1, 'fail' = 0, 'warn' = 2)` and `TTL check_time + INTERVAL 90 DAY` are valid ClickHouse syntax.
- Bash script uses `set -euo pipefail` safely — failure-prone commands are guarded with `|| true` / `|| echo ...` or used inside `if` conditions, so `set -e` does not cause premature exits.

## Review Notes
- The image tag `clickhouse/clickhouse-server:24.3` is a valid LTS release as of the post's publication, but readers may want to pin to a more specific minor version (e.g., `24.3.12.75`) or upgrade to a newer LTS in long-running deployments.
- Passing the password via URL query string (`&password=...`) in the comprehensive healthcheck script is convenient but leaks the password to process listings (`ps`) and HTTP server access logs. A production-grade script would prefer `X-ClickHouse-User` / `X-ClickHouse-Key` HTTP headers or the `CLICKHOUSE_PASSWORD` environment variable via `clickhouse-client`. This is a security hardening note rather than a technical error.
- The `/replicas_status` readiness probe will cause non-replicated single-node ClickHouse deployments to still report `Ok.` (there are no replicated tables to check), so the probe choice works both for replicated and non-replicated setups.
- No version-specific caveats beyond the image tag.
