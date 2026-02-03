# How to Build Microservices with Go-Kit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Go-Kit, Microservices, Backend, Architecture, gRPC

Description: Learn how to build production-ready microservices with Go-Kit. This guide covers service architecture, transports, middleware, and observability patterns.

---

> Go-Kit gives you the building blocks to write microservices that scale without becoming unmaintainable. It is opinionated about structure but flexible about implementation.

Go-Kit is a toolkit for building microservices in Go. Unlike full-blown frameworks, it provides a set of packages and patterns that help you structure your services in a clean, testable, and production-ready way. It does not dictate how you write your business logic - it just provides the infrastructure around it.

This guide walks through everything you need to build real microservices with Go-Kit: from understanding the architecture to implementing HTTP and gRPC transports, adding middleware for logging and metrics, and setting up proper observability.

---

## Table of Contents

1. Why Go-Kit?
2. The Three-Layer Architecture
3. Project Structure
4. Defining the Service Interface
5. Implementing the Service
6. Creating Endpoints
7. HTTP Transport
8. gRPC Transport
9. Middleware - Logging
10. Middleware - Metrics
11. Middleware - Rate Limiting
12. Error Handling
13. Service Discovery
14. Putting It All Together
15. Testing Your Microservice
16. Production Considerations

---

## 1. Why Go-Kit?

Go-Kit solves real problems that emerge when you build distributed systems:

| Problem | Go-Kit Solution |
|---------|-----------------|
| Request routing and encoding | Transport layer abstraction (HTTP, gRPC, NATS) |
| Cross-cutting concerns | Middleware chains for logging, metrics, tracing |
| Service discovery | Integration with Consul, etcd, ZooKeeper |
| Circuit breaking | Built-in circuit breaker middleware |
| Rate limiting | Token bucket and other rate limiters |
| Request tracing | OpenTracing and OpenTelemetry support |

Go-Kit is not a framework - it is a collection of Go packages. You compose them together as needed. This means you can adopt Go-Kit incrementally and use only what makes sense for your project.

The philosophy is simple: business logic should be pure Go interfaces. Everything else (transport, encoding, middleware) wraps around that core.

---

## 2. The Three-Layer Architecture

Go-Kit promotes a clean separation of concerns through three distinct layers:

```
+------------------+
|    Transport     |  <-- HTTP, gRPC, NATS, etc.
+------------------+
         |
+------------------+
|    Endpoint      |  <-- Request/Response transformation
+------------------+
         |
+------------------+
|    Service       |  <-- Pure business logic
+------------------+
```

Each layer has a specific responsibility:

**Service Layer**: This is your business logic. It knows nothing about HTTP, gRPC, or any transport mechanism. It is a plain Go interface with methods that take domain objects and return domain objects. This makes it trivially testable.

**Endpoint Layer**: Endpoints are the bridge between transport and service. An endpoint is just a function that takes a request and returns a response. Each service method gets wrapped in an endpoint. This is where you apply middleware.

**Transport Layer**: The transport layer handles serialization, deserialization, and protocol-specific concerns. It converts HTTP requests into endpoint requests and endpoint responses into HTTP responses. You can have multiple transports for the same service.

This separation means you can:
- Test business logic without spinning up HTTP servers
- Add gRPC support without touching your service code
- Apply logging/metrics at the endpoint level once, for all transports
- Swap transports entirely without changing business logic

---

## 3. Project Structure

A well-organized Go-Kit project looks like this:

```
user-service/
├── cmd/
│   └── server/
│       └── main.go           # Application entry point
├── pkg/
│   └── userservice/
│       ├── service.go        # Service interface and implementation
│       ├── endpoint.go       # Endpoint definitions
│       ├── transport_http.go # HTTP transport
│       ├── transport_grpc.go # gRPC transport
│       ├── middleware.go     # Middleware (logging, metrics)
│       └── types.go          # Request/Response types
├── pb/
│   ├── user.proto            # Protocol buffer definitions
│   └── user.pb.go            # Generated protobuf code
├── go.mod
└── go.sum
```

This structure keeps related code together while maintaining clear boundaries between layers. The `pkg` directory contains reusable packages, and `cmd` contains application entry points.

---

## 4. Defining the Service Interface

Start with a clean interface that describes your business operations. This interface should contain no transport-specific types - just pure domain logic.

Here is a user service that handles basic CRUD operations:

```go
// pkg/userservice/service.go
package userservice

import (
    "context"
    "errors"
    "time"
)

// User represents a user in our system
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// Service defines the user service interface.
// This is the contract that our business logic must fulfill.
// Notice there is nothing about HTTP or gRPC here - just domain operations.
type Service interface {
    // CreateUser creates a new user with the given email and name.
    // Returns the created user or an error if validation fails.
    CreateUser(ctx context.Context, email, name string) (*User, error)

    // GetUser retrieves a user by their ID.
    // Returns ErrNotFound if the user does not exist.
    GetUser(ctx context.Context, id string) (*User, error)

    // UpdateUser updates an existing user's information.
    // Only non-empty fields will be updated.
    UpdateUser(ctx context.Context, id, email, name string) (*User, error)

    // DeleteUser removes a user from the system.
    // Returns ErrNotFound if the user does not exist.
    DeleteUser(ctx context.Context, id string) error

    // ListUsers returns all users with optional pagination.
    // Returns an empty slice if no users exist.
    ListUsers(ctx context.Context, limit, offset int) ([]*User, error)
}

// Domain errors - these should be transport-agnostic
var (
    ErrNotFound       = errors.New("user not found")
    ErrInvalidEmail   = errors.New("invalid email address")
    ErrInvalidName    = errors.New("name cannot be empty")
    ErrAlreadyExists  = errors.New("user already exists")
)
```

Key principles here:
- The interface accepts `context.Context` as the first parameter (Go convention for cancellation and deadlines)
- Input parameters are simple types, not request structs
- Return types are domain objects, not response structs
- Errors are domain-specific and transport-agnostic

---

## 5. Implementing the Service

Now implement the interface with actual business logic. This implementation knows nothing about how it will be called - it just does the work.

