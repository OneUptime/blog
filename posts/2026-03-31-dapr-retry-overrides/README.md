# How to Use Retry Overrides in Dapr Resiliency Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Override, Configuration

Description: Learn how to use per-target retry overrides in Dapr Resiliency resources to customize retry behavior for individual services without duplicating policy definitions.

---

## Overview

Dapr Resiliency resources allow you to define a set of reusable named policies and then selectively apply them per target. When you need slightly different retry behavior for specific services, you can assign different policies per target rather than modifying a shared policy. This keeps your resiliency configuration clean and avoids duplicating similar policies.

## The Concept of Policy Overrides

In Dapr, "override" means assigning a different named policy to a specific target than the default. You define multiple named policies and then reference the appropriate one per target:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: tiered-resiliency
  namespace: default
spec:
  policies:
    retries:
      # Base policy - used by most services
      standardRetry:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5

      # Override for critical services - faster, fewer retries
      criticalRetry:
        policy: constant
        duration: 200ms
        maxRetries: 2

      # Override for idempotent batch jobs - more patient
      batchRetry:
        policy: exponential
        maxInterval: 300s
        maxRetries: 20

      # Override for rate-limited external APIs
      rateLimitRetry:
        policy: constant
        duration: 1s
        maxRetries: 3
```

## Applying Different Policies Per Target

Reference the correct policy for each target:

```yaml
  targets:
    apps:
      payment-service:
        retry: criticalRetry
      report-generator:
        retry: batchRetry
      stripe-api:
        retry: rateLimitRetry
      inventory-service:
        retry: standardRetry
```

`payment-service` uses `criticalRetry` (fail fast with 2 retries), while `report-generator` uses `batchRetry` (patient with 20 retries). Services not listed in the targets section use Dapr's built-in retry behavior. To override the built-in default for all service-to-service calls, define a policy named `DaprBuiltInServiceRetries`.

## Override at Component Level

Apply different retry policies to different component operations:

```yaml
  targets:
    components:
      primary-state:
        outbound:
          retry: criticalRetry
      audit-log-state:
        outbound:
          retry: batchRetry
```

## Combining Overrides Across Policy Types

You can mix and match different policy names for timeout, retry, and circuit breaker independently:

```yaml
targets:
  apps:
    payment-service:
      timeout: criticalTimeout
      retry: criticalRetry
      circuitBreaker: aggressiveCB
    analytics-service:
      timeout: lenientTimeout
      retry: batchRetry
      # No circuit breaker for non-critical analytics
    notification-service:
      timeout: standardTimeout
      retry: rateLimitRetry
      circuitBreaker: standardCB
```

## Verifying Which Policy Applies

Check the active resiliency configuration:

```bash
kubectl get resiliency tiered-resiliency -o yaml
```

Watch logs to confirm which policy is being evaluated for a specific service call:

```bash
kubectl logs deployment/checkout-service -c daprd \
  | grep -E "resiliency|policy|retry" \
  | grep "payment-service"
```

## Pattern: Environment-Specific Overrides

Keep base policies in a shared YAML and use Helm values to swap policy names per environment:

```yaml
# values-prod.yaml
resiliencyTargets:
  paymentService:
    retry: criticalRetry
    circuitBreaker: aggressiveCB

# values-staging.yaml
resiliencyTargets:
  paymentService:
    retry: standardRetry
    circuitBreaker: standardCB
```

## Summary

Retry overrides in Dapr are achieved by defining multiple named retry policies in a `Resiliency` resource and assigning each target the appropriate policy. This pattern keeps policy definitions DRY while allowing per-service customization - critical services get fast-fail policies, batch jobs get patient policies, and rate-limited APIs get interval-matched policies.
