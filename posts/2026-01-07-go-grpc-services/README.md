# How to Build gRPC Services in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, gRPC, Protobuf, Microservices, API

Description: Build high-performance gRPC services in Go with Protocol Buffers, covering code generation, unary calls, and streaming patterns.

---

gRPC is a high-performance, open-source RPC framework developed by Google that uses HTTP/2 for transport, Protocol Buffers for serialization, and provides features like bidirectional streaming, flow control, and deadline propagation. In this comprehensive guide, we will explore how to build gRPC services in Go from the ground up.

## Why gRPC?

Before diving into the implementation, let's understand why gRPC is an excellent choice for building microservices:

- **Performance**: Binary serialization with Protocol Buffers is significantly faster than JSON
- **Type Safety**: Strongly typed contracts prevent runtime errors
- **Streaming**: Native support for client, server, and bidirectional streaming
- **Code Generation**: Automatic client and server stub generation in multiple languages
- **HTTP/2**: Multiplexing, header compression, and persistent connections out of the box

## Prerequisites

Before we begin, ensure you have the following installed:

- Go 1.21 or later
- Protocol Buffers compiler (protoc)
- Go plugins for protoc

## Setting Up the Development Environment

First, install the Protocol Buffers compiler and Go plugins required for code generation.

```bash
# Install protoc on macOS using Homebrew
brew install protobuf

# Install protoc on Ubuntu/Debian
sudo apt-get install -y protobuf-compiler

# Install the Go plugins for Protocol Buffers
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Ensure the Go bin directory is in your PATH
export PATH="$PATH:$(go env GOPATH)/bin"
```

## Project Structure

Let's set up a well-organized project structure for our gRPC service.

```
grpc-go-demo/
├── proto/
│   └── user/
│       └── user.proto
├── pb/
│   └── user/
│       ├── user.pb.go
│       └── user_grpc.pb.go
├── server/
│   └── main.go
├── client/
│   └── main.go
├── service/
│   └── user_service.go
├── go.mod
└── go.sum
```

Initialize your Go module with the required dependencies.

```bash
# Initialize the Go module
go mod init github.com/yourname/grpc-go-demo

# Add gRPC and Protocol Buffers dependencies
go get google.golang.org/grpc
go get google.golang.org/protobuf
```

## Defining Protocol Buffers

Protocol Buffers (protobuf) are used to define the service contract including messages and RPC methods. This .proto file defines all our service methods and data structures.

```protobuf
// proto/user/user.proto
syntax = "proto3";

package user;

// Specifies the Go package path for generated code
option go_package = "github.com/yourname/grpc-go-demo/pb/user";

// User represents a user entity in our system
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  int32 age = 4;
  repeated string roles = 5;  // A user can have multiple roles
  UserStatus status = 6;
}

// UserStatus defines the possible states for a user account
enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
}

// Request message for getting a single user
message GetUserRequest {
  int64 id = 1;
}

// Response message containing the requested user
message GetUserResponse {
  User user = 1;
}

// Request for creating a new user
message CreateUserRequest {
  string name = 1;
  string email = 2;
  int32 age = 3;
  repeated string roles = 4;
}

// Response after creating a user
message CreateUserResponse {
  User user = 1;
}

// Request for listing users with pagination
message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

// Response containing a page of users
message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}

// Request for streaming user updates
message WatchUsersRequest {
  repeated int64 user_ids = 1;  // List of user IDs to watch
}

// Event representing a user update
message UserEvent {
  User user = 1;
  EventType event_type = 2;
}

// Types of events that can occur on a user
enum EventType {
  EVENT_TYPE_UNSPECIFIED = 0;
  EVENT_TYPE_CREATED = 1;
  EVENT_TYPE_UPDATED = 2;
  EVENT_TYPE_DELETED = 3;
}

// Request for bulk creating users via client streaming
message BulkCreateUsersRequest {
  string name = 1;
  string email = 2;
  int32 age = 3;
}

// Response after bulk creating users
message BulkCreateUsersResponse {
  int32 created_count = 1;
  repeated int64 user_ids = 2;
}

// Chat message for bidirectional streaming demo
message ChatMessage {
  int64 user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}

// The UserService defines all RPC methods for user management
service UserService {
  // Unary RPC: Get a single user by ID
  rpc GetUser(GetUserRequest) returns (GetUserResponse);

  // Unary RPC: Create a new user
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);

  // Server streaming RPC: Watch for user updates
  rpc WatchUsers(WatchUsersRequest) returns (stream UserEvent);

  // Client streaming RPC: Bulk create users
  rpc BulkCreateUsers(stream BulkCreateUsersRequest) returns (BulkCreateUsersResponse);

  // Bidirectional streaming RPC: Real-time chat
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

## Generating Go Code from Protobuf

After defining the .proto file, generate the Go code using protoc. This creates message types and gRPC service interfaces.

```bash
# Create the output directory for generated code
mkdir -p pb/user

