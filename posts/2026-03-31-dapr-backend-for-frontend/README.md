# How to Implement Backend for Frontend (BFF) with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, BFF, Backend For Frontend, Service Invocation, Pattern

Description: Learn how to implement the Backend for Frontend pattern with Dapr to create tailored API gateways optimized for specific client types like mobile and web.

---

## Overview

The Backend for Frontend (BFF) pattern creates separate backend services for each frontend type (web, mobile, third-party API). Each BFF aggregates data from multiple microservices and formats it for its specific client's needs. Dapr service invocation simplifies building BFF services.

## BFF Architecture

```text
Mobile App --> Mobile BFF --> [user-service, order-service, product-service]
Web App    --> Web BFF    --> [user-service, order-service, product-service, analytics-service]
Partner    --> API BFF    --> [product-service, order-service]
```

## Mobile BFF - Lightweight Responses

Mobile apps need minimal data to reduce bandwidth:

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    dapr "github.com/dapr/go-sdk/client"
)

type MobileBFF struct {
    client dapr.Client
}

// Mobile home screen - minimal fields, single call
type MobileHomeResponse struct {
    UserName     string       `json:"userName"`
    ActiveOrders int          `json:"activeOrders"`
    Promotions   []Promotion  `json:"promotions"`
}

func (bff *MobileBFF) handleHome(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    ctx := context.Background()

    // Parallel fan-out to microservices
    userCh := make(chan []byte, 1)
    orderCh := make(chan []byte, 1)
    promoCh := make(chan []byte, 1)

    go func() {
        data, _ := bff.client.InvokeMethod(ctx, "user-service", "/users/"+userID+"/name", "GET")
        userCh <- data
    }()
    go func() {
        data, _ := bff.client.InvokeMethod(ctx, "order-service", "/users/"+userID+"/active-count", "GET")
        orderCh <- data
    }()
    go func() {
        data, _ := bff.client.InvokeMethod(ctx, "promo-service", "/promotions/mobile", "GET")
        promoCh <- data
    }()

    var name string
    var count int
    var promos []Promotion

    json.Unmarshal(<-userCh, &name)
    json.Unmarshal(<-orderCh, &count)
    json.Unmarshal(<-promoCh, &promos)

    // Mobile-optimized response - only what mobile needs
    response := MobileHomeResponse{
        UserName:     name,
        ActiveOrders: count,
        Promotions:   promos[:min(3, len(promos))], // Max 3 promos on mobile
    }

    json.NewEncoder(w).Encode(response)
}
```

## Web BFF - Rich Responses

Web apps can handle more data:

```go
type WebBFF struct {
    client dapr.Client
}

type WebDashboardResponse struct {
    User         UserProfile     `json:"user"`
    RecentOrders []Order         `json:"recentOrders"`
    Promotions   []Promotion     `json:"promotions"`
    Analytics    UserAnalytics   `json:"analytics"`
    Recommendations []Product   `json:"recommendations"`
    Notifications []Notification `json:"notifications"`
}

func (bff *WebBFF) handleDashboard(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    ctx := context.Background()

    type serviceResult struct {
        key  string
        data []byte
        err  error
    }

    calls := map[string]struct{ appID, method string }{
        "user":            {"user-service", "/users/" + userID},
        "orders":          {"order-service", "/users/" + userID + "/recent?limit=10"},
        "promotions":      {"promo-service", "/promotions/web"},
        "analytics":       {"analytics-service", "/users/" + userID + "/summary"},
        "recommendations": {"recommendation-service", "/users/" + userID + "/recommend"},
        "notifications":   {"notification-service", "/users/" + userID + "/unread"},
    }

    results := make(map[string][]byte)
    ch := make(chan serviceResult, len(calls))

    for key, call := range calls {
        go func(k, appID, method string) {
            data, err := bff.client.InvokeMethod(ctx, appID, method, "GET")
            ch <- serviceResult{k, data, err}
        }(key, call.appID, call.method)
    }

    for range calls {
        r := <-ch
        if r.err == nil {
            results[r.key] = r.data
        }
    }

    // Build web-specific rich response
    var response WebDashboardResponse
    json.Unmarshal(results["user"], &response.User)
    json.Unmarshal(results["orders"], &response.RecentOrders)
    json.Unmarshal(results["promotions"], &response.Promotions)
    json.Unmarshal(results["analytics"], &response.Analytics)
    json.Unmarshal(results["recommendations"], &response.Recommendations)
    json.Unmarshal(results["notifications"], &response.Notifications)
    json.NewEncoder(w).Encode(response)
}
```

## Partner API BFF - Strict Schema

```go
type PartnerBFF struct {
    client dapr.Client
}

// Partners get a simplified, versioned API
type PartnerProductResponse struct {
    ProductID   string  `json:"product_id"`
    Name        string  `json:"name"`
    Price       float64 `json:"price"`
    Available   bool    `json:"available"`
    // No internal fields like cost, margin, supplier
}

func (bff *PartnerBFF) handleGetProduct(w http.ResponseWriter, r *http.Request) {
    productID := r.PathValue("id")
    data, err := bff.client.InvokeMethod(
        context.Background(), "product-service", "/products/"+productID, "GET",
    )
    if err != nil {
        http.Error(w, "product not found", 404)
        return
    }

    // Transform to partner-safe schema (strip internal fields)
    var internal InternalProduct
    json.Unmarshal(data, &internal)

    external := PartnerProductResponse{
        ProductID: internal.ID,
        Name:      internal.Name,
        Price:     internal.RetailPrice,
        Available: internal.Stock > 0,
    }
    json.NewEncoder(w).Encode(external)
}
```

## Summary

The BFF pattern with Dapr creates client-optimized API layers that aggregate and transform microservice data. Each BFF uses Dapr service invocation to fan out to multiple backends in parallel, then shapes the response for its specific client. This eliminates over-fetching on mobile, provides rich data for web, and enforces clean API contracts for partners - all without changing the underlying microservices.
