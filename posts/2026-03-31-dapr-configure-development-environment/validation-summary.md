# Validation Summary: How to Configure Dapr for Development Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — self-hosted mode
- Dapr CLI (`dapr run`, `dapr init`, multi-app run files)
- Redis (state store and pub/sub)
- Zipkin (distributed tracing)
- Dapr component YAML definitions (state.redis, pubsub.redis, secretstores.local.file)
- Dapr Configuration resources (tracing)
- Python, .NET, Node.js (as example app runtimes)

## Sources Consulted
- Dapr CLI installation docs — https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr self-hosted initialization — https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Redis State Store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Redis Pub/Sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Local File Secret Store reference — https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- `dapr run` CLI reference — https://docs.dapr.io/reference/cli/dapr-run/
- Multi-App Run overview — https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-overview/
- Dapr Configuration overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Zipkin tracing setup — https://docs.dapr.io/operations/observability/tracing/zipkin/
- `dapr stop` CLI reference — https://docs.dapr.io/reference/cli/dapr-stop/
- CLI flag rename (--components-path to --resources-path) — https://github.com/dapr/cli/issues/953

## Issues Found

### 1. Deprecated `--components-path` flag (3 occurrences)
- **What was wrong:** The `dapr run` examples used `--components-path`, which has been deprecated since Dapr CLI 1.13.0.
- **What was changed:** Replaced all three occurrences of `--components-path` with `--resources-path`.
- **Why:** `--resources-path` is the current flag name. `--components-path` still works but is deprecated and may be removed in a future release.

### 2. Tracing configuration placed in `components/` directory
- **What was wrong:** The tracing section wrote a `kind: Configuration` resource to `components/tracing.yaml`. Dapr Configuration resources are fundamentally different from Component resources and must NOT be placed in the components/resources directory. They are loaded via the `--config` flag or the default `~/.dapr/config.yaml`, not discovered from the resources path.
- **What was changed:** Changed the file path from `components/tracing.yaml` to `config.yaml` (project root), renamed the Configuration metadata to `daprConfig`, and added a `dapr run` example showing how to reference it with the `--config ./config.yaml` flag.
- **Why:** Placing a Configuration resource in the components directory would cause it to be ignored or produce an error, since Dapr only loads Component-kind resources from that directory.

## Review Notes
- `dapr init` already creates `~/.dapr/config.yaml` with Zipkin tracing enabled at sampling rate "1" by default. For local development, an explicit tracing configuration file may not be needed unless customizing settings.
- The JSON code block for `secrets/dev-secrets.json` uses a `//` comment to indicate the file path, which is not valid JSON syntax. This is a common blog convention and would not affect readers copying only the JSON content, but it is worth noting.
- The multi-app run feature (`dapr run -f`) was introduced as a preview feature and may have matured since — readers should check the latest Dapr docs for any schema changes.
