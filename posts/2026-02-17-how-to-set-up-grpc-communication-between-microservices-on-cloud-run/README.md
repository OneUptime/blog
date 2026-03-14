# How to Set Up gRPC Communication Between Microservices on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, gRPC, Cloud Run, Microservices, Protocol Buffers, Networking, API

Description: Learn how to set up gRPC communication between microservices running on Google Cloud Run for high-performance, type-safe service-to-service calls.

---

REST APIs work fine for many use cases, but when you need high-performance communication between microservices, gRPC is a better fit. gRPC uses Protocol Buffers for serialization (which is significantly faster and smaller than JSON), supports streaming, and generates client and server code from service definitions. This means your service contracts are defined once and shared across services, eliminating the drift that happens with REST APIs.

Cloud Run has native support for gRPC, including unary calls, server streaming, and bidirectional streaming. Setting it up requires a few specific configurations, but the performance benefits for internal service-to-service communication are substantial.

## Defining the Service with Protocol Buffers

Start by defining your gRPC service in a `.proto` file.

```protobuf
// proto/user_service.proto - gRPC service definition
syntax = "proto3";

package userservice;

option go_package = "github.com/myorg/myapp/proto/userservice";

// UserService handles user-related operations
service UserService {
    // Get a single user by ID
    rpc GetUser (GetUserRequest) returns (User);

    // List all users with optional filtering
    rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);

    // Create a new user
    rpc CreateUser (CreateUserRequest) returns (User);

    // Stream user activity events
    rpc StreamUserActivity (StreamActivityRequest) returns (stream ActivityEvent);
}

// Request to get a user by ID
message GetUserRequest {
    string id = 1;
}

// Request to list users
message ListUsersRequest {
    int32 page_size = 1;
    string page_token = 2;
    string filter = 3;
}

// Response containing a list of users
message ListUsersResponse {
    repeated User users = 1;
    string next_page_token = 2;
    int32 total_count = 3;
}

// Request to create a user
message CreateUserRequest {
    string name = 1;
    string email = 2;
    string role = 3;
}

// User resource
message User {
    string id = 1;
    string name = 2;
    string email = 3;
    string role = 4;
    string created_at = 5;
}

// Request to stream activity
message StreamActivityRequest {
    string user_id = 1;
}

// Activity event
message ActivityEvent {
    string event_type = 1;
    string description = 2;
    string timestamp = 3;
}
```

## Generating Go Code

Generate the Go server and client code from the proto file.

```bash
# Install protoc and Go plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate Go code
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/user_service.proto
```

## Implementing the gRPC Server

Here is the server implementation.

