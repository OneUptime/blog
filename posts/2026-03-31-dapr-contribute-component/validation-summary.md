# Validation Summary: How to Contribute a Component to the Dapr Project

## Status
validated

## Post Type
Tutorial / Contribution Guide

## Technologies Covered
- Dapr (components-contrib repository)
- Go programming language
- State store component interface
- Dapr conformance testing framework
- golangci-lint

## Sources Consulted
- https://github.com/dapr/components-contrib/blob/main/state/store.go — `state.Store` interface definition (confirms `BaseStore`, `BulkStore`, and `metadata.ComponentWithMetadata` composition)
- https://github.com/dapr/components-contrib/blob/main/state/sqlite/sqlite.go — reference state store implementation (confirms `GetComponentMetadata` pattern)
- https://github.com/dapr/components-contrib/blob/main/state/in-memory/in_memory.go — reference in-memory state store (confirms `NewDefaultBulkStore` pattern)
- https://github.com/dapr/components-contrib/blob/main/go.mod — Go version requirement (go 1.24)
- https://github.com/dapr/dapr/tree/master/cmd/daprd/components — component registration files (confirms `init()` + `RegisterComponent` pattern)
- https://github.com/dapr/components-contrib/blob/main/tests/config/state/tests.yml — conformance test configuration format (YAML, not JSON)
- https://github.com/dapr/components-contrib/blob/main/Makefile — conformance test build tags and commands

## Issues Found

1. **Missing `reflect` import**: The Go code used `reflect.TypeOf()` in `GetComponentMetadata()` but did not include `"reflect"` in the import block. Added the missing import.

2. **Missing `Features()` method**: The `state.Store` interface (via `BaseStore`) requires a `Features() []state.Feature` method. The blog's implementation omitted it. Added the method.

3. **Missing `Close()` method**: The `state.Store` interface embeds `io.Closer`, requiring a `Close() error` method. The blog's implementation omitted it. Added the method.

4. **No mention of `BulkStore`**: The `state.Store` interface embeds `BulkStore`, which requires `BulkGet`, `BulkSet`, and `BulkDelete` methods. Most components use `state.NewDefaultBulkStore(s)` for a default implementation. Added a note and code example showing this pattern.

5. **Incorrect component registration**: The blog claimed registration happens in `state/registry.go` within `components-contrib` via a `DefaultComponents()` method. This is wrong. Registration happens in the `dapr/dapr` runtime repository via `init()` functions in `cmd/daprd/components/`. Rewrote the entire section with the correct pattern using `stateLoader.DefaultRegistry.RegisterComponent()`.

6. **Wrong Go version**: The blog stated "Go 1.22+" but the `go.mod` in components-contrib specifies Go 1.24. Updated to "Go 1.24+".

7. **Wrong conformance test config format**: The blog showed a JSON config file with fields like `"componentName"`, `"componentType"`, and `"operations"`. The actual conformance tests use YAML files (`tests/config/state/tests.yml`) with a different structure, plus separate Dapr component YAML files. The operation names were also wrong (`"get"`, `"set"`, `"delete"`, `"bulk"` vs. the real names like `"etag"`, `"transaction"`, `"first-write"`, `"ttl"`). Replaced with correct YAML format and examples.

8. **Wrong conformance test command**: The blog's command `go test ./tests/conformance/... -run TestStateStoreConformance/mystore -v` had three issues: missing required `-tags=conftests` build tag, wrong test function name (`TestStateStoreConformance` vs. `TestStateConformance`), and missing `-count=1` flag. Fixed the command.

## Review Notes
- The blog uses fictional helpers (`myStoreClient`, `parseMetadata`, `newMyStoreClient`, `myStoreMetadata`) which is fine for illustrative purposes but could confuse beginners. This is a stylistic choice, not a technical error.
- The `GetComponentMetadata` method is only compiled when the `metadata` build tag is set. This nuance is not mentioned in the post but is a minor detail.
- The conformance test operations will vary per component; the examples shown are representative but contributors should check which operations their specific store supports.
