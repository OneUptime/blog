# Validation Summary: How to Certify Pluggable Components for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr components-contrib conformance testing framework
- Go (Golang) testing
- gRPC (pluggable component protocol)
- golangci-lint

## Sources Consulted
- Dapr Component Certification Lifecycle documentation: https://docs.dapr.io/operations/components/certification-lifecycle/
- Dapr components-contrib conformance tests README: https://github.com/dapr/components-contrib/blob/main/tests/conformance/README.md
- Dapr state conformance package on pkg.go.dev: https://pkg.go.dev/github.com/dapr/components-contrib/tests/conformance/state
- Dapr pluggable components overview: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-overview/
- Dapr state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores

## Issues Found

1. **File path typo in comment**: The Go code comment referenced `test/conformance/state_test.go` but the actual directory in components-contrib is `tests/conformance/` (with an 's'). Fixed to `tests/conformance/state_test.go`.

2. **Fabricated conformance test API**: The original code used `conf.NewTestConfig(t.Name())`, `conf.ConformanceTests()`, and functional options `state.GetTestRunner(state.WithEtag(), state.WithTransactional(), state.WithQueryAPI(false))`. None of these match the actual components-contrib API. The real `NewTestConfig` takes `(component string, operations []string, configMap map[string]interface{})` and returns `(TestConfig, error)`. The conformance test function is `state.ConformanceTests()` in the `tests/conformance/state` package, not `conf.ConformanceTests()`. Fixed the code to use the correct API signatures.

3. **Wrong types in concurrent test**: The original code used `proto.InitRequest` and `proto.SetRequest`, which are not the correct types. The Dapr state store interface uses `state.Metadata` for `Init()` and `state.SetRequest` for `Set()` from `github.com/dapr/components-contrib/state`. Fixed to use the correct types.

4. **Wrong return value from `Set()`**: The original code used `_, err := store.Set(...)` but the Dapr state store `Set` method returns only `error`, not a tuple. Fixed to `err := store.Set(...)`.

## Review Notes
- The formal Dapr component certification lifecycle (Alpha -> Beta -> Stable) applies to built-in components contributed to components-contrib, not to externally-maintained pluggable components. The post's framing of "certifying" a pluggable component is slightly misleading -- the conformance tests validate correctness, but pluggable components maintained outside the Dapr repo don't go through the official certification lifecycle. The post's practical guidance is still valid for validation purposes.
- The specific test names in the "Specific Test Categories" section (e.g., `TestStateStoreBasicOperations`, `TestStateStoreETag`) are illustrative rather than actual test names from the conformance suite. The real conformance tests use patterns like `TestStateConformance/<component>`. These were left as-is since they serve as conceptual examples of test categories.
- The `go test` commands are syntactically correct and use valid Go test flags.
- The checklist section with `golangci-lint`, race detection, coverage, and benchmarks is sound general Go testing advice.
