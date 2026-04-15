# How to Implement Circuit Breaker Threshold Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Circuit Breaker, Resiliency, Configuration, Microservice

Description: Dynamically tune Dapr circuit breaker thresholds at runtime using the Configuration API so you can harden or relax resilience policies without redeployment.

---

## Why Tune Circuit Breakers Dynamically?

Circuit breaker thresholds that work under normal load may be too aggressive during maintenance windows or too lenient during traffic spikes. Dapr's Configuration API lets you update thresholds without changing the resiliency manifest or restarting pods.

## Default Resiliency Policy

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
spec:
  policies:
    circuitBreakers:
      payment-cb:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payment-service:
        circuitBreaker: payment-cb
```

## Storing Threshold Config in Redis

```bash
redis-cli MSET \
  "payment-service:consecutiveFailures" "5||" \
  "payment-service:timeout" "30||" \
  "payment-service:maxRequests" "1||"
```

## Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cb-config
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Dynamic Circuit Breaker Manager

```go
package cb

import (
    "context"
    "fmt"
    "strconv"
    "sync"
    "time"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/sony/gobreaker"
)

type DynamicCB struct {
    mu          sync.RWMutex
    breaker     *gobreaker.CircuitBreaker
    service     string
    maxFails    uint32
    timeout     time.Duration
    daprClient  dapr.Client
}

func NewDynamicCB(client dapr.Client, service string) *DynamicCB {
    dcb := &DynamicCB{
        service:    service,
        maxFails:   5,
        timeout:    30 * time.Second,
        daprClient: client,
    }
    dcb.rebuildBreaker()
    go dcb.watchThresholds()
    return dcb
}

func (d *DynamicCB) rebuildBreaker() {
    d.mu.Lock()
    defer d.mu.Unlock()
    d.breaker = gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        d.service,
        MaxRequests: 1,
        Interval:    10 * time.Second,
        Timeout:     d.timeout,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            return counts.ConsecutiveFailures >= d.maxFails
        },
    })
    fmt.Printf("Circuit breaker rebuilt: maxFails=%d, timeout=%s\n", d.maxFails, d.timeout)
}

func (d *DynamicCB) watchThresholds() {
    ctx := context.Background()
    d.daprClient.SubscribeConfigurationItems(ctx, "cb-config",
        []string{
            fmt.Sprintf("%s:consecutiveFailures", d.service),
            fmt.Sprintf("%s:timeout", d.service),
        },
        func(id string, items map[string]*dapr.ConfigurationItem) {
            for key, item := range items {
                switch {
                case key == fmt.Sprintf("%s:consecutiveFailures", d.service):
                    if v, err := strconv.Atoi(item.Value); err == nil {
                        d.maxFails = uint32(v)
                    }
                case key == fmt.Sprintf("%s:timeout", d.service):
                    if v, err := strconv.Atoi(item.Value); err == nil {
                        d.timeout = time.Duration(v) * time.Second
                    }
                }
            }
            d.rebuildBreaker()
        })
}

func (d *DynamicCB) Execute(fn func() (interface{}, error)) (interface{}, error) {
    d.mu.RLock()
    cb := d.breaker
    d.mu.RUnlock()
    return cb.Execute(fn)
}
```

## Adjusting Thresholds at Runtime

```bash
# During maintenance: be more tolerant of failures
redis-cli SET "payment-service:consecutiveFailures" "20||"
redis-cli SET "payment-service:timeout" "60||"

# After maintenance: restore strict thresholds
redis-cli SET "payment-service:consecutiveFailures" "5||"
redis-cli SET "payment-service:timeout" "30||"
```

## Summary

Combining Dapr's built-in Resiliency policies with dynamic Configuration API thresholds gives you the best of both worlds: a declarative default policy that applies automatically, plus the ability to tune thresholds live during incidents or maintenance. The pattern avoids dangerous "circuit breaker bypass" hacks by adjusting the trip conditions rather than disabling the breaker entirely.