```go
// pkg/userservice/service.go (continued)

import (
    "context"
    "regexp"
    "sync"
    "time"

    "github.com/google/uuid"
)

// userService is the concrete implementation of our Service interface.
// In production, this would connect to a database. Here we use an in-memory store.
type userService struct {
    mu    sync.RWMutex
    users map[string]*User
}

// NewService creates a new user service instance.
// This is the constructor that will be called from main.go.
func NewService() Service {
    return &userService{
        users: make(map[string]*User),
    }
}

// emailRegex is a simple email validation pattern.
// In production, consider a more robust validation library.
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// CreateUser validates input and creates a new user.
// Business rules:
// - Email must be valid format
// - Email must be unique
// - Name cannot be empty
func (s *userService) CreateUser(ctx context.Context, email, name string) (*User, error) {
    // Validate email format
    if !emailRegex.MatchString(email) {
        return nil, ErrInvalidEmail
    }

    // Validate name
    if name == "" {
        return nil, ErrInvalidName
    }

    s.mu.Lock()
    defer s.mu.Unlock()

    // Check for duplicate email
    for _, u := range s.users {
        if u.Email == email {
            return nil, ErrAlreadyExists
        }
    }

    // Create the user
    now := time.Now()
    user := &User{
        ID:        uuid.New().String(),
        Email:     email,
        Name:      name,
        CreatedAt: now,
        UpdatedAt: now,
    }

    s.users[user.ID] = user
    return user, nil
}

// GetUser retrieves a user by ID.
// Returns ErrNotFound if the user does not exist.
func (s *userService) GetUser(ctx context.Context, id string) (*User, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    user, ok := s.users[id]
    if !ok {
        return nil, ErrNotFound
    }

    return user, nil
}

// UpdateUser modifies an existing user.
// Only updates fields that are provided (non-empty).
func (s *userService) UpdateUser(ctx context.Context, id, email, name string) (*User, error) {
    s.mu.Lock()
    defer s.mu.Unlock()

    user, ok := s.users[id]
    if !ok {
        return nil, ErrNotFound
    }

    // Validate and update email if provided
    if email != "" {
        if !emailRegex.MatchString(email) {
            return nil, ErrInvalidEmail
        }
        // Check for duplicate email (excluding current user)
        for _, u := range s.users {
            if u.Email == email && u.ID != id {
                return nil, ErrAlreadyExists
            }
        }
        user.Email = email
    }

    // Update name if provided
    if name != "" {
        user.Name = name
    }

    user.UpdatedAt = time.Now()
    return user, nil
}

// DeleteUser removes a user from the system.
// Returns ErrNotFound if the user does not exist.
func (s *userService) DeleteUser(ctx context.Context, id string) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.users[id]; !ok {
        return ErrNotFound
    }

    delete(s.users, id)
    return nil
}

// ListUsers returns paginated list of users.
// Uses simple offset-based pagination.
func (s *userService) ListUsers(ctx context.Context, limit, offset int) ([]*User, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    // Convert map to slice for pagination
    all := make([]*User, 0, len(s.users))
    for _, u := range s.users {
        all = append(all, u)
    }

    // Apply pagination
    if offset >= len(all) {
        return []*User{}, nil
    }

    end := offset + limit
    if end > len(all) {
        end = len(all)
    }

    return all[offset:end], nil
}
```

This implementation is completely testable without any HTTP setup. You can write unit tests that directly call these methods.

---

## 6. Creating Endpoints

Endpoints transform service method calls into a generic request/response pattern. Each endpoint wraps one service method.

First, define the request and response types:

```go
// pkg/userservice/types.go
package userservice

// CreateUserRequest holds the parameters for creating a user
type CreateUserRequest struct {
    Email string `json:"email"`
    Name  string `json:"name"`
}

// CreateUserResponse holds the result of creating a user
type CreateUserResponse struct {
    User  *User  `json:"user,omitempty"`
    Error string `json:"error,omitempty"`
}

// GetUserRequest holds the parameters for retrieving a user
type GetUserRequest struct {
    ID string `json:"id"`
}

// GetUserResponse holds the result of retrieving a user
type GetUserResponse struct {
    User  *User  `json:"user,omitempty"`
    Error string `json:"error,omitempty"`
}

// UpdateUserRequest holds the parameters for updating a user
type UpdateUserRequest struct {
    ID    string `json:"id"`
    Email string `json:"email,omitempty"`
    Name  string `json:"name,omitempty"`
}

// UpdateUserResponse holds the result of updating a user
type UpdateUserResponse struct {
    User  *User  `json:"user,omitempty"`
    Error string `json:"error,omitempty"`
}

// DeleteUserRequest holds the parameters for deleting a user
type DeleteUserRequest struct {
    ID string `json:"id"`
}

// DeleteUserResponse holds the result of deleting a user
type DeleteUserResponse struct {
    Error string `json:"error,omitempty"`
}

// ListUsersRequest holds the parameters for listing users
type ListUsersRequest struct {
    Limit  int `json:"limit"`
    Offset int `json:"offset"`
}

// ListUsersResponse holds the result of listing users
type ListUsersResponse struct {
    Users []*User `json:"users"`
    Error string  `json:"error,omitempty"`
}
```

Now create the endpoints that wrap your service:

```go
// pkg/userservice/endpoint.go
package userservice

import (
    "context"

    "github.com/go-kit/kit/endpoint"
)

// Endpoints holds all endpoints for the user service.
// This struct makes it easy to pass all endpoints around.
type Endpoints struct {
    CreateUser endpoint.Endpoint
    GetUser    endpoint.Endpoint
    UpdateUser endpoint.Endpoint
    DeleteUser endpoint.Endpoint
    ListUsers  endpoint.Endpoint
}

// MakeEndpoints creates all endpoints for a given service.
// This is called once during application startup.
func MakeEndpoints(svc Service) Endpoints {
    return Endpoints{
        CreateUser: makeCreateUserEndpoint(svc),
        GetUser:    makeGetUserEndpoint(svc),
        UpdateUser: makeUpdateUserEndpoint(svc),
        DeleteUser: makeDeleteUserEndpoint(svc),
        ListUsers:  makeListUsersEndpoint(svc),
    }
}

// makeCreateUserEndpoint returns an endpoint for the CreateUser service method.
// The endpoint extracts parameters from the request, calls the service,
// and packages the result into a response.
func makeCreateUserEndpoint(svc Service) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(CreateUserRequest)
        user, err := svc.CreateUser(ctx, req.Email, req.Name)
        if err != nil {
            return CreateUserResponse{Error: err.Error()}, nil
        }
        return CreateUserResponse{User: user}, nil
    }
}

// makeGetUserEndpoint returns an endpoint for the GetUser service method.
func makeGetUserEndpoint(svc Service) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(GetUserRequest)
        user, err := svc.GetUser(ctx, req.ID)
        if err != nil {
            return GetUserResponse{Error: err.Error()}, nil
        }
        return GetUserResponse{User: user}, nil
    }
}

// makeUpdateUserEndpoint returns an endpoint for the UpdateUser service method.
func makeUpdateUserEndpoint(svc Service) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(UpdateUserRequest)
        user, err := svc.UpdateUser(ctx, req.ID, req.Email, req.Name)
        if err != nil {
            return UpdateUserResponse{Error: err.Error()}, nil
        }
        return UpdateUserResponse{User: user}, nil
    }
}

// makeDeleteUserEndpoint returns an endpoint for the DeleteUser service method.
func makeDeleteUserEndpoint(svc Service) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(DeleteUserRequest)
        err := svc.DeleteUser(ctx, req.ID)
        if err != nil {
            return DeleteUserResponse{Error: err.Error()}, nil
        }
        return DeleteUserResponse{}, nil
    }
}

// makeListUsersEndpoint returns an endpoint for the ListUsers service method.
func makeListUsersEndpoint(svc Service) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(ListUsersRequest)
        users, err := svc.ListUsers(ctx, req.Limit, req.Offset)
        if err != nil {
            return ListUsersResponse{Error: err.Error()}, nil
        }
        return ListUsersResponse{Users: users}, nil
    }
}
```