# Generate Go code from the proto file
# --go_out generates message types
# --go-grpc_out generates gRPC service interfaces
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/user/user.proto
```

You can also create a Makefile to simplify the generation process.

```makefile
# Makefile
.PHONY: proto clean

# Generate all protobuf files
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/user/user.proto

# Clean generated files
clean:
	rm -rf pb/
```

## Implementing the gRPC Server

Now let's implement the gRPC server with all four RPC patterns. We'll start with the service implementation.

### User Service Implementation

This file contains all the RPC method implementations including unary, server streaming, client streaming, and bidirectional streaming.

```go
// service/user_service.go
package service

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "github.com/yourname/grpc-go-demo/pb/user"
)

// UserService implements the UserServiceServer interface generated by protoc
type UserService struct {
	pb.UnimplementedUserServiceServer

	// In-memory storage for demo purposes
	mu       sync.RWMutex
	users    map[int64]*pb.User
	nextID   int64
	watchers map[int64][]chan *pb.UserEvent
}

// NewUserService creates a new UserService instance with initialized storage
func NewUserService() *UserService {
	return &UserService{
		users:    make(map[int64]*pb.User),
		nextID:   1,
		watchers: make(map[int64][]chan *pb.UserEvent),
	}
}

// GetUser implements the unary RPC for retrieving a user by ID
// This is the simplest RPC pattern: one request, one response
func (s *UserService) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	// Validate the request
	if req.GetId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "user ID must be positive")
	}

	// Check for context cancellation before proceeding
	if ctx.Err() != nil {
		return nil, status.Error(codes.Canceled, "request was canceled")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	// Look up the user in our storage
	user, exists := s.users[req.GetId()]
	if !exists {
		// Return a NOT_FOUND error with a descriptive message
		return nil, status.Errorf(codes.NotFound, "user with ID %d not found", req.GetId())
	}

	return &pb.GetUserResponse{User: user}, nil
}

// CreateUser implements the unary RPC for creating a new user
func (s *UserService) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	// Validate required fields
	if req.GetName() == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}
	if req.GetEmail() == "" {
		return nil, status.Error(codes.InvalidArgument, "email is required")
	}

	s.mu.Lock()

	// Create the new user with an auto-incremented ID
	user := &pb.User{
		Id:     s.nextID,
		Name:   req.GetName(),
		Email:  req.GetEmail(),
		Age:    req.GetAge(),
		Roles:  req.GetRoles(),
		Status: pb.UserStatus_USER_STATUS_ACTIVE,
	}

	// Store the user and increment the ID counter
	s.users[user.Id] = user
	s.nextID++

	// Notify any watchers about the new user
	s.notifyWatchers(user, pb.EventType_EVENT_TYPE_CREATED)

	s.mu.Unlock()

	return &pb.CreateUserResponse{User: user}, nil
}

