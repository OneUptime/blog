# How to Implement the Strangler Fig Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Strangler Fig, Migration, Microservice, Pattern

Description: Learn how to incrementally migrate a monolith to microservices using the Strangler Fig pattern with Dapr service invocation and pub/sub as the migration layer.

---

## Overview

The Strangler Fig pattern migrates a monolith to microservices incrementally. New functionality is built as microservices while old functionality remains in the monolith. Over time the monolith shrinks as more features are extracted. Dapr acts as the communication layer between old and new services.

## Migration Strategy

1. Identify a bounded context to extract (e.g., User Management)
2. Build the new microservice with Dapr
3. Route new traffic to the microservice while the monolith handles old traffic
4. Sync state between monolith and new service during transition
5. Complete cutover once the new service is stable

## Step 1: Proxy Layer

Create a facade that routes requests based on a feature flag:

```go
package main

import (
    "context"
    "net/http"
    "net/http/httputil"
    "net/url"
    dapr "github.com/dapr/go-sdk/client"
)

type Router struct {
    daprClient   dapr.Client
    monolithURL  string
    featureFlags map[string]bool
}

func (r *Router) handleUsers(w http.ResponseWriter, req *http.Request) {
    // Check feature flag: route to new microservice or legacy monolith
    if r.featureFlags["users-migrated"] {
        r.invokeNewService(w, req, "user-service")
    } else {
        r.proxyToMonolith(w, req)
    }
}

func (r *Router) invokeNewService(w http.ResponseWriter, req *http.Request, appID string) {
    // Use Dapr service invocation
    resp, err := r.daprClient.InvokeMethod(
        context.Background(),
        appID,
        req.URL.Path,
        req.Method,
    )
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    w.Write(resp)
}

func (r *Router) proxyToMonolith(w http.ResponseWriter, req *http.Request) {
    target, _ := url.Parse(r.monolithURL)
    proxy := httputil.NewSingleHostReverseProxy(target)
    proxy.ServeHTTP(w, req)
}
```

## Step 2: New Microservice with Dapr

```go
// user-service/main.go
package main

import (
    "context"
    "encoding/json"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")
    s.AddServiceInvocationHandler("/users/{id}", getUserHandler)
    s.AddServiceInvocationHandler("/users", createUserHandler)
    s.Start()
}

func getUserHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    // Parse user ID from the request path
    userID := parseUserID(in.QueryString)
    // Serve from new microservice data store
    user := getUserFromNewStore(userID)
    data, err := json.Marshal(user)
    if err != nil {
        return nil, err
    }
    return &common.Content{
        Data:        data,
        ContentType: "application/json",
    }, nil
}
```

## Step 3: State Synchronization During Migration

While both old and new services are running, sync state changes via pub/sub:

```go
// Monolith publishes state changes
func updateUserInMonolith(user User) error {
    // Update monolith DB
    updateMonolithDB(user)

    // Publish change event for new service
    daprClient.PublishEvent(ctx, "pubsub", "user-changes", user)
    return nil
}

// New service subscribes and syncs
func handleUserChange(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var user User
    json.Unmarshal(e.RawData, &user)
    saveToNewStore(user)
    return false, nil
}
```

## Step 4: Feature Flag Cutover

Use Dapr's state store to manage feature flags dynamically:

```go
func checkFeatureFlag(ctx context.Context, flag string) bool {
    item, err := daprClient.GetState(ctx, "statestore", "feature:"+flag, nil)
    if err != nil || item.Value == nil {
        return false
    }
    return string(item.Value) == "true"
}

// Enable migration without redeployment
func enableMigration(ctx context.Context, flag string) {
    daprClient.SaveState(ctx, "statestore", "feature:"+flag, []byte("true"), nil)
}
```

## Step 5: Decommission the Monolith Route

Once stable, update the router to always use the new service and remove the proxy code:

```bash
# Enable full cutover
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"feature:users-migrated","value":"true"}]'
```

## Summary

The Strangler Fig pattern with Dapr enables safe, incremental monolith decomposition. Dapr service invocation provides a clean routing layer, pub/sub synchronizes state during migration, and a state-store-backed feature flag controls cutover timing. This approach reduces migration risk by allowing gradual rollout with easy rollback.
