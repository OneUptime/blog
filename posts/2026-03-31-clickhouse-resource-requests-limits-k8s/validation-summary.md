# Validation Summary: How to Set Resource Requests and Limits for ClickHouse on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server version 24.3)
- Kubernetes (StatefulSet, LimitRange, resource requests/limits)
- Altinity ClickHouse Operator (ClickHouseInstallation CRD)
- ClickHouse server and user-level memory configuration (XML)

## Sources Consulted
- ClickHouse Server Settings documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse Settings Profiles documentation: https://clickhouse.com/docs/operations/settings/settings-profiles
- ClickHouse Restrictions on Query Complexity documentation: https://clickhouse.com/docs/operations/settings/query-complexity
- Altinity KB Memory Configuration Settings: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-memory-configuration-settings/
- Altinity KB Server Configuration Files: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-server-config-files/
- ClickHouse canonical config.xml on GitHub: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- Kubernetes Resource Management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found

### 1. `max_memory_usage` and `max_memory_usage_for_user` placed in wrong config file
- **What was wrong:** The blog post placed `max_memory_usage` (per-query limit) and `max_memory_usage_for_user` (per-user limit) directly under the `<clickhouse>` root element in a `config.d/` server config file. These are session/profile-level settings, not server-level settings. ClickHouse would not recognize them at that path.
- **What was changed:** Split the XML configuration into two blocks: the server-level setting (`max_server_memory_usage_to_ram_ratio`) remains in `/etc/clickhouse-server/config.d/memory.xml`, while the user/profile-level settings (`max_memory_usage`, `max_memory_usage_for_user`) were moved to `/etc/clickhouse-server/users.d/memory.xml` inside `<profiles><default>`.
- **Why:** ClickHouse distinguishes between server settings (placed in `config.xml` / `config.d/`) and user settings (placed in `users.xml` / `users.d/` under `<profiles>`). Mixing them causes the user settings to be silently ignored.

### 2. Comment/value mismatch for memory ratio
- **What was wrong:** The XML comment said "Use ~80% of container limit" but the actual value was `0.85` (85%).
- **What was changed:** Updated the comment to say "Use ~85% of container memory limit" to match the configured value.
- **Why:** Accuracy — the comment should reflect what the setting actually does.

## Review Notes
- The Kubernetes YAML for StatefulSet, ClickHouseInstallation CRD, and LimitRange are all syntactically correct and use proper API versions.
- ClickHouse ports 8123 (HTTP) and 9000 (native TCP) are correct.
- The readiness probe on `/ping` at port 8123 is a valid ClickHouse health check endpoint.
- The data directory `/var/lib/clickhouse` and config directory `/etc/clickhouse-server/config.d` are the correct default paths.
- The recommendation to omit CPU limits for analytical workloads is a well-established best practice in the Kubernetes community.
- The `clickhouse/clickhouse-server:24.3` image tag references a valid ClickHouse release.
