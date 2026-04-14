# How to Use Dapr Service Invocation Between Go and .NET Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Go, DotNet, Microservice

Description: Implement Dapr service invocation between Go and .NET services using the Dapr Go SDK and .NET client for reliable cross-language communication.

---

## Overview

Go and .NET are a common pairing in microservices architectures - Go for high-throughput backend services and .NET for business logic or API layers. Dapr service invocation enables seamless communication between them without language-specific integrations. This guide covers both directions: Go calling .NET and .NET calling Go.

## Go Target Service

Create a Go HTTP service that the .NET service will call:

```go
// pricing-service/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"
)

type PriceRequest struct {
    ProductID string  `json:"productId"`
    Quantity  int     `json:"quantity"`
    Currency  string  `json:"currency"`
}

type PriceResponse struct {
    ProductID  string  `json:"productId"`
    UnitPrice  float64 `json:"unitPrice"`
    TotalPrice float64 `json:"totalPrice"`
    Currency   string  `json:"currency"`
}

var prices = map[string]float64{
    "prod-001": 49.99,
    "prod-002": 19.99,
    "prod-003": 99.99,
}

func calculatePriceHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req PriceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    unitPrice, exists := prices[req.ProductID]
    if !exists {
        http.Error(w, "Product not found", http.StatusNotFound)
        return
    }

    resp := PriceResponse{
        ProductID:  req.ProductID,
        UnitPrice:  unitPrice,
        TotalPrice: unitPrice * float64(req.Quantity),
        Currency:   req.Currency,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func getPriceHandler(w http.ResponseWriter, r *http.Request) {
    parts := strings.Split(r.URL.Path, "/")
    productID := parts[len(parts)-1]

    unitPrice, exists := prices[productID]
    if !exists {
        http.Error(w, "Product not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "productId": productID,
        "unitPrice": unitPrice,
    })
}

func main() {
    http.HandleFunc("/prices/calculate", calculatePriceHandler)
    http.HandleFunc("/prices/", getPriceHandler)
    log.Printf("Pricing service listening on :8081")
    log.Fatal(http.ListenAndServe(":8081", nil))
}
```

Start with Dapr:

```bash
dapr run --app-id pricing-service --app-port 8081 -- go run main.go
```

## .NET Service Calling Go

Install the Dapr .NET SDK:

```bash
dotnet add package Dapr.Client
```

Create a pricing client using the Dapr SDK:

```csharp
// Services/PricingClient.cs
using Dapr.Client;

public class PricingClient
{
    private readonly DaprClient _daprClient;
    private const string PricingAppId = "pricing-service";

    public PricingClient(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task<PriceResponse> CalculatePriceAsync(PriceRequest request)
    {
        return await _daprClient.InvokeMethodAsync<PriceRequest, PriceResponse>(
            "pricing-service",
            "prices/calculate",
            request
        );
    }

    public async Task<ProductPrice> GetPriceAsync(string productId)
    {
        return await _daprClient.InvokeMethodAsync<ProductPrice>(
            HttpMethod.Get,
            PricingAppId,
            $"prices/{productId}"
        );
    }
}

public record PriceRequest(string ProductId, int Quantity, string Currency = "USD");
public record PriceResponse(string ProductId, decimal UnitPrice, decimal TotalPrice, string Currency);
public record ProductPrice(string ProductId, decimal UnitPrice);
```

Use the client in a controller:

```csharp
// Controllers/CheckoutController.cs
[ApiController]
[Route("[controller]")]
public class CheckoutController : ControllerBase
{
    private readonly PricingClient _pricingClient;

    public CheckoutController(PricingClient pricingClient)
    {
        _pricingClient = pricingClient;
    }

    [HttpPost("quote")]
    public async Task<IActionResult> GetQuote([FromBody] QuoteRequest request)
    {
        var price = await _pricingClient.CalculatePriceAsync(
            new PriceRequest(request.ProductId, request.Quantity)
        );
        return Ok(price);
    }
}

public record QuoteRequest(string ProductId, int Quantity);
```

Register services in Program.cs:

```csharp
builder.Services.AddDaprClient();
builder.Services.AddScoped<PricingClient>();
```

## Go Calling .NET

Add the Dapr Go SDK:

```bash
go get github.com/dapr/go-sdk/client
```

Create a Go service that invokes a .NET service:

```go
// analytics-service/main.go
package main

import (
    "context"
    "encoding/json"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

type OrderSummary struct {
    OrderID   string  `json:"orderId"`
    ProductID string  `json:"productId"`
    Quantity  int     `json:"quantity"`
    Total     float64 `json:"total"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatalf("Failed to create Dapr client: %v", err)
    }
    defer client.Close()

    ctx := context.Background()

    // Invoke .NET order service
    req := OrderSummary{
        ProductID: "prod-001",
        Quantity:  3,
    }

    content, err := json.Marshal(req)
    if err != nil {
        log.Fatalf("Failed to marshal request: %v", err)
    }

    resp, err := client.InvokeMethodWithContent(
        ctx,
        "checkout-service",  // .NET service app-id
        "checkout/quote",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data:        content,
        },
    )
    if err != nil {
        log.Fatalf("Failed to invoke method: %v", err)
    }

    log.Printf("Response from .NET service: %s", string(resp))
}
```

## Docker Compose Configuration

```yaml
version: '3.8'
services:
  pricing-service:
    build: ./pricing-service
    ports:
    - "8081:8081"

  pricing-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "pricing-service", "-app-port", "8081"]
    network_mode: "service:pricing-service"

  checkout-service:
    build: ./checkout-service
    ports:
    - "8080:8080"
    environment:
      ASPNETCORE_URLS: "http://+:8080"

  checkout-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "checkout-service", "-app-port", "8080"]
    network_mode: "service:checkout-service"
```

## Testing

```bash
docker-compose up -d

# .NET calling Go
curl -X POST http://localhost:8080/checkout/quote \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod-001", "quantity": 5}'

# Direct Go pricing service
curl http://localhost:8081/prices/prod-001
```

## Summary

Dapr service invocation between Go and .NET services is straightforward once both services run with a Dapr sidecar. The Go SDK provides a client with InvokeMethodWithContent for flexible invocation, while the .NET SDK offers strongly typed generic methods. Both directions work the same way - each service only needs to know the target's app-id and method path, with Dapr handling service discovery, mTLS, and observability automatically.
