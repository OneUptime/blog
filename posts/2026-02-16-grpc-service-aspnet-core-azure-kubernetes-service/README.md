# How to Build a gRPC Service in ASP.NET Core and Deploy It to Azure Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, gRPC, ASP.NET Core, Kubernetes, AKS, C#, Microservices

Description: Build a gRPC service in ASP.NET Core with Protocol Buffers and deploy it to Azure Kubernetes Service with load balancing and health checks.

---

gRPC is a high-performance RPC framework that uses Protocol Buffers for serialization. Compared to REST APIs with JSON, gRPC is faster (binary serialization), strongly typed (contract-first with .proto files), and supports streaming. It is the natural choice for service-to-service communication in microservice architectures. Azure Kubernetes Service (AKS) provides the infrastructure to run and scale these services.

In this post, I will build a gRPC service in ASP.NET Core and deploy it to AKS with proper health checks and load balancing.

## Creating the gRPC Service

Start with the gRPC project template.

```bash
dotnet new grpc -n ProductService
cd ProductService
```

## Defining the Service Contract

gRPC services start with a .proto file that defines the contract.

```protobuf
// Protos/product.proto
syntax = "proto3";

option csharp_namespace = "ProductService";

package product;

// The product service definition
service ProductCatalog {
    // Get a single product by ID
    rpc GetProduct (GetProductRequest) returns (ProductResponse);

    // List products with filtering
    rpc ListProducts (ListProductsRequest) returns (ListProductsResponse);

    // Create a new product
    rpc CreateProduct (CreateProductRequest) returns (ProductResponse);

    // Update an existing product
    rpc UpdateProduct (UpdateProductRequest) returns (ProductResponse);

    // Delete a product
    rpc DeleteProduct (DeleteProductRequest) returns (DeleteProductResponse);

    // Stream products matching a filter (server streaming)
    rpc StreamProducts (ListProductsRequest) returns (stream ProductResponse);
}

message GetProductRequest {
    int32 id = 1;
}

message ListProductsRequest {
    string category = 1;
    int32 page = 2;
    int32 page_size = 3;
    double max_price = 4;
}

message CreateProductRequest {
    string name = 1;
    string description = 2;
    double price = 3;
    string category = 4;
    int32 stock_quantity = 5;
}

message UpdateProductRequest {
    int32 id = 1;
    string name = 2;
    double price = 3;
    int32 stock_quantity = 4;
}

message DeleteProductRequest {
    int32 id = 1;
}

message ProductResponse {
    int32 id = 1;
    string name = 2;
    string description = 3;
    double price = 4;
    string category = 5;
    int32 stock_quantity = 6;
    bool is_available = 7;
    string created_at = 8;
}

message ListProductsResponse {
    repeated ProductResponse products = 1;
    int32 total_count = 2;
}

message DeleteProductResponse {
    bool success = 1;
}
```

## Implementing the Service

The gRPC service implements the interface generated from the .proto file.

