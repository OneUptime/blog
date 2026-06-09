# Validation Summary: How to Create Effective Runbooks

## Status
validated

## Post Type
Guide / Tutorial — covers structure, components, templates, and lifecycle management for operational runbooks (SRE/DevOps).

## Technologies Covered
- PostgreSQL (replication, failover, `pg_stat_replication`, `pg_ctl promote`, `pg_is_in_recovery`)
- Kubernetes / kubectl (deployments, secrets, rollouts, ingress)
- Bash / Linux shell utilities (`top`, `ps`, `lsof`, `systemctl`, `pgrep`)
- OpenSSL (certificate validation, key/cert matching)
- Python 3 (subprocess, logging, type hints)
- Prometheus / PrometheusRule CRD (monitoring.coreos.com/v1)
- cAdvisor metrics (`container_memory_usage_bytes`, `container_spec_memory_limit_bytes`)
- GitHub Actions (workflow YAML)
- YAML metadata headers
- Mermaid diagrams

## Sources Consulted
- PostgreSQL 14 documentation: server parameters (max_connections requires restart) — https://www.postgresql.org/docs/14/runtime-config-connection.html
- PostgreSQL documentation: `default_transaction_read_only` and `pg_reload_conf()` — https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL documentation: `pg_stat_replication`, `pg_wal_lsn_diff`, `pg_is_in_recovery()` — https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL documentation: `pg_ctl promote` — https://www.postgresql.org/docs/current/app-pg-ctl.html
- Kubernetes documentation: kubectl set image, kubectl rollout — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes deprecation notice for `--record` flag (deprecated since 1.11)
- kubectl create secret tls with `--dry-run=client` — https://kubernetes.io/docs/concepts/configuration/secret/
- OpenSSL documentation: `x509`, `verify`, `s_client`, `rsa` subcommands
- Prometheus Operator CRD reference for PrometheusRule (`monitoring.coreos.com/v1`)
- GitHub Actions documentation: `actions/checkout@v4`
- procps-ng `top` man page (`-o %CPU` sort field)

## Issues Found
1. **PostgreSQL `ALTER SYSTEM SET max_connections = 0` followed by `pg_reload_conf()`** — This is technically incorrect. `max_connections` requires a server restart to take effect ("This parameter can only be set at server start" per the PostgreSQL docs). Calling `pg_reload_conf()` would succeed (returning `t`) but the configured change would not actually apply, making the "expected output" misleading. Additionally, setting `max_connections` to `0` would prevent even administrators from reconnecting after restart. Replaced with `ALTER SYSTEM SET default_transaction_read_only = 'on'`, which is a setting that can be applied via `pg_reload_conf()` and prevents new write transactions — the more correct way to achieve the stated intent of "block new writes to primary." Updated the rollback step to reset the same parameter.

2. **Deprecated `kubectl set image ... --record` flag** — The `--record` flag has been deprecated since Kubernetes 1.11 and emits a deprecation warning. Removed it from the example command to reflect current best practice.

## Review Notes
- The `top -bn1 -o %CPU` command works on modern procps-ng. On older `top` versions or BSD-derived systems, the `-o` flag may not be supported or may require a different field name; readers using non-standard distributions should adapt accordingly.
- Using `md5sum` to compare certificate and key modulus is a long-established convention and is correct for equality comparison, though SHA-based hashes would be more cryptographically modern. The technique itself is sound.
- The post uses nested triple-backtick fences (markdown examples that contain bash/text code blocks). Some markdown renderers may not render nested blocks correctly; using indented inner blocks or differently-sized fences (e.g., four backticks for the outer block) would render more reliably. This is a presentation matter, not a technical inaccuracy.
- The Python orchestrator example uses `from typing import Tuple`, which is fine; on Python 3.9+ the lowercase `tuple[bool, str]` is also valid.
- The `pg_ctl promote -D /var/lib/postgresql/14/main` path is correct for Debian/Ubuntu PostgreSQL 14 installations; other distributions or versions will have different data directories.
- The PrometheusRule example uses `apiVersion: monitoring.coreos.com/v1` which is the correct Prometheus Operator CRD group/version.
- All `kubectl` subcommands (`rollout status`, `rollout undo`, `rollout restart`, `create secret tls --dry-run=client`, `apply -f -`) match current kubectl behavior.
