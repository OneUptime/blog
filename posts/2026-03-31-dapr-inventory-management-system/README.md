# How to Build an Inventory Management System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Inventory, Actor, State, Pub/Sub

Description: Learn how to build a distributed inventory management system using Dapr Actors for per-SKU stock tracking and pub/sub for reorder and reservation events.

---

## Overview

Inventory management requires accurate stock tracking across warehouses, reservation handling for in-progress orders, and automatic reorder triggers. Dapr Actors model each SKU as an actor, ensuring serialized stock operations that prevent overselling.

## Inventory Actor

```go
package main

import (
    "context"
    "fmt"
    "github.com/dapr/go-sdk/actor"
)

type StockLevel struct {
    SKU          string `json:"sku"`
    Available    int    `json:"available"`
    Reserved     int    `json:"reserved"`
    Committed    int    `json:"committed"`
    ReorderPoint int    `json:"reorderPoint"`
    ReorderQty   int    `json:"reorderQty"`
}

type InventoryActor struct {
    actor.ServerImplBaseCtx
}

func (a *InventoryActor) Type() string {
    return "Inventory"
}

func (a *InventoryActor) GetStock(ctx context.Context) (*StockLevel, error) {
    var stock StockLevel
    err := a.GetStateManager().Get(ctx, "stock", &stock)
    return &stock, err
}

func (a *InventoryActor) Reserve(ctx context.Context, req *struct{ Qty int; OrderID string }) error {
    var stock StockLevel
    a.GetStateManager().Get(ctx, "stock", &stock)

    if stock.Available < req.Qty {
        return fmt.Errorf("insufficient stock: have %d, need %d", stock.Available, req.Qty)
    }

    stock.Available -= req.Qty
    stock.Reserved += req.Qty
    err := a.GetStateManager().Set(ctx, "stock", stock)
    if err != nil {
        return err
    }
    a.checkReorder(ctx, stock)
    return nil
}

func (a *InventoryActor) Commit(ctx context.Context, req *struct{ Qty int; OrderID string }) error {
    var stock StockLevel
    a.GetStateManager().Get(ctx, "stock", &stock)

    if stock.Reserved < req.Qty {
        return fmt.Errorf("reservation not found")
    }

    stock.Reserved -= req.Qty
    stock.Committed += req.Qty
    return a.GetStateManager().Set(ctx, "stock", stock)
}

func (a *InventoryActor) Release(ctx context.Context, req *struct{ Qty int; OrderID string }) error {
    var stock StockLevel
    a.GetStateManager().Get(ctx, "stock", &stock)

    stock.Reserved -= req.Qty
    stock.Available += req.Qty
    return a.GetStateManager().Set(ctx, "stock", stock)
}

func (a *InventoryActor) Receive(ctx context.Context, req *struct{ Qty int; PurchaseOrderID string }) error {
    var stock StockLevel
    a.GetStateManager().Get(ctx, "stock", &stock)

    stock.Available += req.Qty
    err := a.GetStateManager().Set(ctx, "stock", stock)
    if err != nil {
        return err
    }

    // Publish stock received event
    daprClient.PublishEvent(ctx, "pubsub", "stock-received", map[string]any{
        "sku": stock.SKU,
        "qty": req.Qty,
        "newLevel": stock.Available,
    })
    return nil
}

func (a *InventoryActor) checkReorder(ctx context.Context, stock StockLevel) {
    if stock.Available <= stock.ReorderPoint {
        daprClient.PublishEvent(ctx, "pubsub", "reorder-triggered", map[string]any{
            "sku":        stock.SKU,
            "currentQty": stock.Available,
            "reorderQty": stock.ReorderQty,
        })
    }
}
```

## Multi-Warehouse Support

```go
func reserveAcrossWarehouses(daprClient dapr.Client, sku string, qty int, orderID string) (string, error) {
    warehouses := []string{"warehouse-east", "warehouse-west", "warehouse-central"}

    for _, warehouse := range warehouses {
        actorID := fmt.Sprintf("%s@%s", sku, warehouse)
        resp, err := daprClient.InvokeActor(context.Background(), &dapr.InvokeActorRequest{
            ActorType: "Inventory",
            ActorID:   actorID,
            Method:    "GetStock",
        })
        if err != nil {
            continue
        }
        var stock StockLevel
        if err := json.Unmarshal(resp.Data, &stock); err != nil || stock.Available < qty {
            continue
        }

        reqData, _ := json.Marshal(struct{ Qty int; OrderID string }{qty, orderID})
        _, err = daprClient.InvokeActor(context.Background(), &dapr.InvokeActorRequest{
            ActorType: "Inventory",
            ActorID:   actorID,
            Method:    "Reserve",
            Data:      reqData,
        })
        if err == nil {
            return warehouse, nil
        }
    }
    return "", fmt.Errorf("no warehouse has sufficient stock")
}
```

## Inventory Adjustment API

```go
func handleStockAdjustment(w http.ResponseWriter, r *http.Request) {
    sku := r.PathValue("sku")
    var req struct {
        Qty    int    `json:"qty"`
        Reason string `json:"reason"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    actorID := sku + "@warehouse-central"
    reqData, _ := json.Marshal(struct{ Qty int; PurchaseOrderID string }{req.Qty, "ADJ-" + uuid.New().String()})
    _, err := daprClient.InvokeActor(r.Context(), &dapr.InvokeActorRequest{
        ActorType: "Inventory",
        ActorID:   actorID,
        Method:    "Receive",
        Data:      reqData,
    })
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

## Reorder Handler

```go
func handleReorderTriggered(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event struct {
        SKU        string `json:"sku"`
        CurrentQty int    `json:"currentQty"`
        ReorderQty int    `json:"reorderQty"`
    }
    json.Unmarshal(e.RawData, &event)

    // Create purchase order
    log.Printf("Auto-reorder triggered for SKU %s: ordering %d units", event.SKU, event.ReorderQty)
    return false, createPurchaseOrder(event.SKU, event.ReorderQty)
}
```

## Summary

Dapr Actors provide serialized, stateful stock management per SKU, eliminating the race conditions that cause overselling. Reservations move stock between available and reserved pools atomically, commits finalize sales, and releases return unsold reservations. Automatic reorder triggers via pub/sub events close the loop from low stock detection to purchase order creation.
