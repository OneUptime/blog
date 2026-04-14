# How to Test Dapr Actors Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Testing, Unit Test, Integration Test

Description: Learn how to unit test Dapr actors with mocked state managers and run integration tests using the Dapr CLI with a local Redis state store.

---

Testing Dapr actors requires strategies for both unit testing (mocking the state manager) and integration testing (running with a real Dapr sidecar). This guide covers both approaches.

## Unit Testing Actors

Unit tests should avoid the Dapr sidecar entirely. Mock the state manager to test actor business logic in isolation.

### Mocking the State Manager in Go

```go
package main

import (
  "context"
  "encoding/json"
  "fmt"
)

// Simple in-memory state manager mock
type MockStateManager struct {
  store map[string]interface{}
}

func NewMockStateManager() *MockStateManager {
  return &MockStateManager{store: make(map[string]interface{})}
}

func (m *MockStateManager) Get(ctx context.Context, key string, out interface{}) error {
  val, ok := m.store[key]
  if !ok {
    return fmt.Errorf("key not found: %s", key)
  }
  // Use JSON round-trip for type conversion
  b, _ := json.Marshal(val)
  return json.Unmarshal(b, out)
}

func (m *MockStateManager) Set(ctx context.Context, key string, val interface{}) error {
  m.store[key] = val
  return nil
}

func (m *MockStateManager) Remove(ctx context.Context, key string) error {
  delete(m.store, key)
  return nil
}
```

### Writing Actor Unit Tests

```go
func TestCounterIncrement(t *testing.T) {
  actor := &CounterActor{}
  actor.SetStateManager(NewMockStateManager())

  ctx := context.Background()

  // Increment three times
  actor.Increment(ctx, &IncrementRequest{Amount: 5})
  actor.Increment(ctx, &IncrementRequest{Amount: 3})
  actor.Increment(ctx, &IncrementRequest{Amount: 2})

  result, err := actor.GetCount(ctx)
  if err != nil {
    t.Fatalf("GetCount failed: %v", err)
  }
  if result.Count != 10 {
    t.Errorf("Expected count 10, got %d", result.Count)
  }
}

func TestCounterNegativeAmount(t *testing.T) {
  actor := &CounterActor{}
  actor.SetStateManager(NewMockStateManager())

  err := actor.Increment(context.Background(), &IncrementRequest{Amount: -5})
  if err == nil {
    t.Error("Expected error for negative amount, got nil")
  }
}
```

## Integration Testing with the Dapr CLI

For integration tests, run the actual service with a Dapr sidecar:

```bash
# Start Redis for state store
docker run -d --name redis-test -p 6379:6379 redis:7-alpine

# Run the service with Dapr
dapr run --app-id counter-test \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./test/components \
  -- go run ./cmd/server
```

Test components configuration:

```yaml
# test/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: actorStateStore
    value: "true"
```

## Integration Test Script

```bash
#!/bin/bash
# test_actors.sh

BASE_URL="http://localhost:3500/v1.0/actors/Counter"

echo "Testing actor increment..."
curl -s -X POST "$BASE_URL/test-counter/method/Increment" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5}'

echo "Testing actor get count..."
RESULT=$(curl -s -X POST "$BASE_URL/test-counter/method/GetCount")
echo "Result: $RESULT"

COUNT=$(echo $RESULT | jq -r '.count')
if [ "$COUNT" != "5" ]; then
  echo "FAIL: Expected count 5, got $COUNT"
  exit 1
fi
echo "PASS: Count is $COUNT"
```

## Testing Actor Reminders

```go
func TestReminderFires(t *testing.T) {
  // Set a 1-second reminder and verify it fires
  // Use a channel to capture the reminder callback
  fired := make(chan string, 1)

  actor := &TaskActor{onReminder: func(name string) {
    fired <- name
  }}

  actor.ScheduleTask(context.Background(), &TaskRequest{
    Name:  "test-task",
    Delay: 1 * time.Second,
  })

  select {
  case name := <-fired:
    if name != "test-task" {
      t.Errorf("Wrong reminder name: %s", name)
    }
  case <-time.After(3 * time.Second):
    t.Error("Reminder did not fire within 3 seconds")
  }
}
```

## Summary

Effective Dapr actor testing combines unit tests with mocked state managers for business logic validation, and integration tests using the Dapr CLI with a local Redis instance for end-to-end verification. Unit tests run fast without any infrastructure, while integration tests verify actor routing, state persistence, and reminder scheduling under realistic conditions. Both test layers together provide confidence in actor correctness before deployment.
