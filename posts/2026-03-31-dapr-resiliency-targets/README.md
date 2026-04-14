# How to Configure Resiliency Targets in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Target, Configuration, Policy

Description: Learn how to configure Dapr resiliency targets to precisely apply timeout, retry, and circuit breaker policies to services, components, and actors.

---

## Overview

Dapr Resiliency policies are only effective when they are applied to the right targets. The `targets` section of a `Resiliency` resource maps named policies to specific services (`apps`), Dapr components (`components`), and actor types (`actors`). Understanding target configuration is key to ensuring the right resiliency rules apply in the right places.

## Target Types

Dapr supports three target categories:

1. **apps** - Dapr app IDs targeted for service invocation calls
2. **components** - Named Dapr components (state stores, pub/sub, bindings)
3. **actors** - Actor type names

## Configuring App Targets

App targets apply to outbound service invocation calls. When your service calls another service via Dapr, these policies activate:

```yaml
targets:
  apps:
    payment-service:
      timeout: quickTimeout
      retry: fastRetry
      circuitBreaker: serviceCB
    inventory-service:
      timeout: standardTimeout
      retry: defaultRetry
    legacy-api:
      timeout: longTimeout
```

Note: App targets apply to the **caller's** Resiliency resource, not the target service's.

## Configuring Component Targets

Component targets have `outbound` and `inbound` sub-sections:

```yaml
targets:
  components:
    my-state-store:
      outbound:
        timeout: standardTimeout
        retry: defaultRetry
        circuitBreaker: componentCB
    my-kafka-pubsub:
      outbound:
        timeout: standardTimeout
        retry: defaultRetry
      inbound:
        timeout: longTimeout
        retry: messageRetry
    my-cron-binding:
      inbound:
        timeout: quickTimeout
```

- `outbound` - applies when your app writes to or reads from the component
- `inbound` - applies when the component delivers data to your app (pub/sub subscriptions, input bindings)

## Configuring Actor Targets

Actor targets apply to actor method invocations and reminders:

```yaml
targets:
  actors:
    OrderActor:
      timeout: actorTimeout
      retry: actorRetry
      circuitBreaker: actorCB
    PaymentActor:
      timeout: quickTimeout
      retry: fastRetry
```

## Combining All Target Types

A complete resiliency resource with all target types:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: full-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      quickTimeout: 2s
      standardTimeout: 10s
      longTimeout: 60s
    retries:
      fastRetry:
        policy: constant
        duration: 500ms
        maxRetries: 3
      defaultRetry:
        policy: exponential
        initialInterval: 1s
        maxInterval: 30s
        maxRetries: 5
    circuitBreakers:
      serviceCB:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payment-service:
        timeout: quickTimeout
        retry: fastRetry
        circuitBreaker: serviceCB
      inventory-service:
        timeout: standardTimeout
        retry: defaultRetry
    components:
      my-state-store:
        outbound:
          timeout: standardTimeout
          retry: defaultRetry
    actors:
      OrderActor:
        timeout: standardTimeout
        retry: defaultRetry
        circuitBreaker: serviceCB
```

## Partial Policy Assignment

You do not need to assign all three policy types to every target. Assign only what you need:

```yaml
targets:
  apps:
    analytics-service:
      timeout: longTimeout
      # No retry: analytics failures do not warrant retries
      # No circuitBreaker: analytics is non-critical
```

## Summary

Dapr resiliency targets provide the mapping layer between named policies and the specific services, components, and actors they protect. By listing each app, component, and actor target explicitly and assigning only the policies they need, you get fine-tuned control over resiliency behavior across your entire system.
