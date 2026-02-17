# How to Deploy a gRPC Server on Cloud Run and Connect to It from a Client Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, gRPC, API Development, Microservices

Description: A complete guide to deploying a gRPC server on Cloud Run with HTTP/2 support, including protobuf definitions, server implementation, client code, and health checking configuration.

---

Cloud Run has full support for gRPC, which makes it a great platform for deploying gRPC services without managing infrastructure. gRPC's binary protocol, built-in code generation, and streaming capabilities make it a strong choice for service-to-service communication. Cloud Run handles HTTP/2 natively, which is what gRPC runs on.

Let me walk through deploying a gRPC service from scratch - from protobuf definitions to a deployed, working service with client code.

## Step 1: Define the Protobuf Service

Start with the service definition. This example is a simple product catalog service:

```protobuf
// proto/catalog.proto - Product catalog service definition
syntax = "proto3";

package catalog;

option go_package = "github.com/myorg/catalog/proto";

// The product catalog service
service ProductCatalog {
  // Get a single product by ID
  rpc GetProduct (GetProductRequest) returns (Product);

  // List all products with optional filtering
  rpc ListProducts (ListProductsRequest) returns (ListProductsResponse);

  // Search products by query string
  rpc SearchProducts (SearchRequest) returns (stream Product);
}

message GetProductRequest {
  string id = 1;
}

message ListProductsRequest {
  int32 page_size = 1;
  string page_token = 2;
  string category = 3;
}

message ListProductsResponse {
  repeated Product products = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

message SearchRequest {
  string query = 1;
  int32 max_results = 2;
}

message Product {
  string id = 1;
  string name = 2;
  string description = 3;
  double price = 4;
  string category = 5;
  bool in_stock = 6;
}
```

## Step 2: Implement the gRPC Server

Here is a Python implementation of the gRPC server:

```python
# server.py - gRPC server implementation for the product catalog
import os
import grpc
from concurrent import futures
import catalog_pb2
import catalog_pb2_grpc
from grpc_health.v1 import health
from grpc_health.v1 import health_pb2
from grpc_health.v1 import health_pb2_grpc

# Sample product data (in production, this would come from a database)
PRODUCTS = {
    "1": {"id": "1", "name": "Laptop Pro 16", "description": "High-performance laptop", "price": 1299.99, "category": "electronics", "in_stock": True},
    "2": {"id": "2", "name": "Wireless Mouse", "description": "Ergonomic wireless mouse", "price": 49.99, "category": "electronics", "in_stock": True},
    "3": {"id": "3", "name": "Standing Desk", "description": "Adjustable standing desk", "price": 599.99, "category": "furniture", "in_stock": False},
    "4": {"id": "4", "name": "Monitor 27 4K", "description": "27-inch 4K display", "price": 449.99, "category": "electronics", "in_stock": True},
    "5": {"id": "5", "name": "Desk Lamp", "description": "LED desk lamp with dimmer", "price": 39.99, "category": "furniture", "in_stock": True},
}

class ProductCatalogServicer(catalog_pb2_grpc.ProductCatalogServicer):
    """Implementation of the ProductCatalog gRPC service."""

    def GetProduct(self, request, context):
        """Return a single product by ID."""
        product_data = PRODUCTS.get(request.id)
        if not product_data:
            context.abort(grpc.StatusCode.NOT_FOUND, f"Product {request.id} not found")
        return catalog_pb2.Product(**product_data)

    def ListProducts(self, request, context):
        """Return a paginated list of products, optionally filtered by category."""
        products = list(PRODUCTS.values())

        # Filter by category if specified
        if request.category:
            products = [p for p in products if p["category"] == request.category]

        # Simple pagination
        page_size = request.page_size or 10
        start = 0
        if request.page_token:
            start = int(request.page_token)

        page = products[start:start + page_size]
        next_token = str(start + page_size) if start + page_size < len(products) else ""

        return catalog_pb2.ListProductsResponse(
            products=[catalog_pb2.Product(**p) for p in page],
            next_page_token=next_token,
            total_count=len(products)
        )

    def SearchProducts(self, request, context):
        """Stream products matching the search query."""
        query = request.query.lower()
        count = 0
        max_results = request.max_results or 10

        for product_data in PRODUCTS.values():
            if count >= max_results:
                break
            if query in product_data["name"].lower() or query in product_data["description"].lower():
                yield catalog_pb2.Product(**product_data)
                count += 1

def serve():
    """Start the gRPC server with health checking."""
    port = os.environ.get("PORT", "8080")

    # Create the gRPC server with a thread pool
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Register the product catalog service
    catalog_pb2_grpc.add_ProductCatalogServicer_to_server(
        ProductCatalogServicer(), server
    )

    # Register the health checking service (required for Cloud Run)
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # Set the service as healthy
    health_servicer.set("catalog.ProductCatalog", health_pb2.HealthCheckResponse.SERVING)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)

    # Listen on all interfaces (required for Cloud Run)
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"gRPC server started on port {port}")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
```

Generate the Python gRPC code from the proto file:

```bash
# Generate Python gRPC code from the protobuf definition
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=. \
  --grpc_python_out=. \
  proto/catalog.proto
```

## Step 3: Create the Dockerfile

```dockerfile
# Dockerfile for the gRPC server
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate gRPC code
COPY proto/ proto/
RUN python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=. \
    --grpc_python_out=. \
    proto/catalog.proto

# Copy server code
COPY server.py .

# Cloud Run uses the PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD ["python", "server.py"]
```