The key insight: endpoints return errors in the response body, not as Go errors. This is intentional - business errors (like "user not found") are part of the response. Transport errors (network failures, etc.) are returned as Go errors.

---

## 7. HTTP Transport

The HTTP transport layer handles request parsing, response encoding, and HTTP-specific concerns.

```go
// pkg/userservice/transport_http.go
package userservice

import (
    "context"
    "encoding/json"
    "net/http"

    "github.com/go-kit/kit/transport"
    httptransport "github.com/go-kit/kit/transport/http"
    "github.com/gorilla/mux"
)

// NewHTTPHandler returns an http.Handler that routes to the appropriate endpoint.
// This handler can be mounted on any HTTP server.
func NewHTTPHandler(endpoints Endpoints, logger log.Logger) http.Handler {
    r := mux.NewRouter()

    // Options for all handlers - error handling and encoding
    options := []httptransport.ServerOption{
        httptransport.ServerErrorHandler(transport.NewLogErrorHandler(logger)),
        httptransport.ServerErrorEncoder(encodeHTTPError),
    }

    // POST /users - Create a new user
    r.Methods("POST").Path("/users").Handler(httptransport.NewServer(
        endpoints.CreateUser,
        decodeCreateUserRequest,
        encodeJSONResponse,
        options...,
    ))

    // GET /users/{id} - Get a user by ID
    r.Methods("GET").Path("/users/{id}").Handler(httptransport.NewServer(
        endpoints.GetUser,
        decodeGetUserRequest,
        encodeJSONResponse,
        options...,
    ))

    // PUT /users/{id} - Update a user
    r.Methods("PUT").Path("/users/{id}").Handler(httptransport.NewServer(
        endpoints.UpdateUser,
        decodeUpdateUserRequest,
        encodeJSONResponse,
        options...,
    ))

    // DELETE /users/{id} - Delete a user
    r.Methods("DELETE").Path("/users/{id}").Handler(httptransport.NewServer(
        endpoints.DeleteUser,
        decodeDeleteUserRequest,
        encodeJSONResponse,
        options...,
    ))

    // GET /users - List users
    r.Methods("GET").Path("/users").Handler(httptransport.NewServer(
        endpoints.ListUsers,
        decodeListUsersRequest,
        encodeJSONResponse,
        options...,
    ))

    return r
}

// Decoders - convert HTTP requests into endpoint requests

// decodeCreateUserRequest extracts CreateUserRequest from HTTP body
func decodeCreateUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return nil, err
    }
    return req, nil
}

// decodeGetUserRequest extracts user ID from URL path
func decodeGetUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
    vars := mux.Vars(r)
    return GetUserRequest{ID: vars["id"]}, nil
}

// decodeUpdateUserRequest extracts user ID from path and updates from body
func decodeUpdateUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
    vars := mux.Vars(r)
    var req UpdateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return nil, err
    }
    req.ID = vars["id"]
    return req, nil
}

// decodeDeleteUserRequest extracts user ID from URL path
func decodeDeleteUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
    vars := mux.Vars(r)
    return DeleteUserRequest{ID: vars["id"]}, nil
}

// decodeListUsersRequest extracts pagination parameters from query string
func decodeListUsersRequest(_ context.Context, r *http.Request) (interface{}, error) {
    // Parse query parameters with defaults
    limit := 10
    offset := 0

    q := r.URL.Query()
    if l := q.Get("limit"); l != "" {
        fmt.Sscanf(l, "%d", &limit)
    }
    if o := q.Get("offset"); o != "" {
        fmt.Sscanf(o, "%d", &offset)
    }

    return ListUsersRequest{Limit: limit, Offset: offset}, nil
}

// Encoders - convert endpoint responses into HTTP responses

// encodeJSONResponse writes the response as JSON with proper headers
func encodeJSONResponse(_ context.Context, w http.ResponseWriter, response interface{}) error {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    return json.NewEncoder(w).Encode(response)
}

// encodeHTTPError handles transport-level errors
func encodeHTTPError(_ context.Context, err error, w http.ResponseWriter) {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}
```

Each endpoint gets its own decoder that understands where to find parameters (body, path, query). The encoder is shared since all responses are JSON.

---

## 8. gRPC Transport

Go-Kit makes it straightforward to add gRPC as a second transport. First, define your protobuf schema:

```protobuf
// pb/user.proto
syntax = "proto3";

package pb;

option go_package = "github.com/yourorg/user-service/pb";

service UserService {
    rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse);
    rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message User {
    string id = 1;
    string email = 2;
    string name = 3;
    int64 created_at = 4;
    int64 updated_at = 5;
}

message CreateUserRequest {
    string email = 1;
    string name = 2;
}

message CreateUserResponse {
    User user = 1;
    string error = 2;
}

message GetUserRequest {
    string id = 1;
}

message GetUserResponse {
    User user = 1;
    string error = 2;
}

message UpdateUserRequest {
    string id = 1;
    string email = 2;
    string name = 3;
}

message UpdateUserResponse {
    User user = 1;
    string error = 2;
}

message DeleteUserRequest {
    string id = 1;
}

message DeleteUserResponse {
    string error = 1;
}

message ListUsersRequest {
    int32 limit = 1;
    int32 offset = 2;
}

message ListUsersResponse {
    repeated User users = 1;
    string error = 2;
}
```

Generate the Go code with:

```bash
protoc --go_out=. --go-grpc_out=. pb/user.proto
```

Now implement the gRPC transport:

