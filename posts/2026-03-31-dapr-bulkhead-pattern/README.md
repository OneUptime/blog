# How to Implement Bulkhead Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Bulkhead, Resiliency, Pattern, Microservice

Description: Learn how to implement the bulkhead pattern with Dapr to isolate failures and prevent resource exhaustion from spreading across microservices.

---

## Overview

The bulkhead pattern isolates service components into pools so that a failure or overload in one area doesn't exhaust resources across the entire application. Named after ship bulkheads that prevent flooding from spreading, this pattern limits the blast radius of failures.

## Bulkhead Strategies with Dapr

Dapr implements bulkhead isolation through:

1. **Separate component instances** per service group
2. **Scoped components** limiting which services use which resources
3. **Concurrency limits** on service invocation

## Component Scoping as Bulkhead

Create separate state store instances for different service groups:

```yaml
# Critical services - high-performance Redis
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: critical-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-critical:6379"
    - name: maxRetries
      value: "3"
scopes:
  - payment-service
  - order-service
---
# Non-critical services - shared Redis
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: standard-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-shared:6379"
scopes:
  - notification-service
  - analytics-service
  - reporting-service
```

## Separate Pub/Sub Topics as Bulkheads

```yaml
# High-priority pub/sub for payments
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-critical:9092"
    - name: consumerGroup
      value: "payment-group"
scopes:
  - payment-service
---
# Standard pub/sub for everything else
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: standard-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-standard:9092"
    - name: consumerGroup
      value: "standard-group"
scopes:
  - notification-service
  - analytics-service
```

## Concurrency Limiting via Kubernetes Resources

Limit the number of concurrent requests a service can handle:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-max-concurrency: "20"  # Bulkhead: max 20 concurrent requests
        dapr.io/max-body-size: "4Mi"  # Limit request body size
```

## Application-Level Bulkhead with Worker Pools

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type BulkheadService struct {
    client       dapr.Client
    paymentPool  chan struct{}  // Bulkhead for payment calls
    catalogPool  chan struct{}  // Bulkhead for catalog calls
}

func NewBulkheadService(paymentSize, catalogSize int) *BulkheadService {
    return &BulkheadService{
        paymentPool: make(chan struct{}, paymentSize),
        catalogPool: make(chan struct{}, catalogSize),
    }
}

func (svc *BulkheadService) ChargePayment(ctx context.Context, amount float64) error {
    // Acquire slot in payment bulkhead
    select {
    case svc.paymentPool <- struct{}{}:
        defer func() { <-svc.paymentPool }()
    default:
        return fmt.Errorf("payment bulkhead full: too many concurrent requests")
    }

    _, err := svc.client.InvokeMethod(ctx, "payment-service", "/charge", "POST")
    return err
}

func (svc *BulkheadService) GetCatalog(ctx context.Context, categoryID string) ([]byte, error) {
    // Acquire slot in catalog bulkhead
    select {
    case svc.catalogPool <- struct{}{}:
        defer func() { <-svc.catalogPool }()
    default:
        return nil, fmt.Errorf("catalog bulkhead full")
    }

    return svc.client.InvokeMethod(ctx, "catalog-service", "/categories/"+categoryID, "GET")
}
```

## Namespace Isolation as Bulkhead

Deploy different service tiers in separate Kubernetes namespaces:

```bash
kubectl create namespace critical
kubectl create namespace standard
kubectl create namespace batch
```

```yaml
# Deploy Dapr components per namespace
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: critical
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-critical:6379"
```

## Monitoring Bulkhead Effectiveness

```bash
# Check concurrent request counts per service
kubectl top pods -l tier=critical --containers

# Monitor Dapr concurrency metrics
dapr_http_server_request_count{app_id="payment-service"}
```

## Summary

The bulkhead pattern with Dapr isolates failures through scoped components, separate resource pools, and concurrency limits. By dedicating state stores, pub/sub brokers, and worker pools to different service groups, a failure or overload in one pool cannot exhaust resources in another. Dapr's component scoping and Kubernetes annotations make bulkhead configuration declarative and easy to reason about.
