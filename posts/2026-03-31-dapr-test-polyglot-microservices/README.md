# How to Test Polyglot Dapr Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Polyglot, Integration Test, Mock

Description: Test polyglot Dapr microservices using the Dapr testing harness, mock components, and integration test patterns that work across Python, Go, Java, and Node.js services.

---

Testing polyglot Dapr microservices requires strategies that work at multiple levels: unit tests with mocked Dapr clients, component-level tests with real infrastructure, and end-to-end integration tests spanning multiple services.

## Unit Testing with Mocked Dapr Client

### Python Unit Test

Mock the Dapr HTTP API calls to test business logic in isolation:

```python
# test_order_service.py
import pytest
from unittest.mock import patch, Mock
from app import create_order_logic

def test_create_order_publishes_event():
    with patch('requests.post') as mock_post:
        mock_post.return_value = Mock(status_code=204)

        result = create_order_logic({'item': 'widget', 'quantity': 1})

        assert result['status'] == 'pending'
        # Verify Dapr pub/sub was called
        call_args = mock_post.call_args
        assert 'publish' in call_args[0][0]
        assert call_args[1]['json']['item'] == 'widget'
```

### Go Unit Test

```go
// order_test.go
package main

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

type MockDaprClient struct {
    mock.Mock
}

func (m *MockDaprClient) SaveState(ctx context.Context, storeName, key string, value interface{}, meta map[string]string) error {
    args := m.Called(ctx, storeName, key, value, meta)
    return args.Error(0)
}

func TestSaveOrderState(t *testing.T) {
    mockClient := new(MockDaprClient)
    mockClient.On("SaveState", mock.Anything, "statestore", "order:123", mock.Anything, mock.Anything).
        Return(nil)

    err := saveOrder(mockClient, "123", OrderData{Item: "widget"})

    assert.NoError(t, err)
    mockClient.AssertExpectations(t)
}
```

## Integration Testing with Dapr Test Kit

Use the official Dapr test utilities for Go:

```go
// integration_test.go
//go:build integration

package integration

import (
    "context"
    "encoding/json"
    "testing"
    "github.com/dapr/go-sdk/client"
    "github.com/stretchr/testify/assert"
)

func TestStateRoundTrip(t *testing.T) {
    c, err := client.NewClient()
    if err != nil {
        t.Skip("Dapr not available, skipping integration test")
    }
    defer c.Close()

    ctx := context.Background()
    key := "test-key-" + t.Name()
    value := map[string]string{"test": "value"}
    data, err := json.Marshal(value)
    assert.NoError(t, err)

    err = c.SaveState(ctx, "statestore", key, data, nil)
    assert.NoError(t, err)

    result, err := c.GetState(ctx, "statestore", key, nil)
    assert.NoError(t, err)
    assert.NotNil(t, result.Value)

    // Cleanup
    c.DeleteState(ctx, "statestore", key, nil)
}
```

Run integration tests with:

```bash
go test -tags=integration -v ./...
```

## End-to-End Testing with Docker Compose

Run all services together for E2E tests using Docker Compose with Dapr sidecars:

```yaml
# docker-compose.test.yml
services:
  redis:
    image: redis:7
    ports:
    - "6379:6379"

  order-service-python:
    build: ./order-service
    environment:
      DAPR_HTTP_PORT: "3500"
    depends_on:
      - redis

  dapr-order:
    image: daprio/daprd:latest
    command: ["./daprd",
      "--app-id", "order-service",
      "--app-port", "5000",
      "--components-path", "/components",
      "--config", "/config/config.yaml"
    ]
    volumes:
    - ./components:/components
    - ./config:/config
    network_mode: "service:order-service-python"
    depends_on:
      - order-service-python
```

## Java Integration Test with Test Containers

```java
@SpringBootTest
@Testcontainers
class OrderSubscriberTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7")
        .withExposedPorts(6379);

    @Test
    void shouldProcessOrderEvent() {
        // Simulate Dapr delivering a CloudEvent
        CloudEvent<Order> event = new CloudEvent<>();
        event.setData(new Order("ord-001", "widget", 2));

        ResponseEntity<String> response = orderSubscriber.handleOrder(event);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUCCESS", response.getBody());
    }
}
```

## Validating Cross-Service Flows

Write a test that exercises the full Python -> Dapr -> Java path:

```bash
#!/bin/bash
# e2e-test.sh
BASE_URL="http://localhost"

echo "Publishing order from Python service..."
RESPONSE=$(curl -s -X POST "$BASE_URL:5000/orders" \
  -H "Content-Type: application/json" \
  -d '{"item": "widget", "quantity": 1}')
ORDER_ID=$(echo $RESPONSE | jq -r '.id')

echo "Waiting for Java service to process..."
sleep 2

echo "Checking order status via Java service..."
STATUS=$(curl -s "$BASE_URL:8080/orders/$ORDER_ID" | jq -r '.status')

if [ "$STATUS" == "processed" ]; then
  echo "E2E test PASSED"
else
  echo "E2E test FAILED: expected 'processed', got '$STATUS'"
  exit 1
fi
```

## Summary

Testing polyglot Dapr microservices combines language-native unit tests with mocked Dapr clients, Go integration tests using the Dapr test utilities, and end-to-end tests using Docker Compose or Kubernetes namespaces. Running integration tests against real Dapr components catches issues that mocks cannot reveal, while E2E tests validate cross-language communication paths.
