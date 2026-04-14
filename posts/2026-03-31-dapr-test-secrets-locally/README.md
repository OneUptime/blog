# How to Test Dapr Secrets Management Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Secret Management, Local Development, Developer Experience

Description: Learn how to write unit and integration tests for Dapr secrets management using mocks, local stores, and the Dapr test SDK.

---

Testing code that relies on Dapr Secrets Management requires a strategy that avoids hitting real secret backends in CI pipelines while still validating that your secret retrieval logic works correctly. This guide covers unit testing with mocks, integration testing with the local file store, and end-to-end testing with a real Dapr sidecar.

## Unit Testing with Mocks

Mock the Dapr client in unit tests to avoid any network calls:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from your_app.config import get_db_password

@pytest.fixture
def mock_dapr_client(monkeypatch):
    mock_client = MagicMock()
    mock_client.get_secret = AsyncMock(return_value={"db-password": "test-password"})
    monkeypatch.setattr("your_app.config.DaprClient", lambda: mock_client)
    return mock_client

@pytest.mark.asyncio
async def test_get_db_password_returns_secret(mock_dapr_client):
    password = await get_db_password()
    assert password == "test-password"
    mock_dapr_client.get_secret.assert_called_once_with("mystore", "db-password")
```

For Node.js with Jest:

```javascript
jest.mock('@dapr/dapr', () => ({
  DaprClient: jest.fn().mockImplementation(() => ({
    secret: {
      get: jest.fn().mockResolvedValue({ 'api-key': 'test-api-key' })
    }
  }))
}));

const { getApiKey } = require('./config');

test('getApiKey returns secret from Dapr store', async () => {
  const key = await getApiKey();
  expect(key).toBe('test-api-key');
});
```

## Integration Testing with Local File Store

Use the local file secret store for integration tests in CI:

```bash
# Create test secrets file for CI
cat > /tmp/test-secrets.json <<'EOF'
{
  "db-password": "ci-test-password",
  "api-key": "ci-test-api-key"
}
EOF
```

Test-specific component:

```yaml
# test/components/local-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mystore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "/tmp/test-secrets.json"
```

Run tests with Dapr:

```bash
dapr run \
  --app-id test-service \
  --app-port 3001 \
  --dapr-http-port 3501 \
  --resources-path ./test/components \
  -- pytest tests/integration/
```

## Testing Secret Scoping Enforcement

Test that your scoping rules actually block access:

```bash
# In a separate terminal, run a service that should NOT have access
dapr run --app-id unauthorized-service -- \
  curl http://localhost:3500/v1.0/secrets/mystore/db-password

# Expected: 403 Forbidden
```

## GitHub Actions CI Integration

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Dapr CLI
        run: |
          wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh
          bash install.sh
          dapr init
      - name: Create test secrets
        run: |
          echo '{"db-password":"ci-pass","api-key":"ci-key"}' > /tmp/test-secrets.json
      - name: Run integration tests
        run: |
          dapr run --app-id my-service \
            --resources-path ./test/components \
            -- go test ./... -v
```

## Summary

Testing Dapr Secrets Management requires a three-tier approach: unit tests with client mocks for fast feedback, integration tests using the local file secret store in CI pipelines, and end-to-end tests against a real sidecar for validating scoping and backend connectivity. This strategy ensures secret retrieval logic is well-tested without requiring real credentials in your CI environment.
