# Validation Summary: How to Use config.xml vs config.d Directory in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse server configuration
- XML configuration merging (config.d, users.d)
- ClickHouse server CLI utilities (`clickhouse-extract-from-config`, `clickhouse-client`)
- ClickHouse system tables (`system.server_settings`)

## Sources Consulted
- [ClickHouse Configuration Files documentation](https://clickhouse.com/docs/operations/configuration-files)
- [ClickHouse default config.xml (master branch)](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml)
- [ClickHouse Server.cpp source (command-line options)](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/Server.cpp)
- [GitHub issue #7966 — mechanism for validating configuration files](https://github.com/ClickHouse/ClickHouse/issues/7966)
- [Altinity Knowledge Base — Server configuration files](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-server-config-files/)

## Issues Found
1. **Invalid `--check-config` flag.** The original "Validating Your Configuration" section used `clickhouse-server --config=... --check-config`. `clickhouse-server` does not expose a `--check-config` option (only `--help`/`-V` plus positional config overrides; everything else comes from `BaseDaemon`). I replaced the example with the documented approaches: `clickhouse-extract-from-config` for parse-time validation, and reading the preprocessed merged config from `/var/lib/clickhouse/preprocessed_configs/config.xml`.
2. **Misleading description of `system.server_settings`.** The original text claimed this query shows "the merged configuration that ClickHouse is currently using." `system.server_settings` only exposes documented server-scoped settings — not the full merged XML tree (profiles, remote_servers, storage_configuration, macros, etc.). I reframed it as a way to inspect "active server-level settings at runtime" and pointed to the preprocessed file as the actual source for the full merged tree.

## Review Notes
- Root element `<clickhouse>` is correct; the legacy `<yandex>` root is still accepted but `<clickhouse>` is the current convention.
- Logger keys (`<level>`, `<log>`, `<size>`, `<count>`) and the log level `information` are valid per the upstream default `config.xml`.
- The `remove="1"`, `replace="1"`, and `from_env` attributes are documented and behave as described.
- The `config.d/` alphabetical merge order and the package-manager rationale for preferring drop-ins over editing `config.xml` match the official documentation.
- The numeric prefix convention (`01-network.xml`, etc.) is a community best practice rather than a ClickHouse-mandated requirement, but it is accurate guidance.
