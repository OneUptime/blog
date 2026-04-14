# Validation Summary: How to Test Pluggable Components Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components, sidecar, CLI)
- Go (building and testing pluggable components)
- gRPC / Protocol Buffers (component-sidecar communication)
- Unix domain sockets
- grpcurl (debugging tool)
- Dapr HTTP State Management API

## Sources Consulted
- Dapr Pluggable Components Registration docs: https://docs.dapr.io/operations/components/pluggable-components-registration/
- Dapr Environment Variable Reference: https://docs.dapr.io/reference/environment/
- Dapr CLI `dapr run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr proto source files (state.proto, common.proto): https://github.com/dapr/dapr/tree/master/dapr/proto/components/v1
- Dapr generated Go proto code: https://github.com/dapr/dapr/tree/master/pkg/proto/components/v1

## Issues Found

1. **Wrong environment variable name**: The post used `DAPR_COMPONENT_SOCKET_FOLDER` throughout. The correct environment variable is `DAPR_COMPONENTS_SOCKETS_FOLDER` (both "COMPONENTS" and "SOCKETS" are plural). Fixed all occurrences.

2. **Wrong default socket directory**: The post used `/tmp/dapr-components` as the socket directory. The correct default path is `/tmp/dapr-components-sockets`. Fixed all occurrences.

3. **Misuse of `--unix-domain-socket` CLI flag**: The post passed `--unix-domain-socket /tmp/dapr-components` to `dapr run`, implying this flag configures pluggable component socket discovery. In reality, this flag controls Unix domain socket communication between the Dapr sidecar and the application (for lower latency), not pluggable component discovery. Pluggable component socket discovery is controlled by the `DAPR_COMPONENTS_SOCKETS_FOLDER` environment variable. Fixed by removing the flag and prepending the env var to the `dapr run` commands instead.

4. **Incorrect proto message structure for MetadataRequest**: The unit test code used `[]*proto.MetadataEntry{{Key: "connectionString", Value: "test"}}` for `MetadataRequest.Properties`. The actual proto definition uses `map<string, string> properties`, which in Go is `map[string]string`. There is no `MetadataEntry` type in the Dapr pluggable component protos. Fixed to use `map[string]string{"connectionString": "test"}`.

## Review Notes
- The integration test script's cleanup (`kill $!`) only kills the last backgrounded process (the `dapr run` process) but does not kill the component process started earlier. A more robust cleanup would save and kill both PIDs, or use a trap. This is a minor robustness issue, not a technical error.
- The Go unit test uses `package main` which means test files must be in the same package as the component implementation. This is fine for the tutorial's purpose but worth noting.
- The post correctly identifies the gRPC service name (`dapr.proto.components.v1.StateStore`), the component YAML format, the HTTP state API endpoints, and the Go proto import path.
