# Validation Summary: How to Test Application Compatibility After Dapr Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (runtime and building blocks: state management, pub/sub, service invocation)
- Dapr Python SDK (`dapr-client`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Python (pytest test framework)
- Go (standard testing package, testify)
- Kubernetes (kubectl)
- Bash scripting

## Sources Consulted
- Dapr Python SDK source code and tests (https://github.com/dapr/python-sdk) — verified `StateResponse.data` return type for missing keys, `InvokeMethodResponse` properties, and `save_state` parameter names
- Dapr Go SDK documentation (https://pkg.go.dev/github.com/dapr/go-sdk/client) — verified `SaveState`, `GetState`, `DeleteState` function signatures and `StateItem` struct fields
- Dapr official documentation (https://docs.dapr.io/developing-applications/sdks/python/python-client/) — cross-referenced Python client API usage
- Dapr official documentation (https://docs.dapr.io/developing-applications/sdks/go/go-client/) — cross-referenced Go client API usage

## Issues Found

1. **Python: Incorrect assertion for deleted state key (line 41)**
   - **What was wrong:** `assert deleted.data is None` — the Dapr Python SDK returns `b""` (empty bytes) for missing/deleted keys, not `None`. The gRPC protobuf `bytes` field defaults to empty bytes. This is confirmed by the SDK's own test suite which asserts `resp.data == b''` for non-existent keys.
   - **What was changed:** Changed to `assert deleted.data == b""`.

2. **Python: Unreliable status_code assertion for service invocation (line 91)**
   - **What was wrong:** `assert response.status_code == 200` — while `InvokeMethodResponse` has a `status_code` property, it defaults to `None` when using the default gRPC transport. The gRPC-based `invoke_method` does not set an HTTP status code on success; instead, it raises `DaprInternalError` on failure. The assertion `None == 200` evaluates to `False`, causing the test to fail even on a successful invocation.
   - **What was changed:** Changed to `assert response is not None` with a comment explaining that `invoke_method` raises `DaprInternalError` on failure.

3. **Go: Unused import causing compilation failure (line 135)**
   - **What was wrong:** The `"time"` package was imported but never used in the Go test function. Go treats unused imports as compilation errors.
   - **What was changed:** Removed the `"time"` import.

## Review Notes
- The Python test file imports `pytest`, `httpx`, and defines `DAPR_HTTP` without using them directly in the shown code. This is acceptable since the file is presented as part of a larger test suite where these would be used in additional tests not shown.
- The `received = []` variable in `test_publish_and_receive` is declared but unused. This appears to be a remnant of an alternative approach to the test but does not cause a runtime error in Python.
- The TTL test assertion `assert result.data is None or result.data == b""` on line 60 is technically redundant in its first clause (data is never None), but the assertion still passes correctly since the `or` short-circuits to the second condition. Left as-is since it doesn't cause test failures and the comment acknowledges version-dependent behavior.
- All Go SDK function signatures (`SaveState`, `GetState`, `DeleteState`) were verified correct, including the use of `nil` for the metadata parameter and the `result.Value` field access on `StateItem`.
