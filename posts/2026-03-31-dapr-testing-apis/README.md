# How to Test APIs Built with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, API, Unit Test, Integration Test

Description: Learn strategies for unit testing, integration testing, and end-to-end testing of Dapr-based APIs using mocks, the Dapr test client, and real sidecars.

---

## Testing Challenges with Dapr

Dapr injects a sidecar into your application and exposes building blocks via HTTP/gRPC. Testing Dapr apps requires a strategy for each level: unit tests that mock the Dapr client, integration tests with a real sidecar running locally, and end-to-end tests in Kubernetes.

## Unit Testing with Mocked Dapr Client

The official Dapr SDKs expose interfaces that you can mock. In Go, use the `dapr/go-sdk` mock client:

```go
package main_test

import (
    "context"
    "testing"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

type MockDaprClient struct {
    mock.Mock
}

func (m *MockDaprClient) SaveState(ctx context.Context, storeName, key string, data []byte, meta map[string]string, so ...dapr.StateOption) error {
    args := m.Called(ctx, storeName, key, data, meta, so)
    return args.Error(0)
}

func TestSaveOrder(t *testing.T) {
    mockClient := new(MockDaprClient)
    mockClient.On("SaveState", mock.Anything, "statestore", "order-123", mock.Anything, mock.Anything, mock.Anything).Return(nil)

    err := SaveOrder(mockClient, "order-123", map[string]interface{}{"product": "widget"})
    assert.NoError(t, err)
    mockClient.AssertExpectations(t)
}
```

## Integration Testing with a Real Sidecar

For integration tests, start your app and Dapr sidecar together using `dapr run`, then issue HTTP requests:

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./test/components \
  -- go run ./cmd/server
```

Create test components that point to local dependencies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

Then run tests that call through Dapr's HTTP API:

```go
func TestCreateOrderIntegration(t *testing.T) {
    resp, err := http.Post(
        "http://localhost:3500/v1.0/invoke/order-service/method/orders",
        "application/json",
        strings.NewReader(`{"order_id":"test-1","product":"widget","quantity":3}`),
    )
    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
}
```

## Unit Testing Dapr in Python with Mocks

You can unit test Dapr Python apps by mocking the `DaprClient` using standard `unittest.mock`:

```python
from dapr.clients import DaprClient
from unittest.mock import MagicMock, patch

def test_publish_event():
    with patch('dapr.clients.DaprClient') as mock_client_class:
        mock_instance = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_instance
        mock_instance.publish_event.return_value = None

        with DaprClient() as client:
            client.publish_event(
                pubsub_name='rabbitmq-pubsub',
                topic_name='orders',
                data=b'{"order_id": "123"}'
            )

        mock_instance.publish_event.assert_called_once()
```

## End-to-End Testing with Helm and Kind

For full end-to-end tests in CI, use a local Kubernetes cluster with Kind:

```bash
kind create cluster --name dapr-test
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr --namespace dapr-system --create-namespace --wait

kubectl apply -f ./k8s/test/
kubectl wait --for=condition=ready pod -l app=order-service --timeout=60s

# Run tests against the cluster
go test ./e2e/... -v -tags=e2e
```

## Summary

Dapr APIs are testable at every level by leveraging mock clients for unit tests, real sidecars with local components for integration tests, and Kind clusters for end-to-end tests. The key is isolating Dapr building blocks at the right boundary so tests remain fast and reproducible without sacrificing confidence in the full system.
