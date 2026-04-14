# How to Build a Recommendation System Backend with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Recommendation, Machine Learning, State Management, Pub/Sub

Description: Build a recommendation system backend with Dapr for real-time candidate generation, scoring, and personalization using event-driven feature updates and actor-based user profiles.

---

## Recommendation System Architecture

A production recommendation system has several interconnected components: event collection, feature computation, model scoring, and result caching. Dapr's building blocks handle the infrastructure complexity.

Services:
- **Event Collector** - Tracks user interactions (views, clicks, purchases)
- **Profile Service** - Maintains user preference profiles (Actors)
- **Candidate Service** - Generates recommendation candidates
- **Scoring Service** - Ranks candidates using ML model
- **Result Cache** - Stores pre-computed recommendations

## Event Collection Service

```python
# event_collector.py
from fastapi import FastAPI
from dapr.clients import DaprClient
from dapr.ext.fastapi import DaprApp
import json, time

app = FastAPI()
dapr_app = DaprApp(app)

@app.post("/api/events/track")
async def track_event(event: dict):
    """
    event = {
        "userId": "user-123",
        "eventType": "view" | "click" | "purchase" | "add_to_cart",
        "itemId": "item-456",
        "itemCategory": "electronics",
        "metadata": {}
    }
    """
    event["timestamp"] = int(time.time() * 1000)
    event["sessionId"] = event.get("sessionId", "")

    with DaprClient() as client:
        # Publish for async profile updates
        client.publish_event("pubsub", "user-interaction",
                             json.dumps(event),
                             data_content_type="application/json")

        # Store raw event for batch training
        client.publish_event("pubsub", "raw-events",
                             json.dumps(event),
                             data_content_type="application/json")

    return {"tracked": True}
```

## User Profile Actor

```csharp
public interface IUserProfileActor : IActor
{
    Task RecordInteractionAsync(UserInteraction interaction);
    Task<UserProfile> GetProfileAsync();
    Task<List<string>> GetTopCategoriesAsync(int topN);
}

public class UserProfileActor : Actor, IUserProfileActor
{
    public async Task RecordInteractionAsync(UserInteraction interaction)
    {
        var profile = await StateManager.GetOrAddStateAsync("profile", new UserProfile
        {
            UserId = Id.GetId(),
            CategoryAffinities = new Dictionary<string, double>()
        });

        // Update category affinity with exponential decay
        var category = interaction.ItemCategory;
        var weight = interaction.EventType switch
        {
            "purchase" => 3.0,
            "add_to_cart" => 2.0,
            "click" => 1.0,
            "view" => 0.5,
            _ => 0.1
        };

        if (profile.CategoryAffinities.ContainsKey(category))
            profile.CategoryAffinities[category] =
                profile.CategoryAffinities[category] * 0.95 + weight * 0.05;
        else
            profile.CategoryAffinities[category] = weight;

        profile.RecentItems = profile.RecentItems
            .Prepend(interaction.ItemId)
            .Distinct()
            .Take(50)
            .ToList();

        profile.LastInteractionAt = DateTime.UtcNow;
        await StateManager.SetStateAsync("profile", profile);
    }

    public async Task<UserProfile> GetProfileAsync()
    {
        return await StateManager.GetOrAddStateAsync("profile",
            new UserProfile { UserId = Id.GetId() });
    }

    public async Task<List<string>> GetTopCategoriesAsync(int topN)
    {
        var profile = await GetProfileAsync();
        return profile.CategoryAffinities
            .OrderByDescending(kv => kv.Value)
            .Take(topN)
            .Select(kv => kv.Key)
            .ToList();
    }
}
```

## Candidate Generation Service

```go
// candidate_service.go
package main

import (
    "context"
    "encoding/json"

    dapr "github.com/dapr/go-sdk/client"
    common "github.com/dapr/go-sdk/service/common"
)

func generateCandidates(ctx context.Context, in *common.InvocationEvent) (
    *common.Content, error) {

    var req struct {
        UserID string `json:"userId"`
        Count  int    `json:"count"`
    }
    json.Unmarshal(in.Data, &req)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Get user profile via actor
    var profile map[string]interface{}
    client.InvokeActor(ctx, &dapr.InvokeActorRequest{
        ActorType: "UserProfileActor",
        ActorID:   req.UserID,
        Method:    "GetTopCategoriesAsync",
        Data:      []byte(`3`),
    })

    // Get popular items in top categories from state
    candidates := []string{}
    for _, category := range getTopCategories(profile) {
        state, _ := client.GetState(ctx, "statestore",
            "popular-items-"+category, nil)
        var items []string
        json.Unmarshal(state.Value, &items)
        candidates = append(candidates, items[:min(10, len(items))]...)
    }

    // Deduplicate
    seen := map[string]bool{}
    unique := []string{}
    for _, id := range candidates {
        if !seen[id] {
            seen[id] = true
            unique = append(unique, id)
        }
    }

    data, _ := json.Marshal(map[string]interface{}{
        "userId":     req.UserID,
        "candidates": unique[:min(req.Count, len(unique))],
    })
    return &common.Content{Data: data, ContentType: "application/json"}, nil
}
```

## Result Caching and Serving

```javascript
// recommendation-api.js
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const express = require('express');

const app = express();
const client = new DaprClient();

app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  const count = parseInt(req.query.count || '10');

  // Check cache first
  const cached = await client.state.get('statestore', `recs-${userId}`);

  if (cached && !isCacheStale(cached)) {
    return res.json({ userId, recommendations: cached.items, cached: true });
  }

  // Generate fresh recommendations
  const candidates = await client.invoker.invoke(
    'candidate-service', 'api/candidates', HttpMethod.POST,
    { userId, count: count * 3 }  // over-generate for scoring
  );

  const scored = await client.invoker.invoke(
    'scoring-service', 'api/score', HttpMethod.POST,
    { userId, candidates: candidates.candidates }
  );

  const recommendations = scored.results.slice(0, count);

  // Cache for 5 minutes
  await client.state.save('statestore', [
    { key: `recs-${userId}`,
      value: { items: recommendations, generatedAt: Date.now() },
      metadata: { ttlInSeconds: '300' } }
  ]);

  res.json({ userId, recommendations, cached: false });
});

app.listen(8080);
```

## Summary

A Dapr-based recommendation system uses user profile actors to maintain per-user preference state with automatic persistence, event-driven pub/sub to update profiles on every user interaction, and service invocation to chain candidate generation, scoring, and caching. The actor model guarantees that concurrent interaction events for the same user are processed in turn-based order, preventing profile corruption. Result caching with TTL in Dapr state minimizes model scoring latency for repeat requests.