```csharp
// Services/ProductCatalogService.cs
using Grpc.Core;
using ProductService;

public class ProductCatalogService : ProductCatalog.ProductCatalogBase
{
    private readonly ILogger<ProductCatalogService> _logger;

    // In-memory store (use a real database in production)
    private static readonly Dictionary<int, ProductData> _products = new();
    private static int _nextId = 1;

    public ProductCatalogService(ILogger<ProductCatalogService> logger)
    {
        _logger = logger;
    }

    public override Task<ProductResponse> GetProduct(
        GetProductRequest request, ServerCallContext context)
    {
        _logger.LogInformation("GetProduct called for ID: {Id}", request.Id);

        if (!_products.TryGetValue(request.Id, out var product))
        {
            throw new RpcException(new Status(StatusCode.NotFound,
                $"Product with ID {request.Id} not found"));
        }

        return Task.FromResult(MapToResponse(product));
    }

    public override Task<ListProductsResponse> ListProducts(
        ListProductsRequest request, ServerCallContext context)
    {
        var query = _products.Values.AsEnumerable();

        // Apply filters
        if (!string.IsNullOrEmpty(request.Category))
        {
            query = query.Where(p => p.Category.Equals(
                request.Category, StringComparison.OrdinalIgnoreCase));
        }

        if (request.MaxPrice > 0)
        {
            query = query.Where(p => p.Price <= request.MaxPrice);
        }

        var totalCount = query.Count();

        // Apply pagination
        var pageSize = request.PageSize > 0 ? request.PageSize : 10;
        var page = request.Page > 0 ? request.Page : 1;

        var products = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToResponse)
            .ToList();

        return Task.FromResult(new ListProductsResponse
        {
            TotalCount = totalCount,
            Products = { products }
        });
    }

    public override Task<ProductResponse> CreateProduct(
        CreateProductRequest request, ServerCallContext context)
    {
        var product = new ProductData
        {
            Id = _nextId++,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            Category = request.Category,
            StockQuantity = request.StockQuantity,
            CreatedAt = DateTime.UtcNow
        };

        _products[product.Id] = product;
        _logger.LogInformation("Created product: {Name} (ID: {Id})", product.Name, product.Id);

        return Task.FromResult(MapToResponse(product));
    }

    public override Task<ProductResponse> UpdateProduct(
        UpdateProductRequest request, ServerCallContext context)
    {
        if (!_products.TryGetValue(request.Id, out var product))
        {
            throw new RpcException(new Status(StatusCode.NotFound,
                $"Product {request.Id} not found"));
        }

        if (!string.IsNullOrEmpty(request.Name)) product.Name = request.Name;
        if (request.Price > 0) product.Price = request.Price;
        if (request.StockQuantity >= 0) product.StockQuantity = request.StockQuantity;

        return Task.FromResult(MapToResponse(product));
    }

    public override Task<DeleteProductResponse> DeleteProduct(
        DeleteProductRequest request, ServerCallContext context)
    {
        var removed = _products.Remove(request.Id);
        return Task.FromResult(new DeleteProductResponse { Success = removed });
    }

    /// <summary>
    /// Server streaming - sends products one at a time to the client.
    /// Useful for large result sets.
    /// </summary>
    public override async Task StreamProducts(
        ListProductsRequest request,
        IServerStreamWriter<ProductResponse> responseStream,
        ServerCallContext context)
    {
        var query = _products.Values.AsEnumerable();

        if (!string.IsNullOrEmpty(request.Category))
        {
            query = query.Where(p => p.Category.Equals(
                request.Category, StringComparison.OrdinalIgnoreCase));
        }

        foreach (var product in query)
        {
            if (context.CancellationToken.IsCancellationRequested)
                break;

            await responseStream.WriteAsync(MapToResponse(product));
            await Task.Delay(100); // Simulate processing delay
        }
    }

    private static ProductResponse MapToResponse(ProductData data)
    {
        return new ProductResponse
        {
            Id = data.Id,
            Name = data.Name,
            Description = data.Description,
            Price = data.Price,
            Category = data.Category,
            StockQuantity = data.StockQuantity,
            IsAvailable = data.StockQuantity > 0,
            CreatedAt = data.CreatedAt.ToString("O")
        };
    }
}

// Internal data model
public class ProductData
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

## Configuring the Host

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add gRPC services
builder.Services.AddGrpc(options =>
{
    options.MaxReceiveMessageSize = 16 * 1024 * 1024; // 16 MB
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

// Add health checks
builder.Services.AddGrpcHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

var app = builder.Build();

// Map gRPC services
app.MapGrpcService<ProductCatalogService>();
app.MapGrpcHealthChecksService();

// Minimal HTTP endpoint for non-gRPC health checks (useful for Kubernetes)
app.MapGet("/", () => "gRPC ProductService is running");

app.Run();
```

