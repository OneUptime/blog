# How to Configure Dapr Component Scoping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Scoping, Security, Isolation

Description: Learn how to configure Dapr component scoping to control which services can access specific state stores, pub/sub topics, and bindings.

---

## Overview

In a multi-service Dapr deployment, all components are available to all services by default. Component scoping lets you restrict component access to specific services, improving security isolation and reducing the blast radius when a component fails or is misconfigured.

## Basic Component Scoping

Add a `scopes` field to a component definition to restrict access:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-payments:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-payment-secret
      key: password
scopes:
- payment-service
- payment-worker
```

Only pods with `dapr.io/app-id` set to `payment-service` or `payment-worker` can use this component.

## Scoping Pub/Sub Components

Restrict a pub/sub broker to specific services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
scopes:
- order-service
- inventory-service
- notification-service
```

## Topic-Level Access Control

In addition to component scoping, use Dapr's pub/sub topic access control metadata for finer control. The `publishingScopes`, `subscriptionScopes`, and `allowedTopics` fields are set as metadata on the pub/sub component itself:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: subscriptionScopes
    value: "order-service=orders.created,orders.cancelled"
  - name: publishingScopes
    value: "order-service=orders.processed"
  - name: allowedTopics
    value: "orders.created,orders.cancelled,orders.processed"
scopes:
- order-service
```

## Verifying Scoping is Enforced

Try accessing a scoped component from an unauthorized service:

```bash
# From a service NOT in the scope list
curl http://localhost:3500/v1.0/state/payment-statestore/mykey
# Returns: component not found error (the component is not loaded for unauthorized services)
```

Check sidecar logs for the unauthorized access attempt:

```bash
kubectl logs -l app=unauthorized-service -c daprd | grep "component\|forbidden\|scope"
```

## Scoping Bindings

Restrict output bindings to specific services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid-email
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: apiKey
    secretKeyRef:
      name: sendgrid-secret
      key: apiKey
scopes:
- notification-service   # Only notification-service can send emails
```

## Environment-Based Scoping Strategy

Define a scoping strategy based on service domains:

```yaml
# Payments domain: only payment services
scopes: [payment-service, payment-processor, payment-reconciler]

# Orders domain: only order services
scopes: [order-service, order-worker, order-api]

# Shared infrastructure: all services (omit the scopes field entirely)
# When scopes is not specified, all services can access the component
```

## Summary

Dapr component scoping restricts which services can access specific components by adding app IDs to the `scopes` field in the component definition. Use scoping to enforce service domain boundaries, limit the impact of compromised services, and implement principle of least privilege for infrastructure access across your microservice fleet.
