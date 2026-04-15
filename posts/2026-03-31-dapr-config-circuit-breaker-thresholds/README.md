# How to Use Dapr Configuration for Circuit Breaker Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Circuit Breaker, Resiliency, Redis

Description: Store and dynamically update circuit breaker thresholds using the Dapr Configuration API, allowing real-time tuning of failure tolerance without redeployment.

---

Circuit breakers protect services from cascading failures by stopping calls to unhealthy dependencies. Hard-coding thresholds means you must redeploy to tune them. Using the Dapr Configuration API, you can store circuit breaker parameters in a config store and subscribe to updates so services adapt at runtime.

## Component Definition

Create a configuration store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cbconfig
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

## Seeding Circuit Breaker Parameters

Store threshold values in Redis:

```bash
redis-cli MSET \
  "payment-service||cb-failure-threshold" "{\"value\":\"5\",\"version\":\"1\"}" \
  "payment-service||cb-success-threshold" "{\"value\":\"2\",\"version\":\"1\"}" \
  "payment-service||cb-timeout-ms" "{\"value\":\"30000\",\"version\":\"1\"}" \
  "payment-service||cb-half-open-max-calls" "{\"value\":\"3\",\"version\":\"1\"}"
```

## Reading Configuration at Startup

Load circuit breaker settings when the service initializes:

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

var cbConfig = map[string]string{}

func loadCBConfig(client dapr.Client) error {
    keys := []string{
        "cb-failure-threshold",
        "cb-success-threshold",
        "cb-timeout-ms",
        "cb-half-open-max-calls",
    }
    items, err := client.GetConfigurationItems(context.Background(), "cbconfig", keys)
    if err != nil {
        return err
    }
    for k, v := range items {
        cbConfig[k] = v.Value
        fmt.Printf("Loaded: %s = %s\n", k, v.Value)
    }
    return nil
}
```

## Subscribing to Threshold Updates

Watch for changes and reload the circuit breaker:

```go
func watchCBConfig(client dapr.Client) {
    keys := []string{
        "cb-failure-threshold",
        "cb-success-threshold",
        "cb-timeout-ms",
        "cb-half-open-max-calls",
    }
    _, err := client.SubscribeConfigurationItems(
        context.Background(),
        "cbconfig",
        keys,
        func(id string, items map[string]*dapr.ConfigurationItem) {
            for k, v := range items {
                cbConfig[k] = v.Value
                fmt.Printf("CB config updated: %s = %s\n", k, v.Value)
            }
            reloadCircuitBreaker()
        },
    )
    if err != nil {
        panic(err)
    }
    // To unsubscribe, cancel the context passed to SubscribeConfigurationItems.
}
```

## Applying Config to a Circuit Breaker

Use the loaded values to configure a circuit breaker library:

```go
import "github.com/sony/gobreaker"
import "strconv"
import "time"

func reloadCircuitBreaker() *gobreaker.CircuitBreaker {
    failThreshold, _ := strconv.Atoi(cbConfig["cb-failure-threshold"])
    timeoutMs, _ := strconv.Atoi(cbConfig["cb-timeout-ms"])
    halfOpenMax, _ := strconv.Atoi(cbConfig["cb-half-open-max-calls"])

    settings := gobreaker.Settings{
        Name:        "payment-service",
        MaxRequests: uint32(halfOpenMax),
        Timeout:     time.Duration(timeoutMs) * time.Millisecond,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            return counts.ConsecutiveFailures >= uint32(failThreshold)
        },
    }
    return gobreaker.NewCircuitBreaker(settings)
}
```

## Adjusting Thresholds Without Redeployment

Increase the failure threshold during a planned maintenance window:

```bash
redis-cli SET "payment-service||cb-failure-threshold" "{\"value\":\"10\",\"version\":\"2\"}"
```

The subscription triggers `reloadCircuitBreaker()`, and the updated breaker takes effect immediately.

## Summary

Storing circuit breaker thresholds in the Dapr Configuration API decouples tuning from deployment. Services subscribe to key changes and reconfigure their circuit breakers at runtime, allowing operators to raise or lower failure tolerances in response to incidents or capacity changes. This approach works with any circuit breaker library and any Dapr-supported configuration store.
