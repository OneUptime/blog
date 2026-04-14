# How to Use Dapr Go SDK with Gin Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Gin, HTTP, Microservice, SDK

Description: Build Dapr-enabled Go microservices using the Gin framework for routing, middleware, and request validation while connecting to Dapr building blocks via the Go SDK.

---

## Overview

Gin is one of the most popular Go HTTP frameworks. Combining it with the Dapr Go SDK lets you use Gin's powerful routing and middleware features while accessing Dapr building blocks for state, pub/sub, and service invocation. The integration requires manually implementing the Dapr subscription endpoint and CloudEvent handling.

## Installation

```bash
go get github.com/gin-gonic/gin@latest
go get github.com/dapr/go-sdk/client@latest
```

## Application Setup

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    dapr "github.com/dapr/go-sdk/client"
)

type App struct {
    dapr dapr.Client
}

func main() {
    daprClient, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer daprClient.Close()

    app := &App{dapr: daprClient}

    r := gin.Default()

    // Dapr required endpoints
    r.GET("/dapr/subscribe", app.subscribeHandler)

    // Business API
    api := r.Group("/api/v1")
    {
        api.GET("/products/:id", app.getProduct)
        api.POST("/products", app.createProduct)
        api.POST("/orders", app.placeOrder)
    }

    // Dapr event handlers
    events := r.Group("/events")
    {
        events.POST("/inventory-updated", app.handleInventoryUpdated)
    }

    r.Run(":8080")
}
```

## Subscription Registration

```go
type DaprSubscription struct {
    PubsubName string `json:"pubsubname"`
    Topic      string `json:"topic"`
    Route      string `json:"route"`
}

func (a *App) subscribeHandler(c *gin.Context) {
    subscriptions := []DaprSubscription{
        {PubsubName: "pubsub", Topic: "inventory-updated", Route: "/events/inventory-updated"},
    }
    c.JSON(http.StatusOK, subscriptions)
}
```

## State Management in Gin Handlers

```go
type Product struct {
    ID    string  `json:"id" binding:"required"`
    Name  string  `json:"name" binding:"required"`
    Price float64 `json:"price" binding:"required,gt=0"`
}

func (a *App) createProduct(c *gin.Context) {
    var p Product
    if err := c.ShouldBindJSON(&p); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    data, _ := json.Marshal(p)
    if err := a.dapr.SaveState(c.Request.Context(), "statestore", "product:"+p.ID, data, nil); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save product"})
        return
    }

    c.JSON(http.StatusCreated, p)
}

func (a *App) getProduct(c *gin.Context) {
    id := c.Param("id")
    item, err := a.dapr.GetState(c.Request.Context(), "statestore", "product:"+id, nil)
    if err != nil || item.Value == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
        return
    }

    var p Product
    json.Unmarshal(item.Value, &p)
    c.JSON(http.StatusOK, p)
}
```

## CloudEvent Handler in Gin

```go
func (a *App) handleInventoryUpdated(c *gin.Context) {
    var event struct {
        Data struct {
            ProductID string `json:"productId"`
            Stock     int    `json:"stock"`
        } `json:"data"`
    }

    if err := c.ShouldBindJSON(&event); err != nil {
        c.Status(http.StatusBadRequest)
        return
    }

    log.Printf("Inventory update: product=%s stock=%d",
        event.Data.ProductID, event.Data.Stock)

    c.Status(http.StatusOK)
}
```

## Running with Dapr CLI

```bash
dapr run --app-id product-service --app-port 8080 --app-protocol http \
  --resources-path ./components -- go run main.go
```

## Summary

Gin and Dapr work well together when you manually implement the `/dapr/subscribe` route and parse CloudEvents in your handlers. The `App` struct pattern keeps the `DaprClient` accessible to all handlers while remaining testable. Gin's `ShouldBindJSON` handles request validation before the Dapr state calls, keeping the handler logic clean.