// WatchUsers implements server-side streaming RPC
// The client sends one request and receives a stream of user events
func (s *UserService) WatchUsers(req *pb.WatchUsersRequest, stream pb.UserService_WatchUsersServer) error {
	// Create a channel to receive user events
	eventChan := make(chan *pb.UserEvent, 100)

	// Register this watcher for the requested user IDs
	s.mu.Lock()
	for _, userID := range req.GetUserIds() {
		s.watchers[userID] = append(s.watchers[userID], eventChan)
	}
	s.mu.Unlock()

	// Clean up the watcher when the stream ends
	defer func() {
		s.mu.Lock()
		for _, userID := range req.GetUserIds() {
			watchers := s.watchers[userID]
			for i, ch := range watchers {
				if ch == eventChan {
					s.watchers[userID] = append(watchers[:i], watchers[i+1:]...)
					break
				}
			}
		}
		s.mu.Unlock()
		close(eventChan)
	}()

	// Stream events to the client until the context is done
	for {
		select {
		case event := <-eventChan:
			// Send the event to the client
			if err := stream.Send(event); err != nil {
				return status.Errorf(codes.Internal, "failed to send event: %v", err)
			}
		case <-stream.Context().Done():
			// Client disconnected or context was canceled
			return status.Error(codes.Canceled, "client disconnected")
		}
	}
}

// notifyWatchers sends a user event to all registered watchers
func (s *UserService) notifyWatchers(user *pb.User, eventType pb.EventType) {
	event := &pb.UserEvent{
		User:      user,
		EventType: eventType,
	}

	// Send to all watchers for this user ID
	for _, ch := range s.watchers[user.Id] {
		select {
		case ch <- event:
		default:
			// Channel is full, skip this event to prevent blocking
		}
	}
}

// BulkCreateUsers implements client-side streaming RPC
// The client sends a stream of create requests, server responds once at the end
func (s *UserService) BulkCreateUsers(stream pb.UserService_BulkCreateUsersServer) error {
	var createdIDs []int64
	var count int32

	// Receive and process requests from the client stream
	for {
		req, err := stream.Recv()

		// io.EOF signals that the client has finished sending
		if err == io.EOF {
			// Send the final response with the count and IDs
			return stream.SendAndClose(&pb.BulkCreateUsersResponse{
				CreatedCount: count,
				UserIds:      createdIDs,
			})
		}

		if err != nil {
			return status.Errorf(codes.Internal, "error receiving request: %v", err)
		}

		// Validate each request in the stream
		if req.GetName() == "" || req.GetEmail() == "" {
			// Skip invalid entries but continue processing
			continue
		}

		// Create the user
		s.mu.Lock()
		user := &pb.User{
			Id:     s.nextID,
			Name:   req.GetName(),
			Email:  req.GetEmail(),
			Age:    req.GetAge(),
			Status: pb.UserStatus_USER_STATUS_ACTIVE,
		}
		s.users[user.Id] = user
		createdIDs = append(createdIDs, user.Id)
		s.nextID++
		count++
		s.mu.Unlock()
	}
}

// Chat implements bidirectional streaming RPC
// Both client and server can send messages independently
func (s *UserService) Chat(stream pb.UserService_ChatServer) error {
	// For demo purposes, we'll echo messages back with a prefix
	// In a real app, you'd broadcast to other connected clients

	for {
		// Receive a message from the client
		msg, err := stream.Recv()

		if err == io.EOF {
			// Client closed the stream
			return nil
		}

		if err != nil {
			return status.Errorf(codes.Internal, "error receiving message: %v", err)
		}

		// Check if context is still valid
		if stream.Context().Err() != nil {
			return status.Error(codes.Canceled, "stream context canceled")
		}

		// Create and send a response message
		response := &pb.ChatMessage{
			UserId:    0, // Server ID
			Content:   fmt.Sprintf("Echo: %s", msg.GetContent()),
			Timestamp: time.Now().UnixNano(),
		}

		if err := stream.Send(response); err != nil {
			return status.Errorf(codes.Internal, "error sending message: %v", err)
		}
	}
}
```

### Server Main Entry Point

This file sets up the gRPC server, registers the service, and handles graceful shutdown.

```go
// server/main.go
package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"

	pb "github.com/yourname/grpc-go-demo/pb/user"
	"github.com/yourname/grpc-go-demo/service"
)