```go
// pkg/userservice/transport_grpc.go
package userservice

import (
    "context"

    "github.com/go-kit/kit/transport/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    "github.com/yourorg/user-service/pb"
)

// grpcServer implements the protobuf service interface
type grpcServer struct {
    pb.UnimplementedUserServiceServer
    createUser grpc.Handler
    getUser    grpc.Handler
    updateUser grpc.Handler
    deleteUser grpc.Handler
    listUsers  grpc.Handler
}

// NewGRPCServer returns a gRPC server that implements the UserService.
// Each method delegates to a Go-Kit handler that wraps our endpoints.
func NewGRPCServer(endpoints Endpoints) pb.UserServiceServer {
    return &grpcServer{
        createUser: grpc.NewServer(
            endpoints.CreateUser,
            decodeGRPCCreateUserRequest,
            encodeGRPCCreateUserResponse,
        ),
        getUser: grpc.NewServer(
            endpoints.GetUser,
            decodeGRPCGetUserRequest,
            encodeGRPCGetUserResponse,
        ),
        updateUser: grpc.NewServer(
            endpoints.UpdateUser,
            decodeGRPCUpdateUserRequest,
            encodeGRPCUpdateUserResponse,
        ),
        deleteUser: grpc.NewServer(
            endpoints.DeleteUser,
            decodeGRPCDeleteUserRequest,
            encodeGRPCDeleteUserResponse,
        ),
        listUsers: grpc.NewServer(
            endpoints.ListUsers,
            decodeGRPCListUsersRequest,
            encodeGRPCListUsersResponse,
        ),
    }
}

// CreateUser implements the gRPC CreateUser method
func (s *grpcServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
    _, resp, err := s.createUser.ServeGRPC(ctx, req)
    if err != nil {
        return nil, err
    }
    return resp.(*pb.CreateUserResponse), nil
}

// GetUser implements the gRPC GetUser method
func (s *grpcServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    _, resp, err := s.getUser.ServeGRPC(ctx, req)
    if err != nil {
        return nil, err
    }
    return resp.(*pb.GetUserResponse), nil
}

// UpdateUser implements the gRPC UpdateUser method
func (s *grpcServer) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
    _, resp, err := s.updateUser.ServeGRPC(ctx, req)
    if err != nil {
        return nil, err
    }
    return resp.(*pb.UpdateUserResponse), nil
}

// DeleteUser implements the gRPC DeleteUser method
func (s *grpcServer) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
    _, resp, err := s.deleteUser.ServeGRPC(ctx, req)
    if err != nil {
        return nil, err
    }
    return resp.(*pb.DeleteUserResponse), nil
}

// ListUsers implements the gRPC ListUsers method
func (s *grpcServer) ListUsers(ctx context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
    _, resp, err := s.listUsers.ServeGRPC(ctx, req)
    if err != nil {
        return nil, err
    }
    return resp.(*pb.ListUsersResponse), nil
}

// Decoders - convert protobuf requests to endpoint requests

func decodeGRPCCreateUserRequest(_ context.Context, grpcReq interface{}) (interface{}, error) {
    req := grpcReq.(*pb.CreateUserRequest)
    return CreateUserRequest{
        Email: req.Email,
        Name:  req.Name,
    }, nil
}

func decodeGRPCGetUserRequest(_ context.Context, grpcReq interface{}) (interface{}, error) {
    req := grpcReq.(*pb.GetUserRequest)
    return GetUserRequest{ID: req.Id}, nil
}

func decodeGRPCUpdateUserRequest(_ context.Context, grpcReq interface{}) (interface{}, error) {
    req := grpcReq.(*pb.UpdateUserRequest)
    return UpdateUserRequest{
        ID:    req.Id,
        Email: req.Email,
        Name:  req.Name,
    }, nil
}

func decodeGRPCDeleteUserRequest(_ context.Context, grpcReq interface{}) (interface{}, error) {
    req := grpcReq.(*pb.DeleteUserRequest)
    return DeleteUserRequest{ID: req.Id}, nil
}

func decodeGRPCListUsersRequest(_ context.Context, grpcReq interface{}) (interface{}, error) {
    req := grpcReq.(*pb.ListUsersRequest)
    return ListUsersRequest{
        Limit:  int(req.Limit),
        Offset: int(req.Offset),
    }, nil
}

// Encoders - convert endpoint responses to protobuf responses

func encodeGRPCCreateUserResponse(_ context.Context, response interface{}) (interface{}, error) {
    resp := response.(CreateUserResponse)
    return &pb.CreateUserResponse{
        User:  userToProto(resp.User),
        Error: resp.Error,
    }, nil
}

func encodeGRPCGetUserResponse(_ context.Context, response interface{}) (interface{}, error) {
    resp := response.(GetUserResponse)
    return &pb.GetUserResponse{
        User:  userToProto(resp.User),
        Error: resp.Error,
    }, nil
}

func encodeGRPCUpdateUserResponse(_ context.Context, response interface{}) (interface{}, error) {
    resp := response.(UpdateUserResponse)
    return &pb.UpdateUserResponse{
        User:  userToProto(resp.User),
        Error: resp.Error,
    }, nil
}

func encodeGRPCDeleteUserResponse(_ context.Context, response interface{}) (interface{}, error) {
    resp := response.(DeleteUserResponse)
    return &pb.DeleteUserResponse{
        Error: resp.Error,
    }, nil
}

func encodeGRPCListUsersResponse(_ context.Context, response interface{}) (interface{}, error) {
    resp := response.(ListUsersResponse)
    users := make([]*pb.User, len(resp.Users))
    for i, u := range resp.Users {
        users[i] = userToProto(u)
    }
    return &pb.ListUsersResponse{
        Users: users,
        Error: resp.Error,
    }, nil
}

// userToProto converts a domain User to a protobuf User
func userToProto(u *User) *pb.User {
    if u == nil {
        return nil
    }
    return &pb.User{
        Id:        u.ID,
        Email:     u.Email,
        Name:      u.Name,
        CreatedAt: u.CreatedAt.Unix(),
        UpdatedAt: u.UpdatedAt.Unix(),
    }
}
```

Notice that both HTTP and gRPC transports use the same endpoints. The business logic runs once - only the serialization differs.

---

## 9. Middleware - Logging

Middleware in Go-Kit wraps endpoints to add cross-cutting functionality. Logging middleware records every request and response.

