# Validation Summary: How to Contribute Dapr SDK Improvements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (dapr/python-sdk)
- Dapr .NET SDK (dapr/dotnet-sdk)
- Dapr Java SDK (dapr/java-sdk)
- Dapr JavaScript/TypeScript SDK (dapr/js-sdk)
- Dapr Go SDK (dapr/go-sdk)
- Dapr PHP SDK (dapr/php-sdk)
- Python (pytest, mypy, venv)
- .NET (dotnet CLI)
- gRPC
- GitHub CLI (gh)
- Git (DCO signed-off commits)

## Sources Consulted
- Dapr Python SDK repository structure and source code (https://github.com/dapr/python-sdk)
- Dapr .NET SDK repository structure (https://github.com/dapr/dotnet-sdk)
- Dapr Python SDK `dapr/clients/grpc/client.py` — verified `DaprGrpcClient` is synchronous, async client is separate at `dapr/aio/clients/grpc/client.py`
- Dapr Python SDK `dev-requirements.txt` and `tox.ini` — verified development setup commands
- Dapr Python SDK CONTRIBUTING.md — verified DCO (Developer Certificate of Origin) requirement for signed-off commits
- Dapr .NET SDK test directory structure — verified `test/Dapr.Client.Test/` and `test/Dapr.E2E.Test/` exist
- GitHub repository verification for all six SDK repos (dapr/dotnet-sdk, dapr/python-sdk, dapr/java-sdk, dapr/js-sdk, dapr/go-sdk, dapr/php-sdk)

## Issues Found

1. **Incorrect Python SDK client file path**: The post referenced `dapr/clients/grpc/_client.py` (with underscore prefix), but the actual file is `dapr/clients/grpc/client.py` (no underscore). Fixed the path in the code example.

2. **Async/sync mismatch in Python code example**: The code example used `async def` and `await` but was placed in the synchronous client file (`dapr/clients/grpc/client.py`). The Dapr Python SDK's `DaprClient` is synchronous; the async client is a separate class at `dapr/aio/clients/grpc/client.py`. Fixed by converting the example method and test to synchronous code, which matches the file path and is more representative of what a contributor would encounter.

3. **Incorrect Python dev setup command**: The post used `pip install -e ".[dev]"`, but the Dapr Python SDK does not define a `[dev]` extras group. The actual development setup uses `pip install -r dev-requirements.txt && pip install -e .`. Fixed the command.

4. **Test file name inconsistency**: The test code example header said `# tests/test_client.py` but the git add command staged `tests/test_bulk_get_state.py`. Fixed the code comment to match the staged file name (`tests/test_bulk_get_state.py`).

5. **PR title said "async method"**: Updated to "add bulk_get_state method" (removing "async") to match the corrected synchronous implementation.

## Review Notes
- The `bulk_get_state` example is illustrative — the actual Dapr Python SDK already has a `get_bulk_state` method (note the slightly different name). The post correctly frames this as a hypothetical ("Suppose `bulk_get_state` is missing").
- The gRPC stub call was updated from `await self._stub.GetBulkState(req, metadata=metadata)` to `self._stub.GetBulkState.with_call(req, metadata=metadata)` to match the synchronous gRPC calling pattern used in the actual Dapr Python SDK.
- All six SDK repository URLs are verified as real and active GitHub repositories under the `dapr` organization.
- The DCO signed-off commit requirement (`git commit -s`) is correct — Dapr enforces DCO via an automated bot check on PRs.
- The .NET SDK test directory paths (`test/Dapr.Client.Test/` and `test/Dapr.E2E.Test/`) are verified correct.
