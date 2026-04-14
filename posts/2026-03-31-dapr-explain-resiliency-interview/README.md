# How to Explain Dapr Resiliency in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Interview, Microservice, Fault Tolerance

Description: Learn how to articulate Dapr resiliency policies in interviews, covering retries, circuit breakers, and timeouts with clear technical explanations.

---

## What Is Dapr Resiliency?

Dapr Resiliency is a built-in capability that applies fault-tolerance policies to service-to-service calls, pub/sub subscriptions, and component interactions - without changing application code. When an interviewer asks about resiliency in Dapr, the key point is that policies are declarative and externalized from application logic.

```bash
# Verify Dapr supports resiliency (v1.7+)
dapr --version
# dapr runtime version: 1.14.x
```

## Three Core Policy Types

**Retries**: Automatically retry failed operations with configurable backoff.

**Circuit Breakers**: Stop sending requests to a failing service after a threshold, allowing it time to recover.

**Timeouts**: Limit how long an operation can take before failing fast.

```yaml
# resiliency.yaml - Dapr resiliency policy
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    retries:
      retryForever:
        policy: exponential
        maxInterval: 15s
        maxRetries: 10
    circuitBreakers:
      simpleCB:
        maxRequests: 1
        interval: 5s
        timeout: 30s
        trip: consecutiveFailures >= 5
    timeouts:
      general: 5s

  targets:
    apps:
      payment-service:
        retry: retryForever
        circuitBreaker: simpleCB
        timeout: general
    components:
      kafka-pubsub:
        inbound:
          retry: retryForever
```

## How to Explain Retry Policies

Walk through the retry configuration clearly:

- **`policy: constant`** - Fixed interval between attempts
- **`policy: exponential`** - Doubling delay (good for transient faults)
- **`maxRetries`** - Limit total attempts (-1 for infinite)
- **`maxInterval`** - Cap the backoff ceiling

```yaml
retries:
  my-retry-policy:
    policy: exponential
    initialInterval: 100ms
    maxInterval: 10s
    maxRetries: 5
    matching:
      httpStatusCodes: "429,500-599"
      gRPCStatusCodes: "14,2"
```

## Circuit Breaker States

Explain the three circuit breaker states:

1. **Closed** - Normal operation, requests flow through
2. **Open** - Requests fail immediately without hitting the downstream service
3. **Half-Open** - A probe request tests if the service has recovered

```bash
# Apply resiliency policy to a running Dapr app
kubectl apply -f resiliency.yaml -n production
# Verify the policy is loaded
kubectl get resiliency -n production
```

## Interview Framing: Benefits Over Custom Code

Emphasize to interviewers that Dapr resiliency shifts fault-tolerance from application code to infrastructure configuration:

- No retry loops in business logic
- Consistent policy across polyglot services
- Ops teams can tune policies without code changes
- Resiliency applies to component interactions too (state stores, message brokers)

```go
// Without Dapr - manual retry logic in Go
func callWithRetry(ctx context.Context, url string) error {
    for i := 0; i < 5; i++ {
        resp, err := http.Get(url)
        if err == nil && resp.StatusCode < 500 {
            return nil
        }
        time.Sleep(time.Duration(i*2) * time.Second) // manual backoff
    }
    return fmt.Errorf("max retries exceeded")
}

// With Dapr - just make the call, policy handles the rest
func callService(ctx context.Context, client dapr.Client) error {
    resp, err := client.InvokeMethod(ctx, "payment-service", "charge", "GET")
    return err // Dapr applies retry + circuit breaker transparently
}
```

## Summary

Dapr Resiliency provides declarative retry, circuit breaker, and timeout policies applied transparently to all Dapr building block interactions. In interviews, highlight that resiliency policies are externalized from application code, making them configurable per environment without deployment. This separation of concerns is a major architectural advantage in polyglot microservice systems.