```go
// server/main.go - gRPC server for Cloud Run
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "time"

    pb "github.com/myorg/myapp/proto/userservice"
    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
    "google.golang.org/grpc/reflection"
)

// userServer implements the UserService gRPC interface
type userServer struct {
    pb.UnimplementedUserServiceServer
}

// GetUser retrieves a single user by ID
func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    log.Printf("GetUser called with ID: %s", req.Id)

    // In production, this would query a database
    return &pb.User{
        Id:        req.Id,
        Name:      "Alice Johnson",
        Email:     "alice@example.com",
        Role:      "developer",
        CreatedAt: time.Now().Format(time.RFC3339),
    }, nil
}

// ListUsers returns a list of users
func (s *userServer) ListUsers(ctx context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
    log.Printf("ListUsers called with page_size: %d", req.PageSize)

    users := []*pb.User{
        {Id: "1", Name: "Alice", Email: "alice@example.com", Role: "developer"},
        {Id: "2", Name: "Bob", Email: "bob@example.com", Role: "designer"},
        {Id: "3", Name: "Charlie", Email: "charlie@example.com", Role: "manager"},
    }

    return &pb.ListUsersResponse{
        Users:      users,
        TotalCount: int32(len(users)),
    }, nil
}

// CreateUser creates a new user
func (s *userServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
    log.Printf("CreateUser called: %s (%s)", req.Name, req.Email)

    return &pb.User{
        Id:        fmt.Sprintf("user-%d", time.Now().UnixNano()),
        Name:      req.Name,
        Email:     req.Email,
        Role:      req.Role,
        CreatedAt: time.Now().Format(time.RFC3339),
    }, nil
}

// StreamUserActivity streams activity events for a user
func (s *userServer) StreamUserActivity(req *pb.StreamActivityRequest, stream pb.UserService_StreamUserActivityServer) error {
    log.Printf("StreamUserActivity called for user: %s", req.UserId)

    // Simulate streaming events
    events := []string{"login", "view_dashboard", "update_profile", "logout"}
    for _, event := range events {
        if err := stream.Send(&pb.ActivityEvent{
            EventType:   event,
            Description: fmt.Sprintf("User %s performed %s", req.UserId, event),
            Timestamp:   time.Now().Format(time.RFC3339),
        }); err != nil {
            return err
        }
        time.Sleep(500 * time.Millisecond)
    }

    return nil
}

func main() {
    // Cloud Run sets PORT environment variable
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    listener, err := net.Listen("tcp", ":"+port)
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    // Create gRPC server
    grpcServer := grpc.NewServer()

    // Register the user service
    pb.RegisterUserServiceServer(grpcServer, &userServer{})

    // Register health check service (important for Cloud Run)
    healthServer := health.NewServer()
    healthpb.RegisterHealthServer(grpcServer, healthServer)
    healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

    // Enable reflection for debugging with tools like grpcurl
    reflection.Register(grpcServer)

    log.Printf("gRPC server starting on port %s", port)
    if err := grpcServer.Serve(listener); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

## The Dockerfile

```dockerfile
# Dockerfile - Multi-stage build for gRPC server
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server server/main.go

FROM gcr.io/distroless/static
COPY --from=builder /server /server
EXPOSE 8080
CMD ["/server"]
```

## Deploying the gRPC Server to Cloud Run

Cloud Run needs specific configuration for gRPC.

```bash
# Build and push the image
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/user-grpc-service:v1 .
docker push us-central1-docker.pkg.dev/my-project/my-repo/user-grpc-service:v1

# Deploy with HTTP/2 (required for gRPC)
gcloud run deploy user-grpc-service \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/user-grpc-service:v1 \
    --region=us-central1 \
    --platform=managed \
    --use-http2 \
    --port=8080 \
    --memory=256Mi \
    --no-allow-unauthenticated
```

The `--use-http2` flag is critical. gRPC requires HTTP/2, and by default Cloud Run uses HTTP/1.1. Without this flag, gRPC calls will fail.

## Implementing the gRPC Client

Here is a client service that calls the user service.

```go
// client/main.go - gRPC client running on Cloud Run
package main

import (
    "context"
    "crypto/tls"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"

    pb "github.com/myorg/myapp/proto/userservice"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
    "google.golang.org/grpc/credentials/insecure"
)

var userClient pb.UserServiceClient