func main() {
	// Create a TCP listener on port 50051
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen on port 50051: %v", err)
	}

	// Configure server options for production use
	serverOptions := []grpc.ServerOption{
		// Set maximum message sizes
		grpc.MaxRecvMsgSize(10 * 1024 * 1024), // 10MB
		grpc.MaxSendMsgSize(10 * 1024 * 1024), // 10MB

		// Configure keepalive settings to detect dead connections
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle:     15 * time.Minute,
			MaxConnectionAge:      30 * time.Minute,
			MaxConnectionAgeGrace: 5 * time.Second,
			Time:                  5 * time.Minute,
			Timeout:               20 * time.Second,
		}),

		// Enforce keepalive policies on clients
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             5 * time.Second,
			PermitWithoutStream: true,
		}),
	}

	// Create the gRPC server with our options
	grpcServer := grpc.NewServer(serverOptions...)

	// Create and register our user service
	userService := service.NewUserService()
	pb.RegisterUserServiceServer(grpcServer, userService)

	// Enable server reflection for debugging with tools like grpcurl
	reflection.Register(grpcServer)

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Received shutdown signal, initiating graceful shutdown...")

		// Create a context with timeout for graceful shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// Stop accepting new connections and wait for existing ones
		stopped := make(chan struct{})
		go func() {
			grpcServer.GracefulStop()
			close(stopped)
		}()

		select {
		case <-stopped:
			log.Println("Server stopped gracefully")
		case <-ctx.Done():
			log.Println("Shutdown timeout, forcing stop")
			grpcServer.Stop()
		}
	}()

	log.Printf("gRPC server listening on %s", listener.Addr().String())

	// Start serving requests
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
```

## Implementing the gRPC Client

Now let's create a comprehensive client that demonstrates all four RPC patterns.

```go
// client/main.go
package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"

	pb "github.com/yourname/grpc-go-demo/pb/user"
)

func main() {
	// Establish a connection to the gRPC server
	conn, err := grpc.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Create a client stub
	client := pb.NewUserServiceClient(conn)

	// Demonstrate all RPC patterns
	demonstrateUnaryRPC(client)
	demonstrateServerStreaming(client)
	demonstrateClientStreaming(client)
	demonstrateBidirectionalStreaming(client)
}

// demonstrateUnaryRPC shows the basic request-response pattern
func demonstrateUnaryRPC(client pb.UserServiceClient) {
	fmt.Println("\n=== Unary RPC Demo ===")

	// Create a context with timeout to prevent hanging requests
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First, create a user
	createResp, err := client.CreateUser(ctx, &pb.CreateUserRequest{
		Name:  "Alice Johnson",
		Email: "alice@example.com",
		Age:   28,
		Roles: []string{"admin", "developer"},
	})
	if err != nil {
		handleError("CreateUser", err)
		return
	}
	fmt.Printf("Created user: ID=%d, Name=%s\n", createResp.User.Id, createResp.User.Name)

	// Now fetch the user we just created
	getResp, err := client.GetUser(ctx, &pb.GetUserRequest{
		Id: createResp.User.Id,
	})
	if err != nil {
		handleError("GetUser", err)
		return
	}
	fmt.Printf("Retrieved user: %+v\n", getResp.User)

	// Try to get a user that doesn't exist to demonstrate error handling
	_, err = client.GetUser(ctx, &pb.GetUserRequest{Id: 9999})
	if err != nil {
		handleError("GetUser (non-existent)", err)
	}
}

