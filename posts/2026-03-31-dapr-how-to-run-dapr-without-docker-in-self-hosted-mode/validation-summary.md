# Validation Summary: How to Run Dapr Without Docker in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (CLI, sidecar, placement service)
- Dapr self-hosted slim mode
- Dapr in-memory state store and pub/sub components
- Dapr SQLite state store
- Redis (native installation, Dapr state store component)
- Dapr multi-app run
- Node.js (as example application runtime)

## Sources Consulted
- Dapr official docs: Self-hosted mode without Docker — https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr CLI reference: `dapr init` — https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference: `dapr run` — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr component reference: In-memory state store — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- Dapr component reference: In-memory pub/sub — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-inmemory/
- Dapr component reference: SQLite state store — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlite/
- Dapr component reference: Redis state store — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr multi-app run documentation — https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/
- Dapr placement service overview — https://docs.dapr.io/concepts/dapr-services/placement/

## Issues Found

1. **Incorrect claim about default component configurations in slim mode.** The post stated that `dapr init --slim` installs "Default component configurations pointing to in-memory stores." This is wrong — slim mode does not install any default component files. Fixed by removing the incorrect bullet point and adding a note that users must provide their own component files.

2. **Placement service port inconsistency.** The post showed starting the placement service without a port flag (`~/.dapr/bin/placement &`) but then used `localhost:50006` in all `dapr run` commands. The default placement port on Linux/macOS is 50005, not 50006 (50006 is used in Docker-based deployments). Fixed all `--placement-host-address` values to `localhost:50005` to match the default, and changed the custom port example to `6050` to avoid confusion with the default.

3. **Deprecated `--components-path` flag.** The `--components-path` flag for `dapr run` is deprecated in favor of `--resources-path`. Replaced all occurrences with `--resources-path`.

4. **SQLite connection string used non-standard approach.** The post embedded `_busy_timeout=5000` as a SQLite URI parameter in the connection string. The documented Dapr approach uses a separate `busyTimeout` metadata field with Go duration format (e.g., `"5s"`). Fixed to use the documented metadata field pattern.

5. **Incomplete placement service requirement.** The post stated the placement service is "required only if you use Dapr actors." This is incomplete — Dapr workflows also require the placement service because they use actors internally. Fixed to mention both actors and workflows.

## Review Notes
- The post references Dapr version 1.14.0 in the example output. Version numbers shown are illustrative and will become outdated as new versions are released.
- Recent Dapr versions also install a `scheduler` binary in slim mode in addition to `daprd` and `placement`. The post does not mention this, which may be worth updating if targeting the latest Dapr version.
- The in-memory state store and pub/sub component YAMLs omit the `metadata` field under `spec`. While this typically works, the official docs include `metadata: []` even when empty. This is a minor point and does not cause errors in practice.
