# How to Build a Machine Learning Feature Store with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Machine Learning, Feature Store, State Management, Real-Time

Description: Build a real-time ML feature store with Dapr using state management for feature serving, pub/sub for feature computation triggers, and actors for feature versioning.

---

## Feature Store Architecture with Dapr

A feature store is a central repository for ML features that serves both batch training pipelines and real-time inference. Dapr is well-suited for the online feature store (low-latency serving) component due to its state management building block.

Key components:
- **Feature Registry** - Metadata about features and schemas
- **Feature Writer** - Computes and writes features from events
- **Feature Server** - Serves features for inference (low latency)
- **Feature Validator** - Validates feature freshness and quality

```yaml
# Fast online store - Redis
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: feature-store
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: enableTLS
    value: "false"
```

## Feature Writer Service

```python
# feature_writer.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
from dapr.clients import DaprClient
import json, time
from dataclasses import dataclass, asdict
from typing import Optional

app = FastAPI()
dapr_app = DaprApp(app)

@dataclass
class UserFeatures:
    user_id: str
    purchase_count_7d: int
    purchase_count_30d: int
    avg_order_value: float
    last_purchase_days: int
    preferred_category: str
    churn_risk_score: float
    computed_at: int  # Unix timestamp

@dapr_app.subscribe(pubsub="pubsub", topic="order-created")
async def compute_user_features(event: dict):
    data = event.get("data", {})
    user_id = data.get("userId")

    with DaprClient() as client:
        # Get existing features
        existing_state = client.get_state("feature-store", f"user-features-{user_id}")
        existing = json.loads(existing_state.data) if existing_state.data else {}

        # Get user's order history (from order service)
        resp = client.invoke_method(
            "order-service", f"api/users/{user_id}/orders/summary",
            http_verb="GET"
        )
        history = json.loads(resp.data)

        # Compute fresh features
        features = UserFeatures(
            user_id=user_id,
            purchase_count_7d=history.get("count7d", 0),
            purchase_count_30d=history.get("count30d", 0),
            avg_order_value=history.get("avgValue", 0.0),
            last_purchase_days=0,  # just purchased
            preferred_category=history.get("topCategory", "unknown"),
            churn_risk_score=compute_churn_risk(history),
            computed_at=int(time.time())
        )

        client.save_state("feature-store", f"user-features-{user_id}",
                          json.dumps(asdict(features)),
                          state_metadata={"ttlInSeconds": "86400"})

        # Publish feature update for downstream consumers
        client.publish_event("pubsub", "features-updated", {
            "entityType": "user",
            "entityId": user_id,
            "featureGroup": "user_features"
        })

def compute_churn_risk(history: dict) -> float:
    days_since = history.get("daysSinceLastOrder", 999)
    count30d = history.get("count30d", 0)
    if days_since > 90:
        return 0.9
    elif days_since > 30 and count30d < 2:
        return 0.6
    return 0.1
```

## Feature Server (Low-Latency Serving)

```go
// feature_server.go
package main

import (
    "context"
    "encoding/json"

    dapr "github.com/dapr/go-sdk/client"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")
    s.AddServiceInvocationHandler("/features/user", getUserFeatures)
    s.AddServiceInvocationHandler("/features/batch", getBatchFeatures)
    s.Start()
}

func getUserFeatures(ctx context.Context, in *daprd.InvocationEvent) (
    *daprd.Content, error) {

    var request struct {
        UserID string `json:"userId"`
    }
    json.Unmarshal(in.Data, &request)
    userID := request.UserID

    client, _ := dapr.NewClient()
    defer client.Close()

    state, err := client.GetState(ctx, "feature-store",
        "user-features-"+userID, nil)
    if err != nil {
        return errorContent(500, "state store error")
    }

    if len(state.Value) == 0 {
        // Return default features for cold start
        defaults := getDefaultFeatures(userID)
        data, _ := json.Marshal(defaults)
        return &daprd.Content{Data: data, ContentType: "application/json"}, nil
    }

    return &daprd.Content{Data: state.Value, ContentType: "application/json"}, nil
}

func getBatchFeatures(ctx context.Context, in *daprd.InvocationEvent) (
    *daprd.Content, error) {

    var request struct {
        UserIDs []string `json:"userIds"`
    }
    json.Unmarshal(in.Data, &request)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Bulk get from state store
    keys := make([]string, len(request.UserIDs))
    for i, id := range request.UserIDs {
        keys[i] = "user-features-" + id
    }

    items, _ := client.GetBulkState(ctx, "feature-store", keys, nil, 10)

    result := map[string]interface{}{}
    for _, item := range items {
        var features map[string]interface{}
        json.Unmarshal(item.Value, &features)
        result[item.Key] = features
    }

    data, _ := json.Marshal(result)
    return &daprd.Content{Data: data, ContentType: "application/json"}, nil
}
```

## Feature Version Actor

```csharp
public class FeatureVersionActor : Actor, IFeatureVersionActor
{
    public FeatureVersionActor(ActorHost host) : base(host) { }

    public async Task RegisterFeatureVersionAsync(string featureGroup,
        FeatureSchema schema)
    {
        var versions = await StateManager.GetOrAddStateAsync<List<FeatureSchema>>(
            "versions", new List<FeatureSchema>());

        schema.Version = versions.Count + 1;
        schema.CreatedAt = DateTime.UtcNow;
        versions.Add(schema);

        await StateManager.SetStateAsync("versions", versions);
        await StateManager.SetStateAsync("latest", schema);
    }

    public async Task<FeatureSchema?> GetLatestSchemaAsync()
    {
        return await StateManager.TryGetStateAsync<FeatureSchema>("latest")
            is var (found, value) && found ? value : null;
    }
}
```

## Summary

A Dapr-based ML feature store uses Redis-backed state management for sub-millisecond online feature serving, pub/sub to trigger feature recomputation when source events arrive, and bulk state reads for batch inference scenarios. Feature version actors maintain schema history for feature lineage tracking. The architecture cleanly separates feature computation (event-driven) from feature serving (synchronous), enabling the serving tier to handle high-QPS inference requests without coupling to upstream computation latency.