// demonstrateServerStreaming shows how to receive a stream of responses
func demonstrateServerStreaming(client pb.UserServiceClient) {
	fmt.Println("\n=== Server Streaming RPC Demo ===")

	// Create some users first
	ctx := context.Background()
	var userIDs []int64

	for i := 0; i < 3; i++ {
		resp, err := client.CreateUser(ctx, &pb.CreateUserRequest{
			Name:  fmt.Sprintf("User %d", i+1),
			Email: fmt.Sprintf("user%d@example.com", i+1),
			Age:   int32(20 + i),
		})
		if err != nil {
			handleError("CreateUser", err)
			continue
		}
		userIDs = append(userIDs, resp.User.Id)
	}

	// Create a context with timeout for the streaming call
	streamCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Start watching for user events
	stream, err := client.WatchUsers(streamCtx, &pb.WatchUsersRequest{
		UserIds: userIDs,
	})
	if err != nil {
		handleError("WatchUsers", err)
		return
	}

	fmt.Println("Watching for user events (will timeout after 30 seconds)...")

	// Receive events from the server stream
	for {
		event, err := stream.Recv()
		if err == io.EOF {
			fmt.Println("Server closed the stream")
			break
		}
		if err != nil {
			// Check if it's just a timeout or cancellation
			if status.Code(err) == codes.Canceled ||
			   status.Code(err) == codes.DeadlineExceeded {
				fmt.Println("Stream ended due to timeout/cancellation")
				break
			}
			handleError("WatchUsers stream", err)
			break
		}
		fmt.Printf("Received event: Type=%s, User=%+v\n", event.EventType, event.User)
	}
}

// demonstrateClientStreaming shows how to send a stream of requests
func demonstrateClientStreaming(client pb.UserServiceClient) {
	fmt.Println("\n=== Client Streaming RPC Demo ===")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Open a client stream
	stream, err := client.BulkCreateUsers(ctx)
	if err != nil {
		handleError("BulkCreateUsers", err)
		return
	}

	// Send multiple create requests through the stream
	usersToCreate := []struct {
		name  string
		email string
		age   int32
	}{
		{"Bob Smith", "bob@example.com", 30},
		{"Carol White", "carol@example.com", 25},
		{"Dave Brown", "dave@example.com", 35},
		{"Eve Davis", "eve@example.com", 28},
		{"Frank Miller", "frank@example.com", 42},
	}

	for _, u := range usersToCreate {
		req := &pb.BulkCreateUsersRequest{
			Name:  u.name,
			Email: u.email,
			Age:   u.age,
		}
		if err := stream.Send(req); err != nil {
			handleError("BulkCreateUsers send", err)
			return
		}
		fmt.Printf("Sent create request for: %s\n", u.name)
	}

	// Close the stream and get the response
	resp, err := stream.CloseAndRecv()
	if err != nil {
		handleError("BulkCreateUsers close", err)
		return
	}

	fmt.Printf("Bulk create completed: %d users created, IDs: %v\n",
		resp.CreatedCount, resp.UserIds)
}

// demonstrateBidirectionalStreaming shows how both sides can stream independently
func demonstrateBidirectionalStreaming(client pb.UserServiceClient) {
	fmt.Println("\n=== Bidirectional Streaming RPC Demo ===")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Open a bidirectional stream
	stream, err := client.Chat(ctx)
	if err != nil {
		handleError("Chat", err)
		return
	}

	// Use a WaitGroup to synchronize the sender and receiver goroutines
	var wg sync.WaitGroup

	// Goroutine to send messages
	wg.Add(1)
	go func() {
		defer wg.Done()

		messages := []string{
			"Hello, server!",
			"How are you today?",
			"This is a test message.",
			"Goodbye!",
		}

		for _, msg := range messages {
			chatMsg := &pb.ChatMessage{
				UserId:    1,
				Content:   msg,
				Timestamp: time.Now().UnixNano(),
			}

			if err := stream.Send(chatMsg); err != nil {
				log.Printf("Error sending message: %v", err)
				return
			}
			fmt.Printf("Sent: %s\n", msg)
			time.Sleep(500 * time.Millisecond) // Simulate typing delay
		}

		// Close the send side of the stream
		if err := stream.CloseSend(); err != nil {
			log.Printf("Error closing send: %v", err)
		}
	}()

	// Goroutine to receive messages
	wg.Add(1)
	go func() {
		defer wg.Done()

		for {
			msg, err := stream.Recv()
			if err == io.EOF {
				fmt.Println("Server closed the stream")
				return
			}
			if err != nil {
				if status.Code(err) != codes.Canceled {
					log.Printf("Error receiving: %v", err)
				}
				return
			}
			fmt.Printf("Received: %s\n", msg.Content)
		}
	}()

	// Wait for both goroutines to complete
	wg.Wait()
}

