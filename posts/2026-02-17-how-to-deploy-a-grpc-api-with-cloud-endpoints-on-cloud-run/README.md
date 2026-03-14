# How to Deploy a gRPC API with Cloud Endpoints on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, gRPC, Cloud Run, API Management

Description: Learn how to deploy a gRPC API with Google Cloud Endpoints on Cloud Run, including protobuf configuration, ESPv2 setup, and service deployment.

---

Cloud Endpoints supports gRPC APIs alongside REST APIs. If you are building a gRPC service and want API management features like authentication, monitoring, and quota enforcement, Cloud Endpoints provides them without requiring changes to your gRPC server code.

This guide covers deploying a gRPC API with Cloud Endpoints on Cloud Run, from defining your protobuf service to configuring ESPv2 and testing the deployed service.

## How gRPC Works with Cloud Endpoints

For gRPC APIs, Cloud Endpoints uses a gRPC service configuration file instead of an OpenAPI specification. The flow is:

1. You define your service in a `.proto` file
2. You create a gRPC service configuration (`.yaml`) that references the proto descriptor
3. You deploy the service configuration to Service Management
4. ESPv2 proxies gRPC requests to your backend, handling authentication and monitoring

## Prerequisites

- A GCP project with billing enabled
- Protocol Buffers compiler (`protoc`) installed
- gRPC tools installed for your language
- Docker for building container images

```bash
# Enable required APIs
gcloud services enable \
  servicemanagement.googleapis.com \
  servicecontrol.googleapis.com \
  endpoints.googleapis.com \
  run.googleapis.com \
  --project=my-project-id

# Install protoc if not already installed (macOS)
brew install protobuf
```

## Step 1: Define the Protobuf Service

Create the `.proto` file that defines your gRPC service.

```protobuf
// bookstore.proto
// Defines a bookstore service with CRUD operations for books
syntax = "proto3";

package bookstore;

option go_package = "github.com/example/bookstore";

// The Bookstore service definition
service BookstoreService {
  // Get a list of all books
  rpc ListBooks(ListBooksRequest) returns (ListBooksResponse) {}

  // Get details of a specific book
  rpc GetBook(GetBookRequest) returns (Book) {}

  // Add a new book to the store
  rpc CreateBook(CreateBookRequest) returns (Book) {}

  // Update an existing book
  rpc UpdateBook(UpdateBookRequest) returns (Book) {}

  // Delete a book
  rpc DeleteBook(DeleteBookRequest) returns (DeleteBookResponse) {}
}

message Book {
  string id = 1;
  string title = 2;
  string author = 3;
  string isbn = 4;
  int32 year = 5;
  double price = 6;
}

message ListBooksRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListBooksResponse {
  repeated Book books = 1;
  string next_page_token = 2;
}

message GetBookRequest {
  string id = 1;
}

message CreateBookRequest {
  Book book = 1;
}

message UpdateBookRequest {
  string id = 1;
  Book book = 2;
}

message DeleteBookRequest {
  string id = 1;
}

message DeleteBookResponse {
  bool success = 1;
}
```

## Step 2: Generate the Proto Descriptor

Cloud Endpoints needs a compiled proto descriptor file, not the raw `.proto` source.

```bash
# Generate the proto descriptor set
# Include google/api annotations for HTTP transcoding (optional)
protoc \
  --include_imports \
  --include_source_info \
  --descriptor_set_out=bookstore.pb \
  --proto_path=. \
  bookstore.proto
```

If you want HTTP transcoding (allowing REST clients to call your gRPC service), add HTTP annotations.

```protobuf
// bookstore_with_http.proto
// Extended with HTTP annotations for REST transcoding
syntax = "proto3";

package bookstore;

import "google/api/annotations.proto";

service BookstoreService {
  rpc ListBooks(ListBooksRequest) returns (ListBooksResponse) {
    option (google.api.http) = {
      get: "/v1/books"
    };
  }

  rpc GetBook(GetBookRequest) returns (Book) {
    option (google.api.http) = {
      get: "/v1/books/{id}"
    };
  }

  rpc CreateBook(CreateBookRequest) returns (Book) {
    option (google.api.http) = {
      post: "/v1/books"
      body: "book"
    };
  }
}
```

For the HTTP annotations to work, you need the google API proto files.

```bash
# Download the googleapis proto files
git clone https://github.com/googleapis/googleapis.git

# Generate the descriptor with HTTP annotations
protoc \
  --include_imports \
  --include_source_info \
  --descriptor_set_out=bookstore.pb \
  --proto_path=. \
  --proto_path=googleapis \
  bookstore_with_http.proto
```

## Step 3: Create the gRPC Service Configuration

Create a service configuration file that tells Cloud Endpoints about your gRPC service.

```yaml
# api_config.yaml
# gRPC service configuration for Cloud Endpoints
type: google.api.Service
config_version: 3

# Service name - must match what you use in gcloud commands
name: bookstore-api.endpoints.my-project-id.cloud.goog

title: Bookstore gRPC API

apis:
  - name: bookstore.BookstoreService

# Authentication configuration
authentication:
  providers:
    - id: google_service_account
      issuer: https://accounts.google.com
      jwks_uri: https://www.googleapis.com/oauth2/v3/certs
  rules:
    # Require authentication for all methods
    - selector: "*"
      requirements:
        - provider_id: google_service_account
    # Allow unauthenticated health checks
    - selector: "bookstore.BookstoreService.ListBooks"
      allow_without_credential: true

# Usage configuration
usage:
  rules:
    # Require API key for all methods
    - selector: "*"
      allow_unregistered_calls: false
    # Allow health checks without API key
    - selector: "bookstore.BookstoreService.ListBooks"
      allow_unregistered_calls: true
```