```go
// pkg/userservice/middleware.go
package userservice

import (
    "context"
    "time"

    "github.com/go-kit/kit/endpoint"
    "github.com/go-kit/kit/log"
    "github.com/go-kit/kit/log/level"
)

// LoggingMiddleware returns an endpoint middleware that logs
// the duration of each request and any errors that occur.
func LoggingMiddleware(logger log.Logger) endpoint.Middleware {
    return func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, request interface{}) (response interface{}, err error) {
            // Record start time
            start := time.Now()

            // Call the next endpoint in the chain
            response, err = next(ctx, request)

            // Log the result
            duration := time.Since(start)

            // Extract method name from request type for logging
            method := getMethodName(request)

            // Log at appropriate level based on error
            if err != nil {
                level.Error(logger).Log(
                    "method", method,
                    "duration", duration,
                    "error", err,
                )
            } else {
                level.Info(logger).Log(
                    "method", method,
                    "duration", duration,
                )
            }

            return response, err
        }
    }
}

// getMethodName returns a human-readable name for the request type
func getMethodName(request interface{}) string {
    switch request.(type) {
    case CreateUserRequest:
        return "CreateUser"
    case GetUserRequest:
        return "GetUser"
    case UpdateUserRequest:
        return "UpdateUser"
    case DeleteUserRequest:
        return "DeleteUser"
    case ListUsersRequest:
        return "ListUsers"
    default:
        return "Unknown"
    }
}

// ServiceLoggingMiddleware wraps the service layer with logging.
// This logs at the business logic level, before any transport encoding.
type loggingService struct {
    logger log.Logger
    next   Service
}

// NewLoggingService wraps a service with logging middleware.
func NewLoggingService(logger log.Logger, svc Service) Service {
    return &loggingService{
        logger: logger,
        next:   svc,
    }
}

func (s *loggingService) CreateUser(ctx context.Context, email, name string) (user *User, err error) {
    defer func(start time.Time) {
        level.Info(s.logger).Log(
            "method", "CreateUser",
            "email", email,
            "name", name,
            "user_id", getUserID(user),
            "error", err,
            "duration", time.Since(start),
        )
    }(time.Now())
    return s.next.CreateUser(ctx, email, name)
}

func (s *loggingService) GetUser(ctx context.Context, id string) (user *User, err error) {
    defer func(start time.Time) {
        level.Info(s.logger).Log(
            "method", "GetUser",
            "id", id,
            "found", user != nil,
            "error", err,
            "duration", time.Since(start),
        )
    }(time.Now())
    return s.next.GetUser(ctx, id)
}

func (s *loggingService) UpdateUser(ctx context.Context, id, email, name string) (user *User, err error) {
    defer func(start time.Time) {
        level.Info(s.logger).Log(
            "method", "UpdateUser",
            "id", id,
            "error", err,
            "duration", time.Since(start),
        )
    }(time.Now())
    return s.next.UpdateUser(ctx, id, email, name)
}

func (s *loggingService) DeleteUser(ctx context.Context, id string) (err error) {
    defer func(start time.Time) {
        level.Info(s.logger).Log(
            "method", "DeleteUser",
            "id", id,
            "error", err,
            "duration", time.Since(start),
        )
    }(time.Now())
    return s.next.DeleteUser(ctx, id)
}

func (s *loggingService) ListUsers(ctx context.Context, limit, offset int) (users []*User, err error) {
    defer func(start time.Time) {
        level.Info(s.logger).Log(
            "method", "ListUsers",
            "limit", limit,
            "offset", offset,
            "count", len(users),
            "error", err,
            "duration", time.Since(start),
        )
    }(time.Now())
    return s.next.ListUsers(ctx, limit, offset)
}

// getUserID safely extracts ID from a potentially nil user
func getUserID(u *User) string {
    if u == nil {
        return ""
    }
    return u.ID
}
```

You can apply middleware at either the service level or the endpoint level:
- **Service-level logging**: Logs business-specific details (email, user_id)
- **Endpoint-level logging**: Logs generic request/response timing

---

## 10. Middleware - Metrics

Metrics middleware tracks request counts, durations, and error rates. This is essential for monitoring service health.

```go
// pkg/userservice/middleware_metrics.go
package userservice

import (
    "context"
    "time"

    "github.com/go-kit/kit/endpoint"
    "github.com/go-kit/kit/metrics"
)

// InstrumentingMiddleware returns an endpoint middleware that records
// request count, duration, and error rate for each endpoint.
func InstrumentingMiddleware(
    requestCount metrics.Counter,
    requestLatency metrics.Histogram,
    requestErrors metrics.Counter,
) endpoint.Middleware {
    return func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, request interface{}) (response interface{}, err error) {
            method := getMethodName(request)

            // Increment request counter
            requestCount.With("method", method).Add(1)

            // Record latency
            defer func(start time.Time) {
                requestLatency.With("method", method).Observe(time.Since(start).Seconds())

                // Check if response contains an error
                if hasError(response) {
                    requestErrors.With("method", method).Add(1)
                }
            }(time.Now())

            return next(ctx, request)
        }
    }
}

// hasError checks if the response contains an error field
func hasError(response interface{}) bool {
    switch r := response.(type) {
    case CreateUserResponse:
        return r.Error != ""
    case GetUserResponse:
        return r.Error != ""
    case UpdateUserResponse:
        return r.Error != ""
    case DeleteUserResponse:
        return r.Error != ""
    case ListUsersResponse:
        return r.Error != ""
    default:
        return false
    }
}

// metricsService wraps a service with Prometheus metrics
type metricsService struct {
    requestCount   metrics.Counter
    requestLatency metrics.Histogram
    next           Service
}

// NewMetricsService wraps a service with metrics collection.
func NewMetricsService(
    requestCount metrics.Counter,
    requestLatency metrics.Histogram,
    svc Service,
) Service {
    return &metricsService{
        requestCount:   requestCount,
        requestLatency: requestLatency,
        next:           svc,
    }
}

func (s *metricsService) CreateUser(ctx context.Context, email, name string) (*User, error) {
    defer func(start time.Time) {
        s.requestCount.With("method", "CreateUser").Add(1)
        s.requestLatency.With("method", "CreateUser").Observe(time.Since(start).Seconds())
    }(time.Now())
    return s.next.CreateUser(ctx, email, name)
}

func (s *metricsService) GetUser(ctx context.Context, id string) (*User, error) {
    defer func(start time.Time) {
        s.requestCount.With("method", "GetUser").Add(1)
        s.requestLatency.With("method", "GetUser").Observe(time.Since(start).Seconds())
    }(time.Now())
    return s.next.GetUser(ctx, id)
}

func (s *metricsService) UpdateUser(ctx context.Context, id, email, name string) (*User, error) {
    defer func(start time.Time) {
        s.requestCount.With("method", "UpdateUser").Add(1)
        s.requestLatency.With("method", "UpdateUser").Observe(time.Since(start).Seconds())
    }(time.Now())
    return s.next.UpdateUser(ctx, id, email, name)
}

func (s *metricsService) DeleteUser(ctx context.Context, id string) error {
    defer func(start time.Time) {
        s.requestCount.With("method", "DeleteUser").Add(1)
        s.requestLatency.With("method", "DeleteUser").Observe(time.Since(start).Seconds())
    }(time.Now())
    return s.next.DeleteUser(ctx, id)
}

func (s *metricsService) ListUsers(ctx context.Context, limit, offset int) ([]*User, error) {
    defer func(start time.Time) {
        s.requestCount.With("method", "ListUsers").Add(1)
        s.requestLatency.With("method", "ListUsers").Observe(time.Since(start).Seconds())
    }(time.Now())
    return s.next.ListUsers(ctx, limit, offset)
}
```

---

## 11. Middleware - Rate Limiting

Rate limiting protects your service from being overwhelmed. Go-Kit provides rate limiter middleware out of the box.

