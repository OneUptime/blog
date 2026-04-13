# Validation Summary: How to Configure Dapr with Zookeeper State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache ZooKeeper (3.8)
- Dapr (state management building block)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Docker / Docker Compose
- Kubernetes (kubectl)

## Sources Consulted
- [Dapr ZooKeeper State Store Component Docs](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-zookeeper/) — verified component type (`state.zookeeper`), metadata fields (`servers`, `sessionTimeout`, `maxBufferSize`, `maxConnBufferSize`, `keyPrefixPath`), and required/optional status.
- [Dapr State Management API Reference](https://docs.dapr.io/reference/api/state_api/) — verified HTTP endpoints (`POST /v1.0/state/{storeName}`, `GET /v1.0/state/{storeName}/{key}`) and request body format.
- [Dapr JavaScript Client SDK Docs](https://docs.dapr.io/developing-applications/sdks/js/js-client/) — verified `DaprClient` import from `@dapr/dapr`, `state.save()` and `state.get()` method signatures, and per-item `options` with `consistency` field.
- [Dapr State Store Component Specs](https://docs.dapr.io/reference/components-reference/supported-state-stores) — verified ZooKeeper state store capabilities (CRUD, ETag support).
- [ZooKeeper Administrator's Guide](https://zookeeper.apache.org/doc/current/zookeeperAdmin.html) — verified four-letter word whitelist behavior in ZooKeeper 3.5+.
- [Official ZooKeeper Docker Image](https://hub.docker.com/_/zookeeper) — verified `ZOO_4LW_COMMANDS_WHITELIST` environment variable and default whitelist (only `srvr`).
- [Docker Library PR #6564](https://github.com/docker-library/official-images/pull/6564) — confirmed `ZOO_4LW_COMMANDS_WHITELIST` env var support in the official image.

## Issues Found
1. **`ruok` health check fails without whitelist configuration**: Since ZooKeeper 3.5, four-letter word commands (including `ruok`) are disabled by default — only `srvr` is whitelisted. The Docker `run` command was missing the `-e ZOO_4LW_COMMANDS_WHITELIST=ruok` environment variable, which would cause the `echo "ruok" | nc localhost 2181` health check to fail silently or return an error message instead of `imok`. **Fixed** by adding `-e ZOO_4LW_COMMANDS_WHITELIST=ruok` to the Docker run command.

## Review Notes
- The `zkCli.sh` inspection example shows paths like `/dapr/state/feature-flags`. By default, Dapr prepends the app-id to state keys (e.g., `{appId}||feature-flags`), so the actual znode path would be `/dapr/state/{appId}||feature-flags`. Readers inspecting ZooKeeper znodes directly should be aware of this key prefix behavior. This is a Dapr-level concern applicable to all state stores, not specific to ZooKeeper.
- The Docker Compose example shows only one node (`zoo1`) of a three-node ensemble. The other two services (`zoo2`, `zoo3`) would need to be added similarly. This is intentional as a pattern snippet but could confuse readers expecting a complete file.
- ZooKeeper state store does not support transactions, TTL, or actors in Dapr. The blog post correctly avoids claiming these features.