// handleError provides detailed error information based on gRPC status codes
func handleError(operation string, err error) {
	// Extract the gRPC status from the error
	st, ok := status.FromError(err)
	if !ok {
		log.Printf("[%s] Non-gRPC error: %v", operation, err)
		return
	}

	// Handle specific error codes appropriately
	switch st.Code() {
	case codes.NotFound:
		log.Printf("[%s] Resource not found: %s", operation, st.Message())
	case codes.InvalidArgument:
		log.Printf("[%s] Invalid argument: %s", operation, st.Message())
	case codes.PermissionDenied:
		log.Printf("[%s] Permission denied: %s", operation, st.Message())
	case codes.Unauthenticated:
		log.Printf("[%s] Unauthenticated: %s", operation, st.Message())
	case codes.DeadlineExceeded:
		log.Printf("[%s] Request timeout: %s", operation, st.Message())
	case codes.Unavailable:
		log.Printf("[%s] Service unavailable: %s", operation, st.Message())
	case codes.Internal:
		log.Printf("[%s] Internal error: %s", operation, st.Message())
	default:
		log.Printf("[%s] Error (code=%s): %s", operation, st.Code(), st.Message())
	}
}
```

## Error Handling with gRPC Status Codes

gRPC uses a standardized set of status codes for error handling. Here's a comprehensive guide to using them effectively.

### Available Status Codes

```go
// common_errors.go
package common

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Common error creators for consistent error handling across your service

// NotFoundError creates a NOT_FOUND error for missing resources
func NotFoundError(resource string, id interface{}) error {
	return status.Errorf(codes.NotFound, "%s with ID %v not found", resource, id)
}

// InvalidArgumentError creates an INVALID_ARGUMENT error for bad input
func InvalidArgumentError(field, reason string) error {
	return status.Errorf(codes.InvalidArgument, "invalid %s: %s", field, reason)
}

// PermissionDeniedError creates a PERMISSION_DENIED error
func PermissionDeniedError(action, resource string) error {
	return status.Errorf(codes.PermissionDenied, "permission denied to %s %s", action, resource)
}

// UnauthenticatedError creates an UNAUTHENTICATED error
func UnauthenticatedError() error {
	return status.Error(codes.Unauthenticated, "authentication required")
}

// InternalError creates an INTERNAL error for unexpected conditions
func InternalError(msg string) error {
	return status.Errorf(codes.Internal, "internal error: %s", msg)
}

// AlreadyExistsError creates an ALREADY_EXISTS error for duplicate resources
func AlreadyExistsError(resource string, identifier interface{}) error {
	return status.Errorf(codes.AlreadyExists, "%s with identifier %v already exists", resource, identifier)
}

// ResourceExhaustedError creates a RESOURCE_EXHAUSTED error for rate limiting
func ResourceExhaustedError(resource string) error {
	return status.Errorf(codes.ResourceExhausted, "%s quota exceeded", resource)
}
```

### Adding Error Details

For richer error information, you can attach structured details to errors using the errdetails package.

```go
// error_details.go
package common

