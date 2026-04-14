# Validation Summary: How to Test Dapr Python Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Python Dapr SDK (`dapr` PyPI package)
- pytest and pytest-asyncio
- unittest.mock (MagicMock, patch)
- Flask (for pub/sub handler testing)
- CloudEvents specification
- Dapr CLI (`dapr run`, `dapr init`)

## Sources Consulted
- Dapr Python SDK source code (dapr/python-sdk on GitHub) — `DaprClient`, `DaprGrpcClient`, `save_state`, `get_state`, `get_configuration` method signatures
- Dapr Python SDK `global_settings.py` — environment variable names (`DAPR_GRPC_PORT`, `DAPR_HTTP_PORT`) and defaults
- Dapr Python SDK `_response.py` — `StateResponse.data` property (returns bytes), `ConfigurationResponse.items` structure
- Dapr CLI documentation — `dapr run` flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--dapr-grpc-port`, `--resources-path`)
- CloudEvents specification v1.0 — `data` field encoding for JSON content type

## Issues Found

1. **`DAPR_HTTP_PORT` should be `DAPR_GRPC_PORT`**: The integration test set `os.environ["DAPR_HTTP_PORT"] = "3501"` to configure the Dapr Python SDK client. However, `DaprClient` communicates with the sidecar over gRPC by default, not HTTP. The correct environment variable is `DAPR_GRPC_PORT`. Changed to `os.environ["DAPR_GRPC_PORT"] = "50051"` and added `--dapr-grpc-port 50051` to the `dapr run` command.

2. **CloudEvents `data` field was a JSON string instead of a dict**: The pub/sub test used `"data": json.dumps({"order_id": "001", "item": "book"})`, which produces a stringified JSON value. When Dapr delivers CloudEvents over HTTP to a subscriber, the `data` field is a parsed JSON object (dict), not a string. Changed to `"data": {"order_id": "001", "item": "book"}`.

3. **`--components-path` is deprecated**: The `dapr run` command used the deprecated `--components-path` flag. Updated to `--resources-path`, which is the current recommended flag.

## Review Notes
- The `pytest-asyncio` and `httpx` packages in the prerequisites are not used in any of the code examples shown. They are not incorrect to install but may confuse readers expecting to see async test patterns.
- The `requests` import in `test_integration.py` is unused in the shown code.
- The `pytest` import in the unit test file is unused in the shown code (no pytest fixtures or markers are used in that specific example).
- The integration test uses `time.sleep(3)` to wait for the sidecar to start, which is fragile. A retry loop checking sidecar health would be more robust, but the current approach is acceptable for a tutorial.