## Creating the Dockerfile

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ProductService.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

# Set the port for Kestrel
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "ProductService.dll"]
```

## Building and Pushing the Image

```bash
# Create Azure Container Registry
az acr create --name mygrpcregistry --resource-group my-rg --sku Basic --admin-enabled true

# Build and push
az acr build --registry mygrpcregistry --image product-service:v1 .
```

## Setting Up AKS

```bash
# Create the AKS cluster
az aks create \
    --resource-group my-rg \
    --name my-aks-cluster \
    --node-count 2 \
    --node-vm-size Standard_B2s \
    --attach-acr mygrpcregistry \
    --generate-ssh-keys

# Get credentials for kubectl
az aks get-credentials \
    --resource-group my-rg \
    --name my-aks-cluster
```

## Kubernetes Deployment Manifest

Create the deployment and service manifests.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  labels:
    app: product-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
        - name: product-service
          image: mygrpcregistry.azurecr.io/product-service:v1
          ports:
            - containerPort: 8080
              protocol: TCP
          resources:
            requests:
              memory: "128Mi"
              cpu: "250m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          # Readiness probe using gRPC health check
          readinessProbe:
            grpc:
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          # Liveness probe
          livenessProbe:
            grpc:
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: "Production"
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: product-service
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  type: ClusterIP
```

## Deploying to AKS

```bash
# Apply the manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Verify the deployment
kubectl get pods
kubectl get services
```

## Exposing with an Ingress

For external access, set up an ingress controller that supports gRPC (HTTP/2).

```bash
# Install NGINX Ingress Controller with HTTP/2 support
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: product-service-ingress
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grpc.myapp.com
      secretName: tls-secret
  rules:
    - host: grpc.myapp.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 80
```

## Building a gRPC Client

Here is a .NET client for testing.

```csharp
// Client example
using Grpc.Net.Client;
using ProductService;

// Connect to the gRPC service
var channel = GrpcChannel.ForAddress("http://localhost:8080");
var client = new ProductCatalog.ProductCatalogClient(channel);

// Create a product
var created = await client.CreateProductAsync(new CreateProductRequest
{
    Name = "Wireless Mouse",
    Description = "Ergonomic wireless mouse",
    Price = 29.99,
    Category = "electronics",
    StockQuantity = 100
});

Console.WriteLine($"Created: {created.Name} (ID: {created.Id})");

// List products
var list = await client.ListProductsAsync(new ListProductsRequest
{
    Category = "electronics",
    Page = 1,
    PageSize = 10
});

Console.WriteLine($"Found {list.TotalCount} products");
```

## Scaling and Monitoring

```bash
# Scale the deployment
kubectl scale deployment product-service --replicas=5

# Set up Horizontal Pod Autoscaler
kubectl autoscale deployment product-service \
    --cpu-percent=70 \
    --min=2 \
    --max=10

# Check pod status and logs
kubectl get pods -l app=product-service
kubectl logs -l app=product-service --tail=50
```

## Best Practices

1. **Use gRPC health checks.** Kubernetes native gRPC probes (available since v1.24) work well.
2. **Enable HTTP/2** on your ingress controller. gRPC requires it.
3. **Set resource requests and limits.** This helps Kubernetes schedule pods efficiently.
4. **Use connection pooling** in gRPC clients. gRPC channels are expensive to create but cheap to reuse.
5. **Version your .proto files carefully.** Breaking changes in the contract break all clients.
6. **Use server streaming** for large result sets instead of returning massive messages.

## Wrapping Up

gRPC with ASP.NET Core on AKS gives you a high-performance service communication layer. The contract-first approach with .proto files keeps your API well-defined, the binary serialization is faster than JSON, and Kubernetes handles scaling and health management. The key is getting the infrastructure right - HTTP/2 ingress, proper health checks, and resource limits - and then the service itself is straightforward C# code.