import (
	"google.golang.org/genproto/googleapis/rpc/errdetails"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ValidationError creates an error with field-level validation details
func ValidationError(violations map[string]string) error {
	// Create the base status
	st := status.New(codes.InvalidArgument, "validation failed")

	// Create BadRequest with field violations
	br := &errdetails.BadRequest{}
	for field, description := range violations {
		br.FieldViolations = append(br.FieldViolations, &errdetails.BadRequest_FieldViolation{
			Field:       field,
			Description: description,
		})
	}

	// Attach the details to the status
	stWithDetails, err := st.WithDetails(br)
	if err != nil {
		// If we can't add details, return the basic error
		return st.Err()
	}

	return stWithDetails.Err()
}

// ExtractValidationErrors extracts field violations from a gRPC error
func ExtractValidationErrors(err error) map[string]string {
	st := status.Convert(err)
	violations := make(map[string]string)

	for _, detail := range st.Details() {
		if br, ok := detail.(*errdetails.BadRequest); ok {
			for _, fv := range br.FieldViolations {
				violations[fv.Field] = fv.Description
			}
		}
	}

	return violations
}
```

## Adding Interceptors for Cross-Cutting Concerns

Interceptors in gRPC are similar to middleware in HTTP frameworks. They allow you to add logging, authentication, metrics, and other cross-cutting concerns.

### Unary Interceptors

These intercept unary (request-response) calls.

```go
// interceptors/logging.go
package interceptors

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

// UnaryLoggingInterceptor logs information about each unary RPC call
func UnaryLoggingInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	start := time.Now()

	// Call the actual handler
	resp, err := handler(ctx, req)

	// Log the call details
	duration := time.Since(start)
	code := status.Code(err)

	log.Printf("gRPC call: method=%s duration=%v code=%s",
		info.FullMethod, duration, code)

	return resp, err
}

// UnaryRecoveryInterceptor recovers from panics and returns an internal error
func UnaryRecoveryInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (resp interface{}, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in %s: %v", info.FullMethod, r)
			err = status.Errorf(codes.Internal, "internal server error")
		}
	}()

	return handler(ctx, req)
}
```

### Stream Interceptors

These intercept streaming calls.

```go
// interceptors/stream.go
package interceptors

import (
	"log"
	"time"

	"google.golang.org/grpc"
)

// StreamLoggingInterceptor logs information about stream connections
func StreamLoggingInterceptor(
	srv interface{},
	ss grpc.ServerStream,
	info *grpc.StreamServerInfo,
	handler grpc.StreamHandler,
) error {
	start := time.Now()

	log.Printf("Stream started: method=%s", info.FullMethod)

	err := handler(srv, ss)

	duration := time.Since(start)
	log.Printf("Stream ended: method=%s duration=%v error=%v",
		info.FullMethod, duration, err)

	return err
}
```

### Registering Interceptors

Update the server setup to use interceptors with chaining for multiple interceptors.

```go
// server/main.go (updated excerpt)
import (
	"google.golang.org/grpc"
	"github.com/yourname/grpc-go-demo/interceptors"
)

func main() {
	// Chain multiple unary interceptors
	unaryInterceptors := grpc.ChainUnaryInterceptor(
		interceptors.UnaryRecoveryInterceptor,
		interceptors.UnaryLoggingInterceptor,
	)

	// Chain multiple stream interceptors
	streamInterceptors := grpc.ChainStreamInterceptor(
		interceptors.StreamLoggingInterceptor,
	)

	// Create server with interceptors
	grpcServer := grpc.NewServer(
		unaryInterceptors,
		streamInterceptors,
	)

	// ... rest of setup
}
```

## Testing gRPC Services

Writing tests for gRPC services is straightforward with the bufconn package, which provides an in-memory connection.

```go
// service/user_service_test.go
package service

import (
	"context"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	pb "github.com/yourname/grpc-go-demo/pb/user"
)

const bufSize = 1024 * 1024

