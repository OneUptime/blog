# How to Build an E-Commerce Platform with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, E-Commerce, Microservice, Workflow, Architecture

Description: Learn how to architect and build a complete e-commerce platform using Dapr building blocks for state, pub/sub, workflows, and service invocation.

---

## Overview

A modern e-commerce platform requires reliable order processing, inventory management, payment handling, and notification delivery. Dapr's building blocks provide the foundation to build each of these concerns as independent microservices that work together reliably.

## Service Architecture

```text
API Gateway
  |-- product-service    (catalog, search)
  |-- cart-service       (shopping cart state)
  |-- order-service      (order lifecycle)
  |-- payment-service    (payment processing)
  |-- inventory-service  (stock management)
  |-- notification-service (email/SMS)
  |-- shipping-service   (fulfillment)
```

## Cart Service with Dapr State

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

type CartItem struct {
    ProductID string  `json:"productId"`
    Name      string  `json:"name"`
    Price     float64 `json:"price"`
    Quantity  int     `json:"quantity"`
}

type Cart struct {
    UserID    string     `json:"userId"`
    Items     []CartItem `json:"items"`
    UpdatedAt int64      `json:"updatedAt"`
}

func addToCart(client dapr.Client, userID, productID string, qty int) error {
    ctx := context.Background()

    // Load existing cart
    item, _ := client.GetState(ctx, "statestore", "cart:"+userID, nil)
    var cart Cart
    if item.Value != nil {
        json.Unmarshal(item.Value, &cart)
    }

    // Get product details
    productData, _ := client.InvokeMethod(ctx, "product-service", "/products/"+productID, "GET")
    var product struct {
        Name  string  `json:"name"`
        Price float64 `json:"price"`
    }
    json.Unmarshal(productData, &product)

    // Update cart
    for i, ci := range cart.Items {
        if ci.ProductID == productID {
            cart.Items[i].Quantity += qty
            goto save
        }
    }
    cart.Items = append(cart.Items, CartItem{
        ProductID: productID, Name: product.Name,
        Price: product.Price, Quantity: qty,
    })

save:
    data, _ := json.Marshal(cart)
    return client.SaveState(ctx, "statestore", "cart:"+userID, data, nil)
}
```

## Order Processing Workflow

```go
func OrderProcessingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Step 1: Validate and reserve inventory
    var reservation InventoryReservation
    if err := ctx.CallActivity(ReserveInventory, workflow.ActivityInput(order)).Await(&reservation); err != nil {
        return nil, fmt.Errorf("out of stock: %w", err)
    }

    // Step 2: Process payment
    var payment PaymentResult
    if err := ctx.CallActivity(ProcessPayment, workflow.ActivityInput(order)).Await(&payment); err != nil {
        ctx.CallActivity(ReleaseInventory, workflow.ActivityInput(reservation.ID)).Await(nil)
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    // Step 3: Create shipment
    var shipment ShipmentResult
    ctx.CallActivity(CreateShipment, workflow.ActivityInput(order)).Await(&shipment)

    // Step 4: Notify customer
    ctx.CallActivity(SendConfirmationEmail, workflow.ActivityInput(map[string]string{
        "orderId":    order.ID,
        "customerEmail": order.CustomerEmail,
        "shipmentId": shipment.TrackingNumber,
    })).Await(nil)

    return map[string]string{
        "orderId":        order.ID,
        "status":         "confirmed",
        "trackingNumber": shipment.TrackingNumber,
    }, nil
}
```

## Product Search with Dapr State

```go
func searchProducts(client dapr.Client, query, category string) ([]Product, error) {
    ctx := context.Background()

    // Cache check
    cacheKey := fmt.Sprintf("search:%s:%s", category, query)
    cached, _ := client.GetState(ctx, "cache-store", cacheKey, nil)
    if cached.Value != nil {
        var products []Product
        json.Unmarshal(cached.Value, &products)
        return products, nil
    }

    // Call product service
    data, err := client.InvokeMethod(ctx, "product-service",
        fmt.Sprintf("/search?q=%s&cat=%s", query, category), "GET")
    if err != nil {
        return nil, err
    }

    // Cache for 5 minutes
    client.SaveState(ctx, "cache-store", cacheKey, data,
        map[string]string{"ttlInSeconds": "300"})

    var products []Product
    json.Unmarshal(data, &products)
    return products, nil
}
```

## Event-Driven Inventory Updates

```go
// Subscribe to order events to update inventory
func handleOrderConfirmed(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    for _, item := range order.Items {
        // Decrement inventory
        inventoryKey := "inventory:" + item.ProductID
        inv, _ := daprClient.GetState(ctx, "statestore", inventoryKey, nil)
        var stock int
        json.Unmarshal(inv.Value, &stock)
        stock -= item.Quantity

        stockData, _ := json.Marshal(stock)
        daprClient.SaveState(ctx, "statestore", inventoryKey, stockData, nil)

        // Alert if low stock
        if stock < 10 {
            daprClient.PublishEvent(ctx, "pubsub", "inventory.low-stock",
                map[string]interface{}{"productId": item.ProductID, "stock": stock})
        }
    }
    return false, nil
}
```

## Summary

Dapr provides the building blocks for a complete e-commerce platform: state stores for cart and inventory management, Workflow for reliable order processing with saga-style compensation, service invocation for synchronous calls between services, and pub/sub for event-driven inventory updates and notifications. Each microservice remains simple while Dapr handles the distributed systems complexity.
