# How to Implement Retry Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Retry, Resiliency, Pattern, Microservice

Description: Learn how to configure Dapr's built-in retry policies to automatically handle transient failures in microservice communication without writing retry logic.

---

## Overview

Transient failures - network blips, temporary service unavailability, rate limiting responses - are common in distributed systems. Dapr's resiliency policies let you configure retry behavior declaratively, eliminating boilerplate retry loops in application code.

## Retry Policy Types

Dapr supports two retry backoff strategies:

- **Constant**: Fixed delay between retries (good for rate-limited APIs)
- **Exponential**: Increasing delay with jitter (good for transient failures)

## Configuring Retry Policies

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: retry-policies
  namespace: default
spec:
  policies:
    retries:
      # Exponential backoff for service calls
      service-retry:
        policy: exponential
        duration: 500ms      # Initial retry delay
        maxInterval: 30s     # Maximum delay between retries
        maxRetries: 5        # Maximum number of attempts
      # Constant retry for pub/sub
      pubsub-retry:
        policy: constant
        duration: 2s
        maxRetries: 10
      # Aggressive retry for critical operations
      critical-retry:
        policy: exponential
        duration: 100ms
        maxInterval: 5s
        maxRetries: -1       # Retry indefinitely
  targets:
    apps:
      inventory-service:
        retry: service-retry
      notification-service:
        retry: pubsub-retry
    components:
      payment-pubsub:
        outbound:
          retry: critical-retry
```

## Application Code - No Retry Logic Needed

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

func checkInventory(client dapr.Client, productID string, qty int) (bool, error) {
    // Dapr automatically retries on failure per policy
    result, err := client.InvokeMethodWithContent(
        context.Background(),
        "inventory-service",
        "/check",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data:        []byte(fmt.Sprintf(`{"productId":"%s","quantity":%d}`, productID, qty)),
        },
    )
    if err != nil {
        // All retries exhausted
        log.Printf("Inventory check failed after retries: %v", err)
        return false, err
    }

    var response struct{ Available bool }
    json.Unmarshal(result, &response)
    return response.Available, nil
}
```

## Per-Route Retry for Pub/Sub

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
      - match: 'event.type == "order.created"'
        path: /orders/created
      - match: 'event.type == "order.updated"'
        path: /orders/updated
    default: /orders/default
```

Configure retry behavior for the pub/sub component:

```yaml
  targets:
    components:
      pubsub:
        inbound:
          retry: pubsub-retry
```

## Idempotent Handlers for Retried Messages

Since retries may cause duplicate deliveries, make handlers idempotent:

```go
func handleOrder(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    // Check if already processed
    item, _ := daprClient.GetState(ctx, "statestore", "processed:order:"+order.ID, nil)
    if item.Value != nil {
        log.Printf("Order %s already processed, skipping", order.ID)
        return false, nil
    }

    // Process order
    if err := processOrder(order); err != nil {
        return true, err // Return true to trigger Dapr retry
    }

    // Mark as processed
    daprClient.SaveState(ctx, "statestore", "processed:order:"+order.ID, []byte("1"), nil)
    return false, nil
}
```

## Retry for State Store Operations

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: service-retry
          timeout: 5s
```

## Monitoring Retries

```bash
# Total retry attempts
dapr_resiliency_count{app_id="order-service",name="service-retry",policy="retry",flow_direction="outbound"}

# Failed after exhausting retries
dapr_resiliency_count{app_id="order-service",name="service-retry",policy="retry",flow_direction="outbound",status="closed"}
```

## Summary

Dapr's retry policies eliminate the need for manual retry logic in application code. Configuring exponential or constant backoff per service or component in a Resiliency CRD handles transient failures automatically. Idempotent message handlers ensure that retried messages don't cause duplicate processing, completing a reliable messaging pattern.
