# How to Set Up a Dapr Test Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Test Environment, Testing, Local Development, CI/CD

Description: Learn how to set up a consistent Dapr test environment locally and in CI/CD with in-memory components, test configuration, and environment isolation strategies.

---

## What Makes a Good Dapr Test Environment?

A good Dapr test environment should be:
- Fast to start (no real external services when avoidable)
- Isolated (tests do not share state between runs)
- Consistent (same behavior locally and in CI)
- Configurable (swap components without code changes)

## Directory Structure

```text
myapp/
  src/           # application code
  tests/         # test projects
  components/
    production/  # real Redis, Kafka, Vault
    integration/ # local Redis via Docker
    test/        # in-memory components (no Docker needed)
  dapr.yaml      # multi-app run for local dev
  dapr-test.yaml # multi-app run for tests
```

## In-Memory Test Components

Use in-memory components for unit and fast integration tests:

```yaml
# components/test/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
```

```yaml
# components/test/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
```

```yaml
# components/test/secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./test-secrets.json"
```

## Dapr Multi-App Run for Tests

```yaml
# dapr-test.yaml
version: 1
common:
  resourcesPath: ./components/test

apps:
  - appID: order-service
    appDirPath: ./src/OrderService
    appPort: 5000
    daprHTTPPort: 3500
    logLevel: warn     # reduce test output noise
    command: ["dotnet", "run", "--environment", "Testing"]

  - appID: inventory-stub
    appDirPath: ./tests/Stubs/InventoryStub
    appPort: 5001
    daprHTTPPort: 3501
    logLevel: warn
    command: ["dotnet", "run"]
```

## Test Startup Script

```bash
#!/bin/bash
# scripts/test-setup.sh

echo "Starting Dapr test environment..."
dapr run -f dapr-test.yaml &
DAPR_PID=$!

echo "Waiting for services to be ready..."
until curl -sf http://localhost:5000/health > /dev/null; do
  sleep 0.5
done

echo "Running tests..."
dotnet test ./tests --filter "Category=Integration" \
  --logger "trx;LogFileName=test-results.trx"

TEST_EXIT=$?

echo "Stopping Dapr services..."
kill $DAPR_PID 2>/dev/null
dapr stop -f dapr-test.yaml 2>/dev/null

exit $TEST_EXIT
```

## CI/CD Pipeline Configuration

```yaml
# .github/workflows/test.yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '9.0.x'
    - name: Run unit tests
      run: dotnet test --filter "Category=Unit"

  integration-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install Dapr CLI
      run: wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
    - name: Initialize Dapr (slim)
      run: dapr init --slim
    - name: Run integration tests
      run: bash scripts/test-setup.sh
    - name: Upload test results
      uses: actions/upload-artifact@v4
      with:
        name: test-results
        path: tests/**/*.trx
```

## Dapr Init Slim Mode

For CI, use `dapr init --slim` which skips pulling Docker images and only installs the CLI binaries:

```bash
dapr init --slim
# Installs: daprd binary, placement service binary
# Skips: Redis Docker container, Zipkin container
```

## Health Check Helper

```csharp
// tests/Helpers/DaprHealthCheck.cs
public static class DaprHealthCheck
{
    public static async Task WaitForHealthyAsync(
        string baseUrl, int timeoutSeconds = 30)
    {
        using var client = new HttpClient();
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var response = await client.GetAsync($"{baseUrl}/health");
                if (response.IsSuccessStatusCode) return;
            }
            catch { }

            await Task.Delay(500);
        }

        throw new TimeoutException($"Service at {baseUrl} did not become healthy");
    }
}
```

## Summary

A well-organized Dapr test environment uses separate component directories for different test types, with in-memory components for fast integration tests and no Docker required. Dapr Multi-App Run handles starting all services and sidecars. In CI, `dapr init --slim` avoids Docker image pulls, and a shell script manages service lifecycle around the test runner.
