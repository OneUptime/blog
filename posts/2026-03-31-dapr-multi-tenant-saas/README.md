# How to Build a Multi-Tenant SaaS Application with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Tenant, SaaS, State, Isolation

Description: Learn how to build a multi-tenant SaaS application using Dapr with tenant isolation for state management, secrets, and pub/sub namespacing.

---

## Overview

Multi-tenant SaaS applications serve multiple customers (tenants) from a shared infrastructure while keeping their data isolated. Dapr supports tenant isolation through namespaced state keys, scoped components, and per-tenant secret management.

## Tenant Isolation Strategies

1. **Key-prefixed isolation**: All state keys prefixed with tenant ID
2. **Component scoping**: Separate Dapr components per tenant tier
3. **Namespace isolation**: Kubernetes namespaces per tenant

## Tenant Context Middleware

```go
package main

import (
    "context"
    "net/http"
)

type TenantKey struct{}

func TenantMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tenantID := r.Header.Get("X-Tenant-ID")
        if tenantID == "" {
            http.Error(w, "missing tenant ID", http.StatusBadRequest)
            return
        }

        ctx := context.WithValue(r.Context(), TenantKey{}, tenantID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func TenantFromContext(ctx context.Context) string {
    if v, ok := ctx.Value(TenantKey{}).(string); ok {
        return v
    }
    return ""
}
```

## Tenant-Isolated State Operations

```go
type TenantStateManager struct {
    daprClient dapr.Client
    storeMap   map[string]string // tier -> store name
}

func (tsm *TenantStateManager) getStoreName(tenantID string) string {
    tier := getTenantTier(tenantID)
    if store, ok := tsm.storeMap[tier]; ok {
        return store
    }
    return "standard-statestore"
}

func (tsm *TenantStateManager) prefixKey(tenantID, key string) string {
    return fmt.Sprintf("tenant:%s:%s", tenantID, key)
}

func (tsm *TenantStateManager) SaveState(ctx context.Context, tenantID, key string, value []byte) error {
    store := tsm.getStoreName(tenantID)
    prefixedKey := tsm.prefixKey(tenantID, key)
    return tsm.daprClient.SaveState(ctx, store, prefixedKey, value, nil)
}

func (tsm *TenantStateManager) GetState(ctx context.Context, tenantID, key string) ([]byte, error) {
    store := tsm.getStoreName(tenantID)
    prefixedKey := tsm.prefixKey(tenantID, key)
    item, err := tsm.daprClient.GetState(ctx, store, prefixedKey, nil)
    if err != nil {
        return nil, err
    }
    return item.Value, nil
}
```

## Tiered Component Configuration

```yaml
# Enterprise tier - dedicated Redis
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: enterprise-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-enterprise:6379"
scopes:
  - enterprise-api
---
# Standard tier - shared Redis
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: standard-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-shared:6379"
scopes:
  - standard-api
```

## Per-Tenant Pub/Sub Topics

```go
func publishTenantEvent(client dapr.Client, tenantID, eventType string, data any) error {
    // Namespace topics by tenant
    topic := fmt.Sprintf("tenant-%s-%s", tenantID, eventType)
    return client.PublishEvent(context.Background(), "pubsub", topic, data)
}

// Subscribe to tenant-specific topic
func subscribeTenantEvents(tenantID string) *common.Subscription {
    return &common.Subscription{
        PubsubName: "pubsub",
        Topic:      fmt.Sprintf("tenant-%s-events", tenantID),
        Route:      "/handle-events",
    }
}
```

## Tenant Configuration from Secrets

```go
func getTenantConfig(client dapr.Client, tenantID string) (map[string]string, error) {
    // Each tenant has its own secret set
    secrets, err := client.GetSecret(
        context.Background(),
        "secretstore",
        fmt.Sprintf("tenant/%s/config", tenantID),
        nil,
    )
    if err != nil {
        return nil, err
    }
    return secrets, nil
}
```

## API Handler with Tenant Context

```go
func handleCreateRecord(w http.ResponseWriter, r *http.Request) {
    tenantID := TenantFromContext(r.Context())

    var record map[string]any
    json.NewDecoder(r.Body).Decode(&record)

    // Enforce tenant limits
    if !checkTenantQuota(tenantID) {
        http.Error(w, "quota exceeded", http.StatusTooManyRequests)
        return
    }

    record["tenantId"] = tenantID
    record["createdAt"] = time.Now().Unix()
    data, _ := json.Marshal(record)

    if err := tsm.SaveState(r.Context(), tenantID, "record:"+record["id"].(string), data); err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    publishTenantEvent(daprClient, tenantID, "record-created", record)
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(record)
}
```

## Summary

Multi-tenant SaaS with Dapr uses tenant-prefixed state keys for logical data isolation, tiered state store components for performance isolation between plans, and namespaced pub/sub topics for event isolation. Tenant middleware extracts and validates the tenant context on every request. This approach scales from shared infrastructure for standard tenants to dedicated resources for enterprise customers.