```go
// pkg/userservice/middleware_ratelimit.go
package userservice

import (
    "context"
    "errors"

    "github.com/go-kit/kit/endpoint"
    "github.com/go-kit/kit/ratelimit"
    "golang.org/x/time/rate"
)

// ErrRateLimitExceeded is returned when a client exceeds the rate limit
var ErrRateLimitExceeded = errors.New("rate limit exceeded")

// RateLimitMiddleware returns an endpoint middleware that limits
// the number of requests per second using a token bucket algorithm.
func RateLimitMiddleware(limit rate.Limit, burst int) endpoint.Middleware {
    // Create a token bucket rate limiter
    // limit: requests per second
    // burst: maximum number of requests allowed in a burst
    limiter := rate.NewLimiter(limit, burst)

    return func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, request interface{}) (interface{}, error) {
            // Wait returns an error if the context is cancelled
            // or the wait time exceeds the context deadline
            if !limiter.Allow() {
                return nil, ErrRateLimitExceeded
            }
            return next(ctx, request)
        }
    }
}

// PerClientRateLimiter provides rate limiting per client.
// This is useful when you want different limits for different clients.
type PerClientRateLimiter struct {
    limiters map[string]*rate.Limiter
    limit    rate.Limit
    burst    int
}

// NewPerClientRateLimiter creates a rate limiter that tracks limits per client.
func NewPerClientRateLimiter(limit rate.Limit, burst int) *PerClientRateLimiter {
    return &PerClientRateLimiter{
        limiters: make(map[string]*rate.Limiter),
        limit:    limit,
        burst:    burst,
    }
}

// GetLimiter returns the rate limiter for a given client ID.
func (p *PerClientRateLimiter) GetLimiter(clientID string) *rate.Limiter {
    if limiter, exists := p.limiters[clientID]; exists {
        return limiter
    }
    limiter := rate.NewLimiter(p.limit, p.burst)
    p.limiters[clientID] = limiter
    return limiter
}

// Middleware returns an endpoint middleware that applies per-client rate limiting.
func (p *PerClientRateLimiter) Middleware(extractClientID func(interface{}) string) endpoint.Middleware {
    return func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, request interface{}) (interface{}, error) {
            clientID := extractClientID(request)
            limiter := p.GetLimiter(clientID)

            if !limiter.Allow() {
                return nil, ErrRateLimitExceeded
            }
            return next(ctx, request)
        }
    }
}
```

---

## 12. Error Handling

Proper error handling in Go-Kit distinguishes between transport errors and business errors.

```go
// pkg/userservice/errors.go
package userservice

import (
    "net/http"
)

// errorResponse is a consistent error response format
type errorResponse struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

// DomainError represents a business logic error with an HTTP status code
type DomainError struct {
    Err        error
    StatusCode int
    Code       string
}

func (e DomainError) Error() string {
    return e.Err.Error()
}

// Predefined domain errors with appropriate HTTP status codes
var (
    ErrUserNotFound = DomainError{
        Err:        ErrNotFound,
        StatusCode: http.StatusNotFound,
        Code:       "USER_NOT_FOUND",
    }
    ErrInvalidInput = DomainError{
        Err:        ErrInvalidEmail,
        StatusCode: http.StatusBadRequest,
        Code:       "INVALID_INPUT",
    }
    ErrDuplicateUser = DomainError{
        Err:        ErrAlreadyExists,
        StatusCode: http.StatusConflict,
        Code:       "DUPLICATE_USER",
    }
)

// MapDomainError converts a domain error to a DomainError with status code
func MapDomainError(err error) DomainError {
    switch err {
    case ErrNotFound:
        return ErrUserNotFound
    case ErrInvalidEmail, ErrInvalidName:
        return DomainError{
            Err:        err,
            StatusCode: http.StatusBadRequest,
            Code:       "INVALID_INPUT",
        }
    case ErrAlreadyExists:
        return ErrDuplicateUser
    default:
        return DomainError{
            Err:        err,
            StatusCode: http.StatusInternalServerError,
            Code:       "INTERNAL_ERROR",
        }
    }
}

// encodeHTTPErrorWithStatus returns a proper HTTP status code based on the error
func encodeHTTPErrorWithStatus(ctx context.Context, err error, w http.ResponseWriter) {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")

    domainErr := MapDomainError(err)
    w.WriteHeader(domainErr.StatusCode)

    json.NewEncoder(w).Encode(errorResponse{
        Code:    domainErr.Code,
        Message: domainErr.Err.Error(),
    })
}
```

---

## 13. Service Discovery

For microservices to communicate, they need to find each other. Go-Kit supports multiple service discovery mechanisms.

```go
// pkg/userservice/discovery.go
package userservice

import (
    "io"
    "time"

    "github.com/go-kit/kit/endpoint"
    "github.com/go-kit/kit/log"
    "github.com/go-kit/kit/sd"
    "github.com/go-kit/kit/sd/consul"
    "github.com/go-kit/kit/sd/lb"
    consulapi "github.com/hashicorp/consul/api"
)

// ConsulServiceDiscovery wraps Consul-based service discovery
type ConsulServiceDiscovery struct {
    client  consul.Client
    logger  log.Logger
}

// NewConsulServiceDiscovery creates a new Consul service discovery client
func NewConsulServiceDiscovery(consulAddr string, logger log.Logger) (*ConsulServiceDiscovery, error) {
    config := consulapi.DefaultConfig()
    config.Address = consulAddr

    consulClient, err := consulapi.NewClient(config)
    if err != nil {
        return nil, err
    }

    client := consul.NewClient(consulClient)

    return &ConsulServiceDiscovery{
        client: client,
        logger: logger,
    }, nil
}

// Register registers this service instance with Consul
func (c *ConsulServiceDiscovery) Register(serviceID, serviceName, address string, port int) error {
    registration := &consulapi.AgentServiceRegistration{
        ID:      serviceID,
        Name:    serviceName,
        Address: address,
        Port:    port,
        Check: &consulapi.AgentServiceCheck{
            HTTP:     fmt.Sprintf("http://%s:%d/health", address, port),
            Interval: "10s",
            Timeout:  "3s",
        },
    }

    return c.client.Register(registration)
}

// Deregister removes this service instance from Consul
func (c *ConsulServiceDiscovery) Deregister(serviceID string) error {
    return c.client.Deregister(&consulapi.AgentServiceRegistration{
        ID: serviceID,
    })
}

// MakeEndpointWithLoadBalancer creates a load-balanced endpoint for a remote service
func (c *ConsulServiceDiscovery) MakeEndpointWithLoadBalancer(
    serviceName string,
    factory sd.Factory,
) endpoint.Endpoint {
    // Create an instancer that watches Consul for service instances
    instancer := consul.NewInstancer(c.client, c.logger, serviceName, []string{}, true)

    // Create an endpointer that creates endpoints from instances
    endpointer := sd.NewEndpointer(instancer, factory, c.logger)

    // Create a round-robin load balancer
    balancer := lb.NewRoundRobin(endpointer)

    // Retry failed requests up to 3 times
    retry := lb.Retry(3, 500*time.Millisecond, balancer)

    return retry
}
```

