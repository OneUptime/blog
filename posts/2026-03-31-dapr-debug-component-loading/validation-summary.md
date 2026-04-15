# Validation Summary: How to Debug Dapr Component Loading Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr run`)
- Dapr sidecar and component loading
- Dapr metadata API
- Redis (as example state store and pub/sub component)
- Kubernetes (CRDs, annotations, secrets)
- Docker

## Sources Consulted
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Redis state store setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI command list (verified `dapr validate` does not exist)

## Issues Found

1. **`--components-path` flag is deprecated (line 25)**: The `dapr run` command used `--components-path`, which is deprecated in favor of `--resources-path`. Changed to `--resources-path ./components`.

2. **Kubernetes logging configuration was misleading (lines 29-39)**: The post claimed to show how to "increase log verbosity" on Kubernetes but showed a Configuration resource enabling `apiLogging`, which only logs HTTP API calls — not the same as setting log level to debug. Replaced with the correct approach: setting the `dapr.io/log-level: "debug"` annotation on the Kubernetes Deployment pod template.

3. **`dapr validate` command does not exist (line 83)**: The post suggested running `dapr validate --components-path ./components` to validate component YAML. This command does not exist in the Dapr CLI. Removed the non-existent command and kept only the `yamllint` suggestion, which is a valid alternative.

4. **Incorrect pubsub.redis capabilities (line 141)**: The metadata endpoint example showed `pubsub.redis` with capabilities `["SUBSCRIBE_WILDCARDS"]`. The Redis Streams pub/sub component does not report any capabilities (returns empty). Changed to an empty array. Also removed `QUERY_API` from the state.redis capabilities as it is only present when the Redis JSON module is installed, which is not a default configuration.

## Review Notes
- The component YAML format, scoping syntax, and metadata endpoint usage are all correct and well-explained.
- The state.redis component may also report `QUERY_API` and `KEYS_LIKE` capabilities depending on whether the RedisJSON module is installed — this is version and configuration dependent.
- The example log output formats are illustrative and representative of actual Dapr sidecar log format, though field ordering may vary.
- The `namespace` field mentioned as a common mistake is good advice for Kubernetes deployments specifically.
