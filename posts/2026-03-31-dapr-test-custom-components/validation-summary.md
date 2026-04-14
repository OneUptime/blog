# Validation Summary: How to Test Custom Dapr Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components, state store API)
- Go (unit testing, integration testing)
- gRPC / Protocol Buffers (Dapr component proto definitions)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr components-contrib conformance test suite
- testify (`assert`, `require`)

## Sources Consulted
- Dapr pluggable components proto definitions at `github.com/dapr/dapr/pkg/proto/components/v1` (state.proto generated Go types)
- Dapr Go SDK source code at `github.com/dapr/go-sdk/client` (client.go, state.go)
- Dapr components-contrib conformance test suite at `github.com/dapr/components-contrib/tests/conformance/` (state_test.go, CI workflow, tests.yml config format)
- Dapr sandbox components-go-sdk at `github.com/dapr-sandbox/components-go-sdk`

## Issues Found

1. **Misleading `testcontainers-go` reference**: The integration test section header claimed to "Use `testcontainers-go` to spin up a Dapr sidecar" but the code did not use testcontainers-go at all. Changed the description to accurately reflect what the code does (starts a component process and tests through the Dapr client).

2. **Wrong conformance test function name**: The post used `TestStateStoreConformance` but the actual function in components-contrib is `TestStateConformance`. The naming convention is `Test{Kind}Conformance` where Kind is the component category (e.g., `State`, `Pubsub`, `Bindings`). Fixed to `TestStateConformance`.

3. **Non-existent `-component-config` flag**: The post used `-component-config ./tests/config/mycomponent.json` which does not exist. Conformance tests require the `-tags=conftests` build tag and use convention-based YAML configuration files. Fixed the command to use the correct flags and format.

4. **Incorrect conformance test config format**: The post showed a JSON config file with fields like `componentName`, `componentType`, `operations`, and `config`. In reality, conformance tests use two YAML files: a test manifest (`tests/config/state/tests.yml`) listing components and their operations, and a standard Dapr component YAML (`tests/config/state/{component}/statestore.yaml`). Replaced with the correct YAML format and directory structure.

## Review Notes
- The unit test code uses proto types directly from `github.com/dapr/dapr/pkg/proto/components/v1`, which is correct but represents a lower-level approach. The `github.com/dapr-sandbox/components-go-sdk` provides higher-level wrappers that translate proto types to/from `components-contrib` state interfaces, which may be more ergonomic for production use.
- The integration test uses `dapr.NewClientWithPort("50001")` which assumes the import `dapr "github.com/dapr/go-sdk/client"` with an alias. The default package name is `client`, not `dapr`. The code would work as written if the import uses the alias shown, but the imports are not shown in the integration test snippet.
- The `SaveState` call passes `nil` as the last argument for metadata (`map[string]string`), which is valid Go.
- The conformance test operations in the original JSON (`"get"`, `"set"`, `"delete"`, `"bulk"`) don't match the actual operation names used in `tests.yml` (e.g., `"transaction"`, `"etag"`, `"first-write"`, `"query"`, `"ttl"`). The replacement uses correct operation names.
