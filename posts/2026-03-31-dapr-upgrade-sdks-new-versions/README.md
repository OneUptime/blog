# How to Upgrade Dapr SDKs to New Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SDK, Upgrade, Go, Python

Description: Learn how to upgrade Dapr language SDKs to new versions across Go, Python, Java, and JavaScript applications while managing breaking changes and maintaining compatibility.

---

## Dapr SDK Version Compatibility

Dapr SDKs have their own release cycle and may introduce breaking changes independently of the runtime. The general rule is that a Dapr SDK version should be compatible with runtime versions within the same major version. Always check the SDK compatibility matrix before upgrading.

Compatibility check:

```bash
# Check your current SDK versions
grep -r "dapr/go-sdk\|dapr-sdk\|dapr-client" \
  --include="go.mod" \
  --include="requirements.txt" \
  --include="package.json" \
  --include="pom.xml" \
  -l . 2>/dev/null

# List all Dapr SDK references
grep -r "dapr" --include="go.mod" . | head -20
```

## Upgrading the Go SDK

```bash
# Check current version
grep "dapr/go-sdk" go.mod

# Upgrade to new version
go get github.com/dapr/go-sdk@v1.11.0
go mod tidy

# Check for breaking changes by building
go build ./...

# Run tests to verify functionality
go test ./... -v -count=1
```

Choose the right state method for your use case - `SaveState` for simple writes and `SaveStateWithETag` for optimistic concurrency:

```go
// SaveState - use when ETags are not required
err := client.SaveState(ctx,
    "statestore",
    "key",
    data,
    map[string]string{"ttlInSeconds": "3600"},
)

// SaveStateWithETag - use for optimistic concurrency control
err := client.SaveStateWithETag(ctx,
    "statestore",
    "key",
    data,
    "etag-value",
    map[string]string{},
)
```

## Upgrading the Python SDK

```bash
# Check current version
pip show dapr | grep Version

# Upgrade
pip install --upgrade dapr==1.13.0

# Verify installation
python -c "import dapr; print(dapr.__version__)"

# Run tests
pytest tests/ -v
```

Migrate the async client pattern change:

```python
# Old pattern
from dapr.clients import DaprClient
client = DaprClient()
result = client.get_state("statestore", "key")
client.close()

# New pattern (recommended)
from dapr.clients import DaprClient
with DaprClient() as client:
    result = client.get_state(
        store_name="statestore",
        key="key"
    )
    print(result.data)
```

## Upgrading the JavaScript SDK

```bash
# Check current version
cat package.json | grep "@dapr/dapr"

# Upgrade
npm install @dapr/dapr@3.3.0

# Check for TypeScript compilation errors
npx tsc --noEmit

# Run tests
npm test
```

Handle the client instantiation change:

```javascript
// Old API
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient("localhost", "3500");

// New API (3.0+)
const { DaprClient, HttpMethod } = require("@dapr/dapr");
const client = new DaprClient({
    daprHost: "localhost",
    daprPort: "3500",
    communicationProtocol: "http"
});
```

## Upgrading the Java SDK

```xml
<!-- Update in pom.xml -->
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.12.0</version>
</dependency>
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-springboot</artifactId>
    <version>1.12.0</version>
</dependency>
```

```bash
# Build and check for compilation errors
mvn compile -q 2>&1 | grep -E "ERROR|WARNING" | head -20

# Run unit tests
mvn test
```

## CI/CD Pipeline for SDK Upgrades

Automate SDK version checks in your CI pipeline:

```yaml
# .github/workflows/sdk-upgrade-check.yaml
name: Check Dapr SDK Updates
on:
  schedule:
  - cron: "0 9 * * 1"
  workflow_dispatch: {}

jobs:
  check-sdk-versions:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Check Go SDK
      run: |
        LATEST=$(curl -s https://api.github.com/repos/dapr/go-sdk/releases/latest | jq -r '.tag_name')
        CURRENT=$(grep "dapr/go-sdk" go.mod | awk '{print $2}')
        echo "Current: $CURRENT, Latest: $LATEST"
        [ "$CURRENT" = "$LATEST" ] || echo "::warning::Go SDK update available: $LATEST"
```

## Summary

Upgrading Dapr SDKs requires checking the SDK compatibility matrix against your runtime version, running `go get`, `pip install --upgrade`, `npm install`, or Maven dependency updates followed by a compilation check and full test suite run. Address breaking changes by migrating to new API signatures as documented in SDK release notes. Automate weekly SDK version checks in CI to detect available upgrades early, and test SDK upgrades in isolation from runtime upgrades to keep the change surface small.
