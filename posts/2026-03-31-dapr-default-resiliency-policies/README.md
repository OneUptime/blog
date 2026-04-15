# How to Set Default Resiliency Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Default Policy, Fault Tolerance, Configuration

Description: Learn how to define default resiliency policies in Dapr that apply globally to all services and components as a safety net when no specific policy is configured.

---

## Overview

Dapr provides built-in default retry policies for service invocations, actors, and component initialization. You can override these defaults and define custom resiliency policies for specific services and components using a `Resiliency` resource. This ensures baseline fault tolerance across your entire application without having to rely solely on built-in behavior.

## Defining Default Policies

Override Dapr's built-in default retries using reserved `DaprBuiltIn*` keywords, and define reusable custom policies for your targets:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: global-resiliency
scopes:
  - app1
  - app2
spec:
  policies:
    timeouts:
      defaultTimeout: 10s
      strictTimeout: 3s
    retries:
      DaprBuiltInServiceRetries:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
      DaprBuiltInActorRetries:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
      DaprBuiltInInitializationRetries:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
      defaultRetry:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
    circuitBreakers:
      defaultCB:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      order-service:
        timeout: defaultTimeout
        retry: defaultRetry
        circuitBreaker: defaultCB
    components:
      statestore:
        outbound:
          timeout: defaultTimeout
          retry: defaultRetry
```

The `scopes` field lists the Dapr App IDs that can use this resiliency spec. The `DaprBuiltIn*` keywords override Dapr's built-in default retry behavior for service invocations, actors, and initialization. Custom policies like `defaultRetry` and `defaultCB` are applied to explicit targets.

## Overriding Defaults for Specific Services

Apply different policies to specific services by adding them as targets with distinct policy references. Each target app is identified by its Dapr App ID:

```yaml
targets:
  apps:
    order-service:
      timeout: defaultTimeout
      retry: defaultRetry
    payment-service:
      timeout: strictTimeout
      retry: defaultRetry
      circuitBreaker: defaultCB
```

Here `payment-service` uses a 3-second timeout instead of the 10-second timeout applied to `order-service`.

## Default Policies for Components

Apply separate policies to inbound (subscription delivery) and outbound (state/publish calls) operations on specific components:

```yaml
targets:
  components:
    statestore:
      outbound:
        timeout: defaultTimeout
        retry: defaultRetry
    pubsub:
      inbound:
        timeout: defaultTimeout
        retry: defaultRetry
```

## Namespace-Wide Defaults

Use the `scopes` field on the `Resiliency` resource to control which Dapr App IDs inherit the policies. Deploy separate resiliency specs per namespace if needed:

```bash
kubectl apply -f resiliency-production.yaml -n production
kubectl apply -f resiliency-staging.yaml -n staging
```

Each spec's `scopes` field determines which apps use its policies. Without `scopes`, the resiliency spec is available to all apps that load it.

## Verifying Default Policy Application

Check what policies are applied to a running service:

```bash
kubectl get resiliency global-resiliency -o yaml
```

View sidecar logs to see default policies being evaluated:

```bash
kubectl logs deployment/any-service -c daprd \
  | grep -i "resiliency\|policy"
```

## Priority Order

When multiple policies could apply, Dapr evaluates in this order:
1. Explicit target match for the app/component in a `Resiliency` resource
2. Built-in default retry policies (or their `DaprBuiltIn*` overrides)
3. No policy (direct call without fault tolerance)

## Summary

Dapr's built-in default retry policies provide a safety net for service invocations and component operations. By overriding these with `DaprBuiltIn*` keywords and defining custom timeout, retry, and circuit breaker policies for specific targets, you ensure baseline fault tolerance across your application. Use the `scopes` field to control which services inherit these policies.