---

## 14. Putting It All Together

Here is the main entry point that wires everything together:

```go
// cmd/server/main.go
package main

import (
    "context"
    "fmt"
    "net"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    "github.com/go-kit/kit/log"
    "github.com/go-kit/kit/log/level"
    "github.com/go-kit/kit/metrics/prometheus"
    stdprometheus "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "golang.org/x/time/rate"
    "google.golang.org/grpc"

    "github.com/yourorg/user-service/pb"
    "github.com/yourorg/user-service/pkg/userservice"
)

func main() {
    // Initialize logger
    var logger log.Logger
    logger = log.NewJSONLogger(log.NewSyncWriter(os.Stdout))
    logger = log.With(logger, "ts", log.DefaultTimestampUTC)
    logger = log.With(logger, "caller", log.DefaultCaller)
    logger = log.With(logger, "service", "user-service")

    level.Info(logger).Log("msg", "starting user service")

    // Create metrics
    fieldKeys := []string{"method"}

    requestCount := prometheus.NewCounterFrom(stdprometheus.CounterOpts{
        Namespace: "user_service",
        Name:      "request_count",
        Help:      "Total number of requests received",
    }, fieldKeys)

    requestLatency := prometheus.NewHistogramFrom(stdprometheus.HistogramOpts{
        Namespace: "user_service",
        Name:      "request_latency_seconds",
        Help:      "Request duration in seconds",
        Buckets:   []float64{0.001, 0.01, 0.1, 0.5, 1, 5},
    }, fieldKeys)

    requestErrors := prometheus.NewCounterFrom(stdprometheus.CounterOpts{
        Namespace: "user_service",
        Name:      "request_errors",
        Help:      "Total number of request errors",
    }, fieldKeys)

    // Create the service
    var svc userservice.Service
    svc = userservice.NewService()

    // Wrap with logging middleware
    svc = userservice.NewLoggingService(logger, svc)

    // Wrap with metrics middleware
    svc = userservice.NewMetricsService(requestCount, requestLatency, svc)

    // Create endpoints
    endpoints := userservice.MakeEndpoints(svc)

    // Apply endpoint-level middleware
    // Rate limit: 100 requests per second with burst of 10
    rateLimiter := userservice.RateLimitMiddleware(rate.Limit(100), 10)

    endpoints.CreateUser = rateLimiter(endpoints.CreateUser)
    endpoints.GetUser = rateLimiter(endpoints.GetUser)
    endpoints.UpdateUser = rateLimiter(endpoints.UpdateUser)
    endpoints.DeleteUser = rateLimiter(endpoints.DeleteUser)
    endpoints.ListUsers = rateLimiter(endpoints.ListUsers)

    // Create error channel for graceful shutdown
    errs := make(chan error)

    // Start HTTP server
    go func() {
        httpAddr := getEnv("HTTP_ADDR", ":8080")
        httpHandler := userservice.NewHTTPHandler(endpoints, logger)

        // Add health check endpoint
        mux := http.NewServeMux()
        mux.Handle("/", httpHandler)
        mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
            w.Write([]byte("OK"))
        })
        mux.Handle("/metrics", promhttp.Handler())

        level.Info(logger).Log("transport", "HTTP", "addr", httpAddr)
        errs <- http.ListenAndServe(httpAddr, mux)
    }()

    // Start gRPC server
    go func() {
        grpcAddr := getEnv("GRPC_ADDR", ":9090")
        listener, err := net.Listen("tcp", grpcAddr)
        if err != nil {
            errs <- err
            return
        }

        grpcServer := grpc.NewServer()
        pb.RegisterUserServiceServer(grpcServer, userservice.NewGRPCServer(endpoints))

        level.Info(logger).Log("transport", "gRPC", "addr", grpcAddr)
        errs <- grpcServer.Serve(listener)
    }()

    // Handle shutdown signals
    go func() {
        c := make(chan os.Signal, 1)
        signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
        errs <- fmt.Errorf("%s", <-c)
    }()

    // Wait for shutdown
    level.Error(logger).Log("exit", <-errs)
}

// getEnv returns environment variable value or default
func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

---

## 15. Testing Your Microservice

Go-Kit's clean architecture makes testing straightforward:

```go
// pkg/userservice/service_test.go
package userservice

import (
    "context"
    "testing"
)

func TestCreateUser(t *testing.T) {
    svc := NewService()
    ctx := context.Background()

    // Test successful creation
    user, err := svc.CreateUser(ctx, "test@example.com", "Test User")
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if user.Email != "test@example.com" {
        t.Errorf("expected email test@example.com, got %s", user.Email)
    }
    if user.Name != "Test User" {
        t.Errorf("expected name Test User, got %s", user.Name)
    }
    if user.ID == "" {
        t.Error("expected non-empty ID")
    }

    // Test invalid email
    _, err = svc.CreateUser(ctx, "invalid-email", "Test")
    if err != ErrInvalidEmail {
        t.Errorf("expected ErrInvalidEmail, got %v", err)
    }

    // Test empty name
    _, err = svc.CreateUser(ctx, "valid@example.com", "")
    if err != ErrInvalidName {
        t.Errorf("expected ErrInvalidName, got %v", err)
    }

    // Test duplicate email
    _, err = svc.CreateUser(ctx, "test@example.com", "Another User")
    if err != ErrAlreadyExists {
        t.Errorf("expected ErrAlreadyExists, got %v", err)
    }
}

func TestGetUser(t *testing.T) {
    svc := NewService()
    ctx := context.Background()

    // Create a user first
    created, _ := svc.CreateUser(ctx, "get@example.com", "Get User")

    // Test successful retrieval
    user, err := svc.GetUser(ctx, created.ID)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if user.ID != created.ID {
        t.Errorf("expected ID %s, got %s", created.ID, user.ID)
    }

    // Test not found
    _, err = svc.GetUser(ctx, "nonexistent-id")
    if err != ErrNotFound {
        t.Errorf("expected ErrNotFound, got %v", err)
    }
}

func TestUpdateUser(t *testing.T) {
    svc := NewService()
    ctx := context.Background()

    // Create a user first
    created, _ := svc.CreateUser(ctx, "update@example.com", "Original Name")

    // Test successful update
    updated, err := svc.UpdateUser(ctx, created.ID, "", "New Name")
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if updated.Name != "New Name" {
        t.Errorf("expected name New Name, got %s", updated.Name)
    }
    if updated.Email != "update@example.com" {
        t.Errorf("email should not change when not provided")
    }

    // Test updating non-existent user
    _, err = svc.UpdateUser(ctx, "nonexistent-id", "", "Name")
    if err != ErrNotFound {
        t.Errorf("expected ErrNotFound, got %v", err)
    }
}

