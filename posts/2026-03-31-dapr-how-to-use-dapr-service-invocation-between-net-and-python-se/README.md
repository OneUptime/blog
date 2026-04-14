# How to Use Dapr Service Invocation Between .NET and Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, DotNet, Python, Microservice

Description: Set up Dapr service invocation between a .NET caller and a Python service, including SDK usage, HTTP API, and error handling patterns.

---

## Overview

Dapr's service invocation API allows .NET services to call Python services (and vice versa) without managing service discovery, retries, or mTLS manually. This guide shows how to configure and call across these two runtimes using both the Dapr SDK and the raw HTTP API.

## Python Service Setup

Create a Flask app that serves as the target service:

```python
# python-service/app.py
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    # Simulated product lookup
    product = {
        "id": product_id,
        "name": f"Product {product_id}",
        "price": 29.99,
        "inStock": True
    }
    return jsonify(product)

@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json()
    return jsonify({"id": "new-001", **data}), 201

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Requirements:

```text
flask==3.0.0
```

Start with Dapr:

```bash
dapr run --app-id product-service --app-port 5000 -- python app.py
```

## .NET Caller Service

Create a .NET 8 Web API that calls the Python service:

```bash
dotnet new webapi -n catalog-service
cd catalog-service
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore
```

Register Dapr in Program.cs:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddDapr();

var app = builder.Build();
app.MapControllers();
app.Run();
```

Create a controller that invokes the Python service:

```csharp
// Controllers/CatalogController.cs
using Dapr.Client;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
public class CatalogController : ControllerBase
{
    private readonly DaprClient _daprClient;

    public CatalogController(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    [HttpGet("products/{productId}")]
    public async Task<IActionResult> GetProduct(string productId)
    {
        var product = await _daprClient.InvokeMethodAsync<ProductDto>(
            HttpMethod.Get,
            "product-service",
            $"products/{productId}"
        );
        return Ok(product);
    }

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest req)
    {
        var result = await _daprClient.InvokeMethodAsync<CreateProductRequest, ProductDto>(
            "product-service",
            "products",
            req
        );
        return CreatedAtAction(nameof(GetProduct), new { productId = result.Id }, result);
    }
}

public record ProductDto(string Id, string Name, decimal Price, bool InStock);
public record CreateProductRequest(string Name, decimal Price);
```

## Using the HTTP API Directly

If you prefer not to use the SDK, use .NET's HttpClient:

```csharp
// Without SDK - raw HTTP to Dapr sidecar
public class ProductServiceClient
{
    private readonly HttpClient _httpClient;
    private const string DaprPort = "3500";

    public ProductServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri($"http://localhost:{DaprPort}");
    }

    public async Task<ProductDto?> GetProductAsync(string productId)
    {
        var response = await _httpClient.GetAsync(
            $"/v1.0/invoke/product-service/method/products/{productId}"
        );
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProductDto>();
    }
}
```

## Error Handling

Handle service invocation errors gracefully:

```csharp
using Dapr.Client;
using Grpc.Core;

[HttpGet("products/{productId}")]
public async Task<IActionResult> GetProductWithErrorHandling(string productId)
{
    try
    {
        var product = await _daprClient.InvokeMethodAsync<ProductDto>(
            HttpMethod.Get,
            "product-service",
            $"products/{productId}"
        );
        return Ok(product);
    }
    catch (InvocationException ex) when (ex.Response?.StatusCode == System.Net.HttpStatusCode.NotFound)
    {
        return NotFound($"Product {productId} not found");
    }
    catch (RpcException ex) when (ex.StatusCode == StatusCode.Unavailable)
    {
        return StatusCode(503, "Product service is temporarily unavailable");
    }
}
```

## Running Both Services

For local development with Docker Compose:

```yaml
version: '3.8'
services:
  product-service:
    build: ./python-service
    ports:
    - "5000:5000"

  product-service-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "product-service", "-app-port", "5000"]
    network_mode: "service:product-service"

  catalog-service:
    build: ./catalog-service
    ports:
    - "8080:8080"
    environment:
      ASPNETCORE_URLS: "http://+:8080"

  catalog-service-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "catalog-service", "-app-port", "8080"]
    network_mode: "service:catalog-service"
```

```bash
docker-compose up -d

# Test the .NET -> Python call
curl http://localhost:8080/catalog/products/prod-001
```

## Configuring Resiliency

Add a Resiliency policy to handle Python service downtime:

```yaml
# resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: catalog-resiliency
spec:
  policies:
    retries:
      retryOnFailure:
        policy: exponential
        maxRetries: 3
        maxInterval: 5s
    timeouts:
      defaultTimeout: 10s
  targets:
    apps:
      product-service:
        retry: retryOnFailure
        timeout: defaultTimeout
```

## Summary

Dapr service invocation removes the friction of cross-language service communication between .NET and Python. The Dapr SDK for .NET provides a typed, strongly-typed API for invoking methods on other services, while the raw HTTP API works with any HTTP client. Resiliency policies apply uniformly regardless of the target language, ensuring consistent retry and timeout behavior without duplicating logic in each service.
