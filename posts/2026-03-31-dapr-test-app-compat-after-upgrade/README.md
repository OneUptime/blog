# How to Test Application Compatibility After Dapr Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Compatibility, Upgrade, Integration Test

Description: Learn how to systematically test application compatibility after a Dapr runtime upgrade, covering API behavior, state store operations, and end-to-end workflow validation.

---

## Application Compatibility Testing Strategy

After upgrading Dapr, applications may exhibit subtle behavioral changes even if they compile and start successfully. Compatibility testing goes beyond unit tests to verify that all Dapr building blocks function correctly with the new runtime in realistic scenarios.

## Building a Compatibility Test Suite

Create a dedicated compatibility test suite that exercises all Dapr building blocks your application uses:

```python
# tests/compat/test_dapr_compat.py
import pytest
import httpx
import time
import json
from dapr.clients import DaprClient

DAPR_HTTP = "http://localhost:3500"

class TestStateStoreCompat:

    def test_basic_crud(self):
        with DaprClient() as client:
            # Save
            client.save_state("statestore", "compat-test-key", "test-value")
            # Get
            result = client.get_state("statestore", "compat-test-key")
            assert result.data == b"test-value"
            # Delete
            client.delete_state("statestore", "compat-test-key")
            deleted = client.get_state("statestore", "compat-test-key")
            assert deleted.data == b""

    def test_bulk_state_operations(self):
        with DaprClient() as client:
            keys = [f"bulk-{i}" for i in range(10)]
            # Save bulk
            for k in keys:
                client.save_state("statestore", k, f"value-{k}")
            # Get bulk
            results = client.get_bulk_state("statestore", keys, parallelism=5)
            assert len(results.items) == 10

    def test_state_ttl(self):
        with DaprClient() as client:
            client.save_state("statestore", "ttl-test", "expires-soon",
                state_metadata={"ttlInSeconds": "2"})
            time.sleep(3)
            result = client.get_state("statestore", "ttl-test")
            # TTL behavior may change between versions - verify
            assert result.data is None or result.data == b""

class TestPubSubCompat:

    def test_publish_and_receive(self):
        received = []

        with DaprClient() as client:
            client.publish_event(
                pubsub_name="pubsub",
                topic_name="compat-test",
                data=json.dumps({"test": "compat", "timestamp": time.time()}),
                data_content_type="application/json"
            )

        # Wait for message to be received by subscriber
        time.sleep(2)
        # Verify via the subscriber's state (it saves received messages)
        with DaprClient() as client:
            result = client.get_state("statestore", "last-compat-message")
            assert result.data is not None

class TestServiceInvocationCompat:

    def test_invoke_method(self):
        with DaprClient() as client:
            response = client.invoke_method(
                app_id="target-service",
                method_name="health",
                http_verb="GET"
            )
            # invoke_method raises DaprInternalError on failure
            assert response is not None
```

## Running Compatibility Tests

```bash
#!/bin/bash
# run-compat-tests.sh

DAPR_VERSION=$(kubectl get pods -n dapr-system \
  -o jsonpath='{.items[0].spec.containers[0].image}' | \
  awk -F: '{print $2}')

echo "=== Running Compatibility Tests for Dapr $DAPR_VERSION ==="

# Port forward to test service
kubectl port-forward -n production deployment/test-service 3500:3500 &
PF_PID=$!
sleep 3

# Run the compatibility test suite
pytest tests/compat/ -v \
  --junitxml=reports/compat-$DAPR_VERSION.xml \
  --html=reports/compat-$DAPR_VERSION.html \
  --self-contained-html

TEST_EXIT=$?
kill $PF_PID 2>/dev/null

echo "Compatibility tests completed with exit code $TEST_EXIT"
exit $TEST_EXIT
```

## Behavioral Regression Tests

Test for behavioral changes beyond just pass/fail:

```go
// compat_test.go
package compat_test

import (
    "context"
    "testing"
    dapr "github.com/dapr/go-sdk/client"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestStateConsistency(t *testing.T) {
    client, err := dapr.NewClient()
    require.NoError(t, err)
    defer client.Close()

    ctx := context.Background()
    key := "consistency-test"

    // Write with strong consistency
    err = client.SaveState(ctx, "statestore", key, []byte("v1"), nil)
    require.NoError(t, err)

    // Immediate read should return latest value
    result, err := client.GetState(ctx, "statestore", key, nil)
    require.NoError(t, err)
    assert.Equal(t, []byte("v1"), result.Value,
        "Immediate read after write should return latest value")

    _ = client.DeleteState(ctx, "statestore", key, nil)
}
```

## Generating Compatibility Reports

```bash
# Generate a comparison report across versions
diff \
  reports/compat-1.13.0.xml \
  reports/compat-1.14.0.xml \
  | grep "testcase\|failure" || echo "No test behavior changes detected"
```

## Summary

Application compatibility testing after Dapr upgrades requires a dedicated test suite that exercises all Dapr building blocks - state CRUD, bulk operations, TTL behavior, pub/sub publish/subscribe, and service invocation. Run the test suite against the upgraded staging environment before production promotion, generate XML and HTML reports as upgrade evidence, and compare test results across versions to detect behavioral regressions. Pay special attention to edge cases like TTL expiry behavior and etag handling, as these are commonly affected by runtime version changes.
