# How to Implement Circuit Breaker Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Circuit Breaker, Resiliency, Pattern, Microservice

Description: Learn how to implement the circuit breaker pattern using Dapr's built-in resiliency policies to prevent cascading failures across microservices.

---

## Overview

The circuit breaker pattern prevents cascading failures by stopping requests to a failing service and allowing it time to recover. Dapr implements circuit breakers declaratively through resiliency policies - no library imports needed in your application code.

## Circuit Breaker States

- **Closed**: Normal operation, requests pass through
- **Open**: Service is failing, requests fail fast without calling the service
- **Half-Open**: Testing recovery, limited requests allowed through

## Configuring a Circuit Breaker

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cb-resiliency
  namespace: default
spec:
  policies:
    circuitBreakers:
      payment-circuit-breaker:
        maxRequests: 1        # Requests allowed in half-open state
        interval: 30s         # Time to reset consecutive failure count
        timeout: 60s          # Time to stay open before trying half-open
        trip: consecutiveFailures >= 5
      loose-circuit-breaker:
        maxRequests: 3
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 10
  targets:
    apps:
      payment-service:
        circuitBreaker: payment-circuit-breaker
      notification-service:
        circuitBreaker: loose-circuit-breaker
```

## Application Code with Circuit Breaker

Your code calls the service normally - Dapr handles the circuit breaker logic:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

type CheckoutService struct {
    dapr dapr.Client
}

func (svc *CheckoutService) ProcessPayment(orderID string, amount float64) error {
    result, err := svc.dapr.InvokeMethodWithContent(
        context.Background(),
        "payment-service",
        "/process",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data: []byte(fmt.Sprintf(
                `{"orderId":"%s","amount":%.2f}`, orderID, amount,
            )),
        },
    )

    if err != nil {
        // Circuit breaker open: fail fast, queue for retry
        log.Printf("Payment service unavailable (circuit open or failure): %v", err)
        return svc.handlePaymentFailure(orderID, amount)
    }

    log.Printf("Payment processed: %s", result)
    return nil
}

func (svc *CheckoutService) handlePaymentFailure(orderID string, amount float64) error {
    // Save to retry queue using Dapr state
    svc.dapr.SaveState(
        context.Background(),
        "statestore",
        "retry:payment:"+orderID,
        []byte(fmt.Sprintf(`{"amount":%.2f,"attempts":0}`, amount)),
        nil,
    )
    return errors.New("payment queued for retry")
}
```

## Combining Circuit Breaker with Retry and Timeout

```yaml
spec:
  policies:
    timeouts:
      payment-timeout: 3s
    retries:
      payment-retry:
        policy: exponential
        duration: 1s
        maxInterval: 8s
        maxRetries: 3
    circuitBreakers:
      payment-cb:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 3
  targets:
    apps:
      payment-service:
        timeout: payment-timeout
        retry: payment-retry
        circuitBreaker: payment-cb
```

With this configuration, Dapr will:
1. Time out requests after 3 seconds
2. Retry up to 3 times with exponential backoff
3. Open the circuit after 3 consecutive failures
4. Wait 60 seconds before testing recovery

## Monitoring Circuit Breaker State

Check circuit breaker metrics via Prometheus:

```bash
# Circuit breaker state changes
dapr_resiliency_count{app_id="checkout-service",name="payment-cb",flow_direction="outbound"}

# Failed requests
dapr_resiliency_count{app_id="checkout-service",policy="circuitbreaker",status="open"}
```

## Testing Circuit Breaker Behavior

```bash
# Simulate payment service failure
kubectl scale deployment payment-service --replicas=0

# Send requests - observe circuit opening after 5 failures
for i in {1..10}; do
  curl -X POST http://localhost:8080/checkout \
    -d '{"orderId":"test-'$i'","amount":100}'
  sleep 0.5
done

# Restore service - circuit should close after timeout
kubectl scale deployment payment-service --replicas=1
```

## Summary

Dapr's circuit breaker pattern is implemented declaratively through Resiliency CRDs, requiring no changes to application code. By configuring trip conditions, timeout intervals, and half-open test requests, you protect your microservices from cascading failures. Combined with retry and timeout policies, Dapr provides a complete resilience toolkit that can be tuned per target service without redeployment.
