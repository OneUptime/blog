# Validation Summary: How to Start a Dapr Proof of Concept

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr State Management API
- Docker (for Dapr self-hosted mode)
- Redis (default state store)
- Zipkin (default tracing backend)
- Go (application language)
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr Go SDK source code on GitHub: https://github.com/dapr/go-sdk (verified `NewClient`, `SaveState`, `Close` signatures)
- Install the Dapr CLI: https://docs.dapr.io/getting-started/install-dapr-cli/
- Initialize Dapr in your local environment: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr CLI overview (global flags including `--version`): https://docs.dapr.io/reference/cli/cli-overview/
- `dapr run` CLI command reference: https://docs.dapr.io/reference/cli/dapr-run/
- State management API reference (GET endpoint pattern): https://docs.dapr.io/reference/api/state_api/
- Dapr airgap/offline setup (container naming conventions): https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-airgap/

## Issues Found
No technical issues found.

All code examples, CLI commands, API endpoints, and container names were verified against official documentation and source code:

1. **Go SDK code**: The import path `github.com/dapr/go-sdk/client`, `dapr.NewClient()`, `client.SaveState(ctx, storeName, key, data, meta)`, and `client.Close()` all match the actual Dapr Go SDK signatures.
2. **Homebrew install**: `brew install dapr/tap/dapr-cli` is the correct tap and formula.
3. **`dapr init`**: Correctly described as initializing self-hosted mode with Redis and Zipkin via Docker.
4. **`dapr --version`**: Valid global flag confirmed in CLI reference.
5. **`dapr run` flags**: `--app-id`, `--app-port`, `--dapr-http-port`, and the `--` separator are all correct per the CLI reference.
6. **State API URL**: `http://localhost:3500/v1.0/state/statestore/poc-key` follows the documented `GET /v1.0/state/<storename>/<key>` pattern.
7. **Docker container names**: `dapr_redis` and `dapr_zipkin` are the canonical names created by `dapr init`.

## Review Notes
- The `SaveState` call passes `nil` for the metadata parameter (`map[string]string`), which is valid Go and matches official example code in the Dapr Go SDK repository.
- The `NewClient()` function accepts optional `grpc.DialOption` variadic arguments; calling it with no arguments (as shown) uses default connection settings, which is the standard pattern for self-hosted mode.
- The `hey` benchmarking tool is a third-party tool (not part of Dapr) and would need to be installed separately; the post does not mention this, but it is a minor omission rather than a technical error.
- The latency and memory overhead numbers in the "PoC Results" template (2-5ms, 35MB) are presented as example findings, not as guaranteed benchmarks, which is appropriate.