func main() {
    // Connect to the user service
    userServiceURL := os.Getenv("USER_SERVICE_URL")
    if userServiceURL == "" {
        userServiceURL = "localhost:8080"
    }

    // Set up the gRPC connection
    conn, err := createGRPCConnection(userServiceURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    userClient = pb.NewUserServiceClient(conn)

    // Serve HTTP endpoints that call the gRPC backend
    http.HandleFunc("/api/users", handleListUsers)
    http.HandleFunc("/api/users/get", handleGetUser)
    http.HandleFunc("/health", handleHealth)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("HTTP gateway starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}

// createGRPCConnection creates a connection with appropriate TLS settings
func createGRPCConnection(address string) (*grpc.ClientConn, error) {
    var opts []grpc.DialOption

    // Cloud Run services use TLS
    if os.Getenv("INSECURE") == "true" {
        opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
    } else {
        // Use system TLS certificates for Cloud Run
        tlsConfig := &tls.Config{}
        opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
    }

    return grpc.NewClient(address, opts...)
}

func handleListUsers(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    // Call the gRPC user service
    resp, err := userClient.ListUsers(ctx, &pb.ListUsersRequest{
        PageSize: 10,
    })
    if err != nil {
        http.Error(w, "Failed to list users: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func handleGetUser(w http.ResponseWriter, r *http.Request) {
    userID := r.URL.Query().Get("id")
    if userID == "" {
        http.Error(w, "Missing user ID", http.StatusBadRequest)
        return
    }

    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    user, err := userClient.GetUser(ctx, &pb.GetUserRequest{Id: userID})
    if err != nil {
        http.Error(w, "Failed to get user: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}
```

## Setting Up Service-to-Service Authentication

For Cloud Run services that do not allow unauthenticated access, you need to include an identity token.

```go
// auth.go - Add authentication for Cloud Run service-to-service calls
package main

import (
    "context"
    "fmt"

    "google.golang.org/api/idtoken"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
    "google.golang.org/grpc/credentials/oauth"
)

// createAuthenticatedConnection creates a gRPC connection with Cloud Run auth
func createAuthenticatedConnection(address, audience string) (*grpc.ClientConn, error) {
    // Create token source for the target service
    tokenSource, err := idtoken.NewTokenSource(context.Background(), audience)
    if err != nil {
        return nil, fmt.Errorf("failed to create token source: %v", err)
    }

    // Set up TLS and auth credentials
    opts := []grpc.DialOption{
        grpc.WithTransportCredentials(credentials.NewTLS(nil)),
        grpc.WithPerRPCCredentials(oauth.TokenSource{TokenSource: tokenSource}),
    }

    return grpc.NewClient(address, opts...)
}
```

## Deploying the Client Service

```bash
# Deploy the client service (HTTP gateway)
gcloud run deploy api-gateway \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/api-gateway:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="USER_SERVICE_URL=user-grpc-service-xxxxx-uc.a.run.app:443" \
    --memory=256Mi
```

## Testing with grpcurl

You can test the gRPC service directly using grpcurl.

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe user-grpc-service \
    --region=us-central1 \
    --format='value(status.url)' | sed 's|https://||')

# Get an auth token
TOKEN=$(gcloud auth print-identity-token)

# Call the ListUsers method
grpcurl \
    -H "Authorization: Bearer $TOKEN" \
    $SERVICE_URL:443 \
    userservice.UserService/ListUsers

# Call GetUser with a parameter
grpcurl \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"id": "user-123"}' \
    $SERVICE_URL:443 \
    userservice.UserService/GetUser
```

## Performance Comparison

gRPC versus REST for the same service:

- **Serialization**: Protocol Buffers are 3-10x smaller than JSON
- **Latency**: gRPC calls are typically 2-3x faster due to HTTP/2 multiplexing and binary serialization
- **Code generation**: Type-safe clients and servers from a single proto file
- **Streaming**: Native support for server-side, client-side, and bidirectional streaming

For internal microservice communication where latency matters, gRPC is the clear winner.

## Cloud Build Pipeline

```yaml
# cloudbuild.yaml - Build and deploy gRPC service
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/user-grpc-service:$SHORT_SHA'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/user-grpc-service:$SHORT_SHA'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'user-grpc-service'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/user-grpc-service:$SHORT_SHA'
      - '--region=us-central1'
      - '--use-http2'
      - '--no-allow-unauthenticated'
```

## Wrapping Up

gRPC on Cloud Run gives you high-performance, type-safe communication between microservices. The setup requires HTTP/2 to be enabled on Cloud Run and TLS for service-to-service calls, but once configured, you get faster serialization, code-generated clients, and streaming support that REST cannot match. For internal service-to-service communication where performance matters, gRPC is worth the initial setup investment.