// setupTestServer creates an in-memory gRPC server for testing
func setupTestServer(t *testing.T) (pb.UserServiceClient, func()) {
	// Create an in-memory listener
	lis := bufconn.Listen(bufSize)

	// Create and start the server
	server := grpc.NewServer()
	pb.RegisterUserServiceServer(server, NewUserService())

	go func() {
		if err := server.Serve(lis); err != nil {
			t.Logf("Server exited: %v", err)
		}
	}()

	// Create a client connection using the bufconn dialer
	dialer := func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}

	conn, err := grpc.NewClient(
		"passthrough://bufnet",
		grpc.WithContextDialer(dialer),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("Failed to dial: %v", err)
	}

	client := pb.NewUserServiceClient(conn)

	// Return cleanup function
	cleanup := func() {
		conn.Close()
		server.Stop()
	}

	return client, cleanup
}

func TestCreateUser(t *testing.T) {
	client, cleanup := setupTestServer(t)
	defer cleanup()

	ctx := context.Background()

	// Test successful creation
	resp, err := client.CreateUser(ctx, &pb.CreateUserRequest{
		Name:  "Test User",
		Email: "test@example.com",
		Age:   25,
		Roles: []string{"user"},
	})

	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	if resp.User.Name != "Test User" {
		t.Errorf("Expected name 'Test User', got '%s'", resp.User.Name)
	}

	if resp.User.Id <= 0 {
		t.Errorf("Expected positive ID, got %d", resp.User.Id)
	}
}

func TestGetUser_NotFound(t *testing.T) {
	client, cleanup := setupTestServer(t)
	defer cleanup()

	ctx := context.Background()

	// Try to get a non-existent user
	_, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 9999})

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	// Verify the error code
	st, ok := status.FromError(err)
	if !ok {
		t.Fatalf("Expected gRPC status error, got: %v", err)
	}

	if st.Code() != codes.NotFound {
		t.Errorf("Expected NOT_FOUND, got %s", st.Code())
	}
}

func TestCreateUser_InvalidArgument(t *testing.T) {
	client, cleanup := setupTestServer(t)
	defer cleanup()

	ctx := context.Background()

	// Test with missing name
	_, err := client.CreateUser(ctx, &pb.CreateUserRequest{
		Name:  "",
		Email: "test@example.com",
	})

	if err == nil {
		t.Fatal("Expected error for empty name")
	}

	st, _ := status.FromError(err)
	if st.Code() != codes.InvalidArgument {
		t.Errorf("Expected INVALID_ARGUMENT, got %s", st.Code())
	}
}
```

## Running the Service

Now let's run and test our gRPC service.

```bash
# Start the server in one terminal
go run server/main.go

# In another terminal, run the client
go run client/main.go

# You can also use grpcurl for testing (install with: brew install grpcurl)
# List available services
grpcurl -plaintext localhost:50051 list

# Describe a service
grpcurl -plaintext localhost:50051 describe user.UserService

# Call a method
grpcurl -plaintext -d '{"name": "John", "email": "john@example.com", "age": 30}' \
    localhost:50051 user.UserService/CreateUser
```

## Best Practices

When building production gRPC services, keep these best practices in mind:

1. **Always use context timeouts**: Prevent requests from hanging indefinitely
2. **Handle streaming errors**: Check for io.EOF and context cancellation
3. **Use proper status codes**: Choose the most appropriate code for each error case
4. **Implement graceful shutdown**: Allow in-flight requests to complete
5. **Add interceptors for cross-cutting concerns**: Logging, metrics, authentication
6. **Version your proto files**: Use package versioning (e.g., `user.v1`)
7. **Validate inputs early**: Return InvalidArgument before doing expensive operations
8. **Use streaming wisely**: Not every use case needs streaming; evaluate the tradeoffs

## Conclusion

gRPC provides a powerful framework for building high-performance microservices in Go. With Protocol Buffers for type-safe contracts, HTTP/2 for efficient transport, and native streaming support, gRPC is an excellent choice for inter-service communication. The patterns covered in this guide - unary RPCs, server streaming, client streaming, and bidirectional streaming - give you the flexibility to handle any communication pattern your application requires.

By following the examples and best practices outlined here, you can build robust, scalable gRPC services that are easy to test and maintain. Remember to leverage the rich ecosystem of gRPC middleware and tooling to add observability, security, and other production-ready features to your services.
