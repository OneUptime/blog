# How to Contribute Dapr SDK Improvements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SDK, Contribution, Open Source, Development

Description: Contribute improvements to Dapr SDKs including adding missing API coverage, fixing bugs, writing tests, and updating examples across .NET, Python, Java, and Go SDKs.

---

## Dapr SDK Repositories

Each SDK is maintained in a separate repository:

```text
github.com/dapr/dotnet-sdk    # C# / .NET
github.com/dapr/python-sdk    # Python
github.com/dapr/java-sdk      # Java / Spring Boot
github.com/dapr/js-sdk        # JavaScript / TypeScript
github.com/dapr/go-sdk        # Go
github.com/dapr/php-sdk       # PHP
```

## Types of SDK Contributions

- Adding missing Dapr API coverage (new building block features)
- Fixing serialization or authentication bugs
- Improving error messages and exception types
- Adding integration tests
- Updating examples to reflect current API
- Improving TypeScript type definitions

## Set Up .NET SDK Development

```bash
# Clone the .NET SDK
git clone https://github.com/YOUR_USERNAME/dotnet-sdk.git
cd dotnet-sdk

# Install .NET SDK (check .github/workflows for required version)
dotnet --version

# Restore packages
dotnet restore

# Build
dotnet build

# Run unit tests
dotnet test test/Dapr.Client.Test/

# Run integration tests (requires running Dapr sidecar)
dotnet test test/Dapr.E2E.Test/
```

## Set Up Python SDK Development

```bash
git clone https://github.com/YOUR_USERNAME/python-sdk.git
cd python-sdk

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install development dependencies
pip install -r dev-requirements.txt && pip install -e .

# Run tests
python -m pytest tests/

# Run type checking
mypy dapr/
```

## Example: Adding a Missing Method to the Python SDK

Suppose `bulk_get_state` is missing. Add it to the client:

```python
# dapr/clients/grpc/client.py
def bulk_get_state(
    self,
    store_name: str,
    keys: List[str],
    metadata: Optional[MetadataTuple] = None,
) -> BulkStatesResponse:
    """Retrieve multiple state values in a single request."""
    req = api_v1.GetBulkStateRequest(
        store_name=store_name,
        keys=keys,
        parallelism=10,
    )
    response, call = self._stub.GetBulkState.with_call(req, metadata=metadata)
    return BulkStatesResponse(items=response.items)
```

Write the test:

```python
# tests/test_bulk_get_state.py
def test_bulk_get_state():
    with DaprClient() as client:
        # Save multiple states first
        client.save_state("statestore", "key1", "value1")
        client.save_state("statestore", "key2", "value2")

        # Bulk get
        response = client.bulk_get_state("statestore", ["key1", "key2"])

        assert len(response.items) == 2
        assert any(item.key == "key1" for item in response.items)
```

## Submitting the SDK PR

```bash
git checkout -b feat/python-sdk-bulk-get-state
git add dapr/clients/grpc/_client.py tests/test_bulk_get_state.py
git commit -s -m "feat(client): add bulk_get_state method"

gh pr create \
  --repo dapr/python-sdk \
  --title "feat(client): add bulk_get_state method" \
  --body "Adds missing bulk_get_state API coverage. Fixes #456.

## Changes
- Added bulk_get_state() to DaprClient
- Added corresponding tests

## Testing
- Unit tests pass: pytest tests/
- Manual integration test with Redis statestore verified"
```

## SDK Contribution Checklist

Before submitting:
- [ ] New methods have docstrings
- [ ] Tests cover success and error paths
- [ ] Changelog entry added (`CHANGELOG.md`)
- [ ] Examples updated if API surface changed
- [ ] CI passes (tests + linting)

## Summary

Contributing Dapr SDK improvements involves identifying missing API coverage or bugs, cloning the SDK repository, implementing changes with comprehensive tests, and submitting a signed-off pull request. SDK contributions have high impact as they directly affect developer experience for all Dapr users on that language platform.