## Step 4: Deploy the Service Configuration

Deploy both the proto descriptor and the service config.

```bash
# Deploy the gRPC service configuration
gcloud endpoints services deploy bookstore.pb api_config.yaml \
  --project=my-project-id
```

Note the service configuration ID from the output. You will need it for the ESPv2 configuration.

```bash
# Get the latest service config ID
gcloud endpoints configs list \
  --service=bookstore-api.endpoints.my-project-id.cloud.goog \
  --project=my-project-id
```

## Step 5: Build the gRPC Backend

Here is a simple Go implementation of the bookstore service.

```go
// main.go
// gRPC server implementation for the Bookstore service
package main

import (
    "context"
    "log"
    "net"

    pb "github.com/example/bookstore"
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

type server struct {
    pb.UnimplementedBookstoreServiceServer
}

func (s *server) ListBooks(ctx context.Context, req *pb.ListBooksRequest) (*pb.ListBooksResponse, error) {
    // Return sample books
    return &pb.ListBooksResponse{
        Books: []*pb.Book{
            {Id: "1", Title: "The Go Programming Language", Author: "Donovan & Kernighan", Year: 2015},
            {Id: "2", Title: "Designing Data-Intensive Applications", Author: "Martin Kleppmann", Year: 2017},
        },
    }, nil
}

func (s *server) GetBook(ctx context.Context, req *pb.GetBookRequest) (*pb.Book, error) {
    return &pb.Book{
        Id:    req.Id,
        Title: "Sample Book",
        Author: "Sample Author",
    }, nil
}

func main() {
    lis, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    grpcServer := grpc.NewServer()
    pb.RegisterBookstoreServiceServer(grpcServer, &server{})
    reflection.Register(grpcServer)

    log.Println("gRPC server listening on :8080")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

Build and push the container.

```dockerfile
# Dockerfile for the gRPC backend
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

```bash
# Build and push the backend image
docker build -t us-central1-docker.pkg.dev/my-project-id/docker-images/bookstore-backend:v1 .
docker push us-central1-docker.pkg.dev/my-project-id/docker-images/bookstore-backend:v1
```

## Step 6: Deploy on Cloud Run with ESPv2

Deploy the gRPC backend on Cloud Run.

```bash
# Deploy the gRPC backend
gcloud run deploy bookstore-backend \
  --image=us-central1-docker.pkg.dev/my-project-id/docker-images/bookstore-backend:v1 \
  --platform=managed \
  --region=us-central1 \
  --use-http2 \
  --no-allow-unauthenticated \
  --project=my-project-id
```

Now build and deploy ESPv2 as the API gateway.

```bash
# Build the ESPv2 image with the service configuration
# First, get the backend URL
BACKEND_URL=$(gcloud run services describe bookstore-backend \
  --platform=managed \
  --region=us-central1 \
  --format="value(status.url)" \
  --project=my-project-id)

# Deploy ESPv2 for gRPC
gcloud run deploy bookstore-api \
  --image="gcr.io/endpoints-release/endpoints-runtime-serverless:2" \
  --set-env-vars="ESPv2_ARGS=--service=bookstore-api.endpoints.my-project-id.cloud.goog --rollout_strategy=managed --backend=grpc://${BACKEND_URL}" \
  --allow-unauthenticated \
  --platform=managed \
  --region=us-central1 \
  --use-http2 \
  --project=my-project-id
```

## Step 7: Test the gRPC API

Test using grpcurl.

```bash
# Install grpcurl if needed
brew install grpcurl

# List available services (if reflection is enabled)
grpcurl bookstore-api-abc123-uc.a.run.app:443 list

# Call the ListBooks method
grpcurl bookstore-api-abc123-uc.a.run.app:443 \
  bookstore.BookstoreService/ListBooks

# Call GetBook with a parameter
grpcurl -d '{"id": "1"}' \
  bookstore-api-abc123-uc.a.run.app:443 \
  bookstore.BookstoreService/GetBook
```

If you configured HTTP transcoding, test with REST.

```bash
# REST call through gRPC transcoding
curl "https://bookstore-api-abc123-uc.a.run.app/v1/books"

# Get a specific book via REST
curl "https://bookstore-api-abc123-uc.a.run.app/v1/books/1"
```

## Monitoring

Cloud Endpoints provides the same monitoring for gRPC as it does for REST APIs.

```bash
# View the Endpoints dashboard
# Console: APIs & Services > Endpoints > bookstore-api

# Check service health
gcloud endpoints services describe \
  bookstore-api.endpoints.my-project-id.cloud.goog \
  --project=my-project-id
```

## Summary

Deploying a gRPC API with Cloud Endpoints on Cloud Run gives you the performance of gRPC with the management features of Cloud Endpoints. Define your service in protobuf, create a service configuration, deploy the descriptor, and put ESPv2 in front of your backend. HTTP transcoding lets REST clients call your gRPC service too, so you can support both protocols from a single backend. Authentication, monitoring, and quota management all work the same as with REST APIs.