func TestDeleteUser(t *testing.T) {
    svc := NewService()
    ctx := context.Background()

    // Create a user first
    created, _ := svc.CreateUser(ctx, "delete@example.com", "Delete Me")

    // Test successful deletion
    err := svc.DeleteUser(ctx, created.ID)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }

    // Verify user is gone
    _, err = svc.GetUser(ctx, created.ID)
    if err != ErrNotFound {
        t.Errorf("expected ErrNotFound after deletion, got %v", err)
    }

    // Test deleting non-existent user
    err = svc.DeleteUser(ctx, "nonexistent-id")
    if err != ErrNotFound {
        t.Errorf("expected ErrNotFound, got %v", err)
    }
}

func TestListUsers(t *testing.T) {
    svc := NewService()
    ctx := context.Background()

    // Create some users
    svc.CreateUser(ctx, "user1@example.com", "User 1")
    svc.CreateUser(ctx, "user2@example.com", "User 2")
    svc.CreateUser(ctx, "user3@example.com", "User 3")

    // Test list all
    users, err := svc.ListUsers(ctx, 10, 0)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if len(users) != 3 {
        t.Errorf("expected 3 users, got %d", len(users))
    }

    // Test pagination
    users, err = svc.ListUsers(ctx, 2, 0)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if len(users) != 2 {
        t.Errorf("expected 2 users with limit, got %d", len(users))
    }

    // Test offset
    users, err = svc.ListUsers(ctx, 10, 2)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if len(users) != 1 {
        t.Errorf("expected 1 user with offset, got %d", len(users))
    }
}
```

Testing endpoints:

```go
// pkg/userservice/endpoint_test.go
package userservice

import (
    "context"
    "testing"
)

func TestCreateUserEndpoint(t *testing.T) {
    svc := NewService()
    endpoints := MakeEndpoints(svc)
    ctx := context.Background()

    // Test successful creation through endpoint
    req := CreateUserRequest{
        Email: "endpoint@example.com",
        Name:  "Endpoint User",
    }

    resp, err := endpoints.CreateUser(ctx, req)
    if err != nil {
        t.Fatalf("endpoint error: %v", err)
    }

    response := resp.(CreateUserResponse)
    if response.Error != "" {
        t.Errorf("expected no error in response, got %s", response.Error)
    }
    if response.User == nil {
        t.Fatal("expected user in response")
    }
    if response.User.Email != "endpoint@example.com" {
        t.Errorf("expected email endpoint@example.com, got %s", response.User.Email)
    }
}

func TestGetUserEndpoint(t *testing.T) {
    svc := NewService()
    endpoints := MakeEndpoints(svc)
    ctx := context.Background()

    // Create a user first
    createResp, _ := endpoints.CreateUser(ctx, CreateUserRequest{
        Email: "getendpoint@example.com",
        Name:  "Get Endpoint User",
    })
    createdUser := createResp.(CreateUserResponse).User

    // Test retrieval through endpoint
    resp, err := endpoints.GetUser(ctx, GetUserRequest{ID: createdUser.ID})
    if err != nil {
        t.Fatalf("endpoint error: %v", err)
    }

    response := resp.(GetUserResponse)
    if response.Error != "" {
        t.Errorf("expected no error, got %s", response.Error)
    }
    if response.User.ID != createdUser.ID {
        t.Errorf("user ID mismatch")
    }
}
```

---

## 16. Production Considerations

When deploying Go-Kit services to production, keep these practices in mind:

**Health Checks**: Always expose a `/health` endpoint for Kubernetes liveness and readiness probes:

```go
mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    // Check dependencies (database, cache, etc.)
    if err := checkDependencies(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte(err.Error()))
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
})
```

**Graceful Shutdown**: Handle SIGTERM properly to drain connections:

```go
// Create server with timeout
server := &http.Server{
    Addr:         httpAddr,
    Handler:      mux,
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 15 * time.Second,
    IdleTimeout:  60 * time.Second,
}

// Graceful shutdown
go func() {
    <-shutdownChan
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    server.Shutdown(ctx)
}()
```

**Distributed Tracing**: Add OpenTelemetry for end-to-end visibility:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

// Add tracing to endpoints
func TracingMiddleware(tracer trace.Tracer) endpoint.Middleware {
    return func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, request interface{}) (interface{}, error) {
            ctx, span := tracer.Start(ctx, getMethodName(request))
            defer span.End()
            return next(ctx, request)
        }
    }
}
```

**Circuit Breaker**: Protect against cascading failures:

```go
import (
    "github.com/go-kit/kit/circuitbreaker"
    "github.com/sony/gobreaker"
)

// Apply circuit breaker to endpoints that call external services
cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "external-payment-api",
    MaxRequests: 5,
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second,
})

endpoints.ProcessPayment = circuitbreaker.Gobreaker(cb)(endpoints.ProcessPayment)
```

---

## Summary

| Concept | Purpose |
|---------|---------|
| Service Layer | Pure business logic, transport-agnostic |
| Endpoint Layer | Request/response transformation, middleware application |
| Transport Layer | Protocol handling (HTTP, gRPC, etc.) |
| Middleware | Cross-cutting concerns (logging, metrics, rate limiting) |
| Service Discovery | Dynamic service registration and lookup |

Go-Kit gives you the building blocks to construct maintainable microservices. The three-layer architecture ensures testability, the middleware pattern handles cross-cutting concerns cleanly, and the transport abstraction lets you support multiple protocols without code duplication.

Start simple - implement your service interface and HTTP transport first. Add gRPC when you need it. Layer in middleware as your observability requirements grow. The modular design means you can evolve your architecture incrementally.

---

## Monitor Your Go-Kit Microservices with OneUptime

Building microservices is only half the battle. You need visibility into how they behave in production. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Go-Kit services:

- **Distributed Tracing**: Track requests as they flow through your microservices with OpenTelemetry integration
- **Metrics and Dashboards**: Visualize request latency, error rates, and throughput in real-time
- **Alerting**: Get notified when services degrade before your users notice
- **Status Pages**: Communicate service health to your customers
- **Incident Management**: Coordinate response when things go wrong

OneUptime integrates seamlessly with the Prometheus metrics and OpenTelemetry traces that Go-Kit applications produce. Send your telemetry data to OneUptime and get instant visibility into your microservice architecture.

[Get started with OneUptime](https://oneuptime.com) and take control of your microservices observability.

---

### Related Reading

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry)
- [The Three Pillars of Observability: Logs, Metrics, and Traces](/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces)
- [SRE Best Practices](/blog/post/2025-11-28-sre-best-practices)
