# How to Build a Recommendation Engine Backend with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Recommendation, Actor, Pub/Sub, State

Description: Learn how to build a recommendation engine backend using Dapr Actors for per-user profiles, pub/sub for behavior events, and service invocation for ML model serving.

---

## Overview

A recommendation engine tracks user behavior, builds interest profiles, and serves personalized recommendations. Dapr Actors naturally model per-user recommendation state, pub/sub captures behavioral events, and service invocation integrates with ML model serving endpoints.

## Recommendation System Components

```text
Event Collector --> Pub/Sub --> User Profile Actor --> Recommendation Service
                                      |
                                 ML Model Service (via Dapr service invocation)
```

## User Profile Actor

```go
package main

import (
    "context"
    "encoding/json"
    "time"

    "github.com/dapr/go-sdk/actor"
)

type UserProfile struct {
    UserID         string             `json:"userId"`
    ViewedItems    []string           `json:"viewedItems"`
    PurchasedItems []string           `json:"purchasedItems"`
    CategoryScores map[string]float64 `json:"categoryScores"`
    LastUpdated    int64              `json:"lastUpdated"`
}

type UserProfileActor struct {
    actor.ServerImplBaseCtx
}

func (a *UserProfileActor) Type() string {
    return "UserProfile"
}

func (a *UserProfileActor) RecordView(ctx context.Context, req *ViewEvent) error {
    var profile UserProfile
    a.GetStateManager().Get(ctx, "profile", &profile)

    // Add to viewed history (keep last 100)
    profile.ViewedItems = append(profile.ViewedItems, req.ItemID)
    if len(profile.ViewedItems) > 100 {
        profile.ViewedItems = profile.ViewedItems[len(profile.ViewedItems)-100:]
    }

    // Update category scores
    if profile.CategoryScores == nil {
        profile.CategoryScores = make(map[string]float64)
    }
    profile.CategoryScores[req.Category] += 1.0
    profile.LastUpdated = time.Now().Unix()

    return a.GetStateManager().Set(ctx, "profile", profile)
}

func (a *UserProfileActor) RecordPurchase(ctx context.Context, req *PurchaseEvent) error {
    var profile UserProfile
    a.GetStateManager().Get(ctx, "profile", &profile)

    profile.PurchasedItems = append(profile.PurchasedItems, req.ItemID)
    // Purchases carry more weight than views
    if profile.CategoryScores == nil {
        profile.CategoryScores = make(map[string]float64)
    }
    profile.CategoryScores[req.Category] += 5.0
    profile.LastUpdated = time.Now().Unix()

    return a.GetStateManager().Set(ctx, "profile", profile)
}

func (a *UserProfileActor) GetProfile(ctx context.Context) (*UserProfile, error) {
    var profile UserProfile
    err := a.GetStateManager().Get(ctx, "profile", &profile)
    return &profile, err
}
```

## Behavior Event Processor

```go
type BehaviorProcessor struct {
    daprClient dapr.Client
}

func (bp *BehaviorProcessor) HandleViewEvent(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event struct {
        UserID   string `json:"userId"`
        ItemID   string `json:"itemId"`
        Category string `json:"category"`
    }
    json.Unmarshal(e.RawData, &event)

    // Update user profile actor
    data, _ := json.Marshal(ViewEvent{ItemID: event.ItemID, Category: event.Category})
    _, err := bp.daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{
        ActorType: "UserProfile",
        ActorID:   event.UserID,
        Method:    "RecordView",
        Data:      data,
    })
    return false, err
}
```

## Recommendation Service

```go
type RecommendationService struct {
    daprClient dapr.Client
}

func (rs *RecommendationService) GetRecommendations(ctx context.Context, userID string, count int) ([]string, error) {
    // Get user profile from actor
    resp, err := rs.daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{
        ActorType: "UserProfile",
        ActorID:   userID,
        Method:    "GetProfile",
    })
    var profile UserProfile
    if err == nil && resp != nil {
        json.Unmarshal(resp.Data, &profile)
    }
    if err != nil || profile.UserID == "" {
        // Cold start: return popular items
        return rs.getPopularItems(ctx, count)
    }

    // Call ML model service with profile features
    features := buildFeatureVector(profile)
    featuresJSON, _ := json.Marshal(features)

    result, err := rs.daprClient.InvokeMethodWithContent(
        ctx,
        "ml-model-service",
        "/recommend",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data:        featuresJSON,
        },
    )
    if err != nil {
        return rs.getPopularItems(ctx, count)
    }

    var recommendations []string
    json.Unmarshal(result, &recommendations)

    // Filter out already purchased items
    return filterPurchased(recommendations, profile.PurchasedItems, count), nil
}

func buildFeatureVector(profile UserProfile) map[string]any {
    return map[string]any{
        "viewedItems":    profile.ViewedItems[:min(20, len(profile.ViewedItems))],
        "categoryScores": profile.CategoryScores,
        "purchaseCount":  len(profile.PurchasedItems),
    }
}
```

## Popular Items Cache

```go
func (rs *RecommendationService) getPopularItems(ctx context.Context, count int) ([]string, error) {
    item, _ := rs.daprClient.GetState(ctx, "statestore", "popular-items", nil)
    var popular []string
    json.Unmarshal(item.Value, &popular)
    if len(popular) > count {
        return popular[:count], nil
    }
    return popular, nil
}

// Refreshed periodically by a scheduler
func refreshPopularItems(client dapr.Client) {
    // Aggregate most viewed/purchased items
    popular := computePopularItems()
    data, _ := json.Marshal(popular)
    client.SaveState(context.Background(), "statestore", "popular-items", data, nil)
}
```

## Summary

Dapr Actors provide isolated per-user state for the recommendation engine, accumulating view and purchase history with category affinity scores. Pub/sub captures behavioral events and routes them to actor updates asynchronously. The recommendation service combines actor-stored user profiles with ML model serving via Dapr service invocation, with graceful cold-start and error fallbacks to popular item lists.