The requirements:

```
grpcio==1.60.*
grpcio-tools==1.60.*
grpcio-health-checking==1.60.*
protobuf==4.*
```

## Step 4: Build and Deploy

Build the container:

```bash
# Build and push the gRPC server image
gcloud builds submit . \
  --tag=us-central1-docker.pkg.dev/my-project/my-repo/catalog-grpc:v1
```

Deploy to Cloud Run with HTTP/2 enabled:

```bash
# Deploy the gRPC service with HTTP/2 support
gcloud run deploy catalog-grpc \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/catalog-grpc:v1 \
  --region=us-central1 \
  --use-http2 \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=1 \
  --concurrency=80
```

The `--use-http2` flag is essential for gRPC. Without it, gRPC calls will fail because gRPC requires HTTP/2.

## Step 5: Configure Health Checks

Cloud Run can use gRPC health checks to verify your service is running:

```bash
# Deploy with gRPC startup probe
gcloud run deploy catalog-grpc \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/catalog-grpc:v1 \
  --region=us-central1 \
  --use-http2 \
  --startup-probe-type=grpc \
  --startup-probe-port=8080 \
  --liveness-probe-type=grpc \
  --liveness-probe-port=8080
```

This uses the gRPC health checking protocol that we registered in the server code.

## Step 6: Write the Client

Here is a Python client that connects to the Cloud Run gRPC service:

```python
# client.py - gRPC client for the product catalog service
import grpc
import catalog_pb2
import catalog_pb2_grpc

def run_client(target):
    """Connect to the gRPC server and make some calls."""

    # For Cloud Run, use SSL credentials (the .run.app domain has valid TLS)
    credentials = grpc.ssl_channel_credentials()
    channel = grpc.secure_channel(target, credentials)

    # Create the stub (client)
    stub = catalog_pb2_grpc.ProductCatalogStub(channel)

    # Get a single product
    print("--- GetProduct ---")
    product = stub.GetProduct(catalog_pb2.GetProductRequest(id="1"))
    print(f"Product: {product.name}, Price: ${product.price}")

    # List products in a category
    print("\n--- ListProducts (electronics) ---")
    response = stub.ListProducts(
        catalog_pb2.ListProductsRequest(category="electronics", page_size=10)
    )
    for product in response.products:
        print(f"  {product.name}: ${product.price} (in stock: {product.in_stock})")
    print(f"  Total: {response.total_count}")

    # Search with server streaming
    print("\n--- SearchProducts (desk) ---")
    results = stub.SearchProducts(
        catalog_pb2.SearchRequest(query="desk", max_results=5)
    )
    for product in results:
        print(f"  {product.name}: {product.description}")

    channel.close()

if __name__ == "__main__":
    # Use the Cloud Run service URL without the https:// prefix
    # Cloud Run gRPC requires port 443
    target = "catalog-grpc-abc123-uc.a.run.app:443"
    run_client(target)
```

For authenticated services, add identity token credentials:

```python
# Authenticated gRPC client for Cloud Run
import grpc
import google.auth.transport.grpc
import google.auth.transport.requests
import google.oauth2.id_token

def get_authenticated_channel(target, audience):
    """Create a gRPC channel with Google ID token authentication."""
    # Fetch an ID token for the target service
    request = google.auth.transport.requests.Request()
    id_token = google.oauth2.id_token.fetch_id_token(request, audience)

    # Create call credentials with the ID token
    call_credentials = grpc.access_token_call_credentials(id_token)
    channel_credentials = grpc.ssl_channel_credentials()

    # Combine channel and call credentials
    composite_credentials = grpc.composite_channel_credentials(
        channel_credentials, call_credentials
    )

    return grpc.secure_channel(target, composite_credentials)
```

## Testing Locally with grpcurl

You can test your gRPC service using grpcurl:

```bash
# Test the deployed service using grpcurl
# List available services
grpcurl catalog-grpc-abc123-uc.a.run.app:443 list

# Call GetProduct
grpcurl -d '{"id": "1"}' \
  catalog-grpc-abc123-uc.a.run.app:443 \
  catalog.ProductCatalog/GetProduct

# Call ListProducts
grpcurl -d '{"category": "electronics", "page_size": 5}' \
  catalog-grpc-abc123-uc.a.run.app:443 \
  catalog.ProductCatalog/ListProducts
```

## Important Considerations

A few things to keep in mind when running gRPC on Cloud Run:

1. **Unary and server streaming work great.** Client streaming and bidirectional streaming have limitations because Cloud Run's request timeout applies to the entire stream.

2. **Cloud Run terminates TLS.** Your gRPC server runs with insecure (non-TLS) transport inside the container. Cloud Run handles TLS at the edge.

3. **Connection reuse matters.** gRPC clients should reuse channels. Creating a new channel for every request adds significant overhead.

4. **Set appropriate deadlines.** Always set deadlines on gRPC calls to avoid hanging connections. Cloud Run has a request timeout (default 5 minutes, max 60 minutes).

5. **Reflection helps debugging.** Enable gRPC reflection in development to allow tools like grpcurl to discover your services without the proto files.

gRPC on Cloud Run gives you the performance benefits of binary protocols with the operational simplicity of serverless. It is a solid combination for microservices that need efficient, type-safe communication.
