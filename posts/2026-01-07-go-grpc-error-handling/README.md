# How to Handle gRPC Errors Gracefully in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, gRPC, Error Handling, API, Microservices

Description: Master gRPC error handling in Go with proper status codes, rich error details, and robust client-side error handling patterns.

---

Error handling is one of the most critical aspects of building reliable gRPC services. Unlike REST APIs where you return HTTP status codes, gRPC has its own rich error model with status codes and detailed error information. In this comprehensive guide, we will explore how to handle gRPC errors gracefully in Go, from basic status codes to advanced error details and client-side handling patterns.

## Table of Contents

1. [Understanding gRPC Status Codes](#understanding-grpc-status-codes)
2. [Creating Errors with the Status Package](#creating-errors-with-the-status-package)
3. [Adding Rich Error Details with errdetails](#adding-rich-error-details-with-errdetails)
4. [Custom Error Types](#custom-error-types)
5. [Client-Side Error Extraction and Handling](#client-side-error-extraction-and-handling)
6. [Error Mapping to HTTP (grpc-gateway)](#error-mapping-to-http-grpc-gateway)
7. [Best Practices and Patterns](#best-practices-and-patterns)
8. [Testing Error Handling](#testing-error-handling)

## Understanding gRPC Status Codes

gRPC defines a set of canonical status codes that all implementations should use. Understanding these codes is essential for building interoperable services that communicate errors effectively.

### The Complete List of gRPC Status Codes

Here is a reference table showing all gRPC status codes, their numeric values, and when to use them:

| Code | Value | Description |
|------|-------|-------------|
| OK | 0 | Success - not an error |
| CANCELLED | 1 | Operation was cancelled by the caller |
| UNKNOWN | 2 | Unknown error (catch-all) |
| INVALID_ARGUMENT | 3 | Client specified an invalid argument |
| DEADLINE_EXCEEDED | 4 | Deadline expired before operation completed |
| NOT_FOUND | 5 | Requested resource was not found |
| ALREADY_EXISTS | 6 | Resource already exists |
| PERMISSION_DENIED | 7 | Caller lacks permission |
| RESOURCE_EXHAUSTED | 8 | Resource has been exhausted (rate limiting) |
| FAILED_PRECONDITION | 9 | Operation rejected due to system state |
| ABORTED | 10 | Operation aborted (usually due to concurrency) |
| OUT_OF_RANGE | 11 | Operation attempted past valid range |
| UNIMPLEMENTED | 12 | Operation not implemented |
| INTERNAL | 13 | Internal server error |
| UNAVAILABLE | 14 | Service temporarily unavailable |
| DATA_LOSS | 15 | Unrecoverable data loss or corruption |
| UNAUTHENTICATED | 16 | Request not authenticated |

### When to Use Each Status Code

The following code demonstrates importing the gRPC status and codes packages that form the foundation of error handling:

```go
package main

import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// StatusCodeGuidelines provides guidance on when to use each code
var StatusCodeGuidelines = map[codes.Code]string{
    // Use INVALID_ARGUMENT when the client sends malformed data
    codes.InvalidArgument: "Use for malformed requests, invalid field values, or missing required fields",

    // Use NOT_FOUND when a specific resource does not exist
    codes.NotFound: "Use when a specific resource (user, order, etc.) cannot be found",

    // Use ALREADY_EXISTS for create operations where resource exists
    codes.AlreadyExists: "Use when trying to create a resource that already exists",

    // Use PERMISSION_DENIED for authorization failures
    codes.PermissionDenied: "Use when user is authenticated but lacks permission",

    // Use UNAUTHENTICATED for authentication failures
    codes.Unauthenticated: "Use when credentials are missing or invalid",

    // Use RESOURCE_EXHAUSTED for rate limiting or quota issues
    codes.ResourceExhausted: "Use for rate limiting, quota exceeded, or out of memory",

    // Use FAILED_PRECONDITION for state-dependent failures
    codes.FailedPrecondition: "Use when system is not in required state for operation",

    // Use ABORTED for concurrency conflicts
    codes.Aborted: "Use for concurrency conflicts like optimistic locking failures",

    // Use INTERNAL only for unexpected server errors
    codes.Internal: "Use sparingly for unexpected server-side errors",

    // Use UNAVAILABLE for transient failures
    codes.Unavailable: "Use for temporary failures - client should retry",
}
```

## Creating Errors with the Status Package

The `status` package is the primary way to create and work with gRPC errors in Go. It provides a rich API for creating errors with status codes and messages.

### Basic Error Creation

This example shows the fundamental patterns for creating gRPC errors with different status codes:

```go
package service

import (
    "context"
    "fmt"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// UserService implements the user service with proper error handling
type UserService struct {
    pb.UnimplementedUserServiceServer
    users map[string]*pb.User
}

// GetUser demonstrates basic error creation with status codes
func (s *UserService) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // Validate input - return INVALID_ARGUMENT for bad input
    if req.GetUserId() == "" {
        return nil, status.Error(codes.InvalidArgument, "user_id is required")
    }

    // Check if user exists - return NOT_FOUND if missing
    user, exists := s.users[req.GetUserId()]
    if !exists {
        return nil, status.Errorf(codes.NotFound, "user with id %q not found", req.GetUserId())
    }

    return user, nil
}
```

### Creating Errors with Status Struct

For more control over error creation, you can use the Status struct directly with the New method:

```go
package service

import (
    "context"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// CreateUser demonstrates using status.New for more control
func (s *UserService) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
    // Validate email format
    if !isValidEmail(req.GetEmail()) {
        // Using status.New gives you a *Status that you can modify
        st := status.New(codes.InvalidArgument, "invalid email format")
        return nil, st.Err()
    }

    // Check for existing user
    if _, exists := s.users[req.GetEmail()]; exists {
        st := status.New(codes.AlreadyExists, "user with this email already exists")
        return nil, st.Err()
    }

    // Create and store user
    user := &pb.User{
        Id:    generateID(),
        Email: req.GetEmail(),
        Name:  req.GetName(),
    }
    s.users[user.Id] = user

    return user, nil
}

func isValidEmail(email string) bool {
    // Simplified validation
    return len(email) > 3 && contains(email, "@")
}

func contains(s, substr string) bool {
    return len(s) >= len(substr) &&
           (s == substr || len(s) > 0 && contains(s[1:], substr) || s[:len(substr)] == substr)
}

func generateID() string {
    return "user-" + randomString(8)
}

func randomString(n int) string {
    // Implementation omitted for brevity
    return "12345678"
}
```

### Wrapping Errors with Status

When you need to wrap an existing error with a gRPC status, use these patterns to preserve error context:

```go
package service

import (
    "context"
    "database/sql"
    "errors"
    "fmt"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// UpdateUser demonstrates wrapping errors with appropriate status codes
func (s *UserService) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.User, error) {
    // Attempt database update
    user, err := s.updateUserInDB(ctx, req)
    if err != nil {
        // Map database errors to appropriate gRPC status codes
        return nil, mapDBError(err, req.GetUserId())
    }

    return user, nil
}

// mapDBError converts database errors to gRPC status errors
func mapDBError(err error, resourceID string) error {
    // Handle specific database errors
    if errors.Is(err, sql.ErrNoRows) {
        return status.Errorf(codes.NotFound, "resource %q not found", resourceID)
    }

    // Handle context errors
    if errors.Is(err, context.DeadlineExceeded) {
        return status.Error(codes.DeadlineExceeded, "database operation timed out")
    }

    if errors.Is(err, context.Canceled) {
        return status.Error(codes.Canceled, "operation was canceled")
    }

    // Handle connection errors as unavailable (retryable)
    if isConnectionError(err) {
        return status.Errorf(codes.Unavailable, "database temporarily unavailable: %v", err)
    }

    // Default to internal error for unexpected failures
    // Note: Be careful not to leak sensitive information in error messages
    return status.Errorf(codes.Internal, "internal error processing request")
}

func isConnectionError(err error) bool {
    // Check for connection-related errors
    return errors.Is(err, sql.ErrConnDone)
}

func (s *UserService) updateUserInDB(ctx context.Context, req *pb.UpdateUserRequest) (*pb.User, error) {
    // Database implementation
    return nil, nil
}
```

## Adding Rich Error Details with errdetails

The `errdetails` package allows you to attach structured error information to your gRPC errors. This is essential for providing actionable feedback to clients.

### Available Error Detail Types

Google provides several standard error detail types that you can use to enrich your errors:

```go
package errortypes

import (
    "google.golang.org/genproto/googleapis/rpc/errdetails"
)

// StandardErrorDetails shows the available error detail types
// These are the most commonly used detail types from errdetails package:

// 1. BadRequest - for field-level validation errors
//    Contains a list of field violations with field path and description

// 2. RetryInfo - tells client when to retry
//    Contains retry_delay duration

// 3. DebugInfo - for debugging information (use carefully)
//    Contains stack_entries and detail string

// 4. QuotaFailure - for quota/rate limit errors
//    Contains list of quota violations

// 5. PreconditionFailure - for precondition errors
//    Contains list of violations with type, subject, and description

// 6. RequestInfo - identifies the request
//    Contains request_id and serving_data

// 7. ResourceInfo - identifies the resource
//    Contains resource_type, resource_name, owner, and description

// 8. Help - provides help links
//    Contains list of links with description and url

// 9. LocalizedMessage - for i18n error messages
//    Contains locale and message
```

### Field Validation Errors with BadRequest

This pattern demonstrates how to return detailed field-level validation errors to clients:

```go
package service

import (
    "context"
    "regexp"
    "unicode/utf8"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// CreateUserWithValidation demonstrates rich validation error details
func (s *UserService) CreateUserWithValidation(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
    // Collect all validation errors
    var violations []*errdetails.BadRequest_FieldViolation

    // Validate email
    if req.GetEmail() == "" {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "email",
            Description: "email is required",
        })
    } else if !isValidEmailFormat(req.GetEmail()) {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "email",
            Description: "email must be a valid email address",
        })
    }

    // Validate name
    if req.GetName() == "" {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "name",
            Description: "name is required",
        })
    } else if utf8.RuneCountInString(req.GetName()) < 2 {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "name",
            Description: "name must be at least 2 characters long",
        })
    } else if utf8.RuneCountInString(req.GetName()) > 100 {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "name",
            Description: "name must not exceed 100 characters",
        })
    }

    // Validate age if provided
    if req.GetAge() < 0 || req.GetAge() > 150 {
        violations = append(violations, &errdetails.BadRequest_FieldViolation{
            Field:       "age",
            Description: "age must be between 0 and 150",
        })
    }

    // If there are validation errors, return them all at once
    if len(violations) > 0 {
        st := status.New(codes.InvalidArgument, "validation failed")

        // Attach the bad request details
        badRequest := &errdetails.BadRequest{
            FieldViolations: violations,
        }

        stWithDetails, err := st.WithDetails(badRequest)
        if err != nil {
            // If we cannot attach details, return the basic error
            return nil, st.Err()
        }

        return nil, stWithDetails.Err()
    }

    // Proceed with user creation...
    return &pb.User{
        Id:    generateID(),
        Email: req.GetEmail(),
        Name:  req.GetName(),
    }, nil
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func isValidEmailFormat(email string) bool {
    return emailRegex.MatchString(email)
}
```

### Rate Limiting with RetryInfo and QuotaFailure

When implementing rate limiting, provide clients with retry information so they can back off appropriately:

```go
package service

import (
    "context"
    "sync"
    "time"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/protobuf/types/known/durationpb"

    pb "myapp/proto/api"
)

// RateLimiter tracks request counts per client
type RateLimiter struct {
    mu       sync.Mutex
    requests map[string]int
    limit    int
    window   time.Duration
}

// APIService demonstrates rate limiting with proper error details
type APIService struct {
    pb.UnimplementedAPIServiceServer
    limiter *RateLimiter
}

// ProcessRequest demonstrates rate limiting error handling
func (s *APIService) ProcessRequest(ctx context.Context, req *pb.Request) (*pb.Response, error) {
    clientID := getClientID(ctx)

    // Check rate limit
    allowed, retryAfter := s.limiter.Allow(clientID)
    if !allowed {
        st := status.New(codes.ResourceExhausted, "rate limit exceeded")

        // Add retry information
        retryInfo := &errdetails.RetryInfo{
            RetryDelay: durationpb.New(retryAfter),
        }

        // Add quota failure details
        quotaFailure := &errdetails.QuotaFailure{
            Violations: []*errdetails.QuotaFailure_Violation{
                {
                    Subject:     clientID,
                    Description: "requests per minute quota exceeded",
                },
            },
        }

        stWithDetails, err := st.WithDetails(retryInfo, quotaFailure)
        if err != nil {
            return nil, st.Err()
        }

        return nil, stWithDetails.Err()
    }

    // Process the request...
    return &pb.Response{Message: "processed"}, nil
}

// Allow checks if a request is allowed and returns retry duration if not
func (r *RateLimiter) Allow(clientID string) (bool, time.Duration) {
    r.mu.Lock()
    defer r.mu.Unlock()

    count := r.requests[clientID]
    if count >= r.limit {
        return false, r.window
    }

    r.requests[clientID] = count + 1
    return true, 0
}

func getClientID(ctx context.Context) string {
    // Extract client ID from context (e.g., from metadata)
    return "client-123"
}
```

### Resource Information with ResourceInfo

When an operation fails due to a specific resource, provide detailed resource information:

```go
package service

import (
    "context"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/order"
)

// OrderService demonstrates resource-specific error details
type OrderService struct {
    pb.UnimplementedOrderServiceServer
}

// GetOrder demonstrates ResourceInfo error details
func (s *OrderService) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.Order, error) {
    order, err := s.fetchOrder(req.GetOrderId())
    if err != nil {
        st := status.New(codes.NotFound, "order not found")

        // Add resource information
        resourceInfo := &errdetails.ResourceInfo{
            ResourceType: "Order",
            ResourceName: req.GetOrderId(),
            Owner:        "orders-service",
            Description:  "The requested order does not exist or has been deleted",
        }

        stWithDetails, err := st.WithDetails(resourceInfo)
        if err != nil {
            return nil, st.Err()
        }

        return nil, stWithDetails.Err()
    }

    return order, nil
}

// DeleteOrder demonstrates precondition failure with resource info
func (s *OrderService) DeleteOrder(ctx context.Context, req *pb.DeleteOrderRequest) (*pb.Empty, error) {
    order, err := s.fetchOrder(req.GetOrderId())
    if err != nil {
        return nil, status.Errorf(codes.NotFound, "order %q not found", req.GetOrderId())
    }

    // Check if order can be deleted
    if order.Status == pb.OrderStatus_SHIPPED {
        st := status.New(codes.FailedPrecondition, "cannot delete shipped order")

        preconditionFailure := &errdetails.PreconditionFailure{
            Violations: []*errdetails.PreconditionFailure_Violation{
                {
                    Type:        "ORDER_STATUS",
                    Subject:     req.GetOrderId(),
                    Description: "order must be in PENDING or CANCELLED status to be deleted",
                },
            },
        }

        resourceInfo := &errdetails.ResourceInfo{
            ResourceType: "Order",
            ResourceName: req.GetOrderId(),
            Description:  "Order is currently in SHIPPED status",
        }

        stWithDetails, err := st.WithDetails(preconditionFailure, resourceInfo)
        if err != nil {
            return nil, st.Err()
        }

        return nil, stWithDetails.Err()
    }

    // Delete order...
    return &pb.Empty{}, nil
}

func (s *OrderService) fetchOrder(id string) (*pb.Order, error) {
    // Implementation
    return nil, nil
}
```

## Custom Error Types

For complex applications, you may want to define custom error types that integrate with gRPC's error model.

### Domain-Specific Error Types

Create structured error types that map cleanly to gRPC status codes:

```go
package errors

import (
    "fmt"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// DomainError represents a domain-specific error
type DomainError struct {
    Code        codes.Code
    Message     string
    Details     []interface{}
    Cause       error
}

// Error implements the error interface
func (e *DomainError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Cause)
    }
    return e.Message
}

// Unwrap returns the underlying cause
func (e *DomainError) Unwrap() error {
    return e.Cause
}

// ToGRPCError converts the domain error to a gRPC status error
func (e *DomainError) ToGRPCError() error {
    st := status.New(e.Code, e.Message)

    if len(e.Details) > 0 {
        // Convert details to proto messages
        protoDetails := make([]interface{}, 0, len(e.Details))
        for _, d := range e.Details {
            if pd, ok := d.(interface{ ProtoReflect() }); ok {
                protoDetails = append(protoDetails, pd)
            }
        }

        if len(protoDetails) > 0 {
            stWithDetails, err := st.WithDetails(protoDetails...)
            if err == nil {
                return stWithDetails.Err()
            }
        }
    }

    return st.Err()
}

// Common error constructors

// NewNotFoundError creates a not found error with resource details
func NewNotFoundError(resourceType, resourceName string) *DomainError {
    return &DomainError{
        Code:    codes.NotFound,
        Message: fmt.Sprintf("%s %q not found", resourceType, resourceName),
        Details: []interface{}{
            &errdetails.ResourceInfo{
                ResourceType: resourceType,
                ResourceName: resourceName,
            },
        },
    }
}

// NewValidationError creates a validation error with field violations
func NewValidationError(violations map[string]string) *DomainError {
    fieldViolations := make([]*errdetails.BadRequest_FieldViolation, 0, len(violations))
    for field, desc := range violations {
        fieldViolations = append(fieldViolations, &errdetails.BadRequest_FieldViolation{
            Field:       field,
            Description: desc,
        })
    }

    return &DomainError{
        Code:    codes.InvalidArgument,
        Message: "validation failed",
        Details: []interface{}{
            &errdetails.BadRequest{
                FieldViolations: fieldViolations,
            },
        },
    }
}

// NewPermissionDeniedError creates a permission denied error
func NewPermissionDeniedError(resource, action string) *DomainError {
    return &DomainError{
        Code:    codes.PermissionDenied,
        Message: fmt.Sprintf("permission denied to %s %s", action, resource),
    }
}

// NewRateLimitError creates a rate limit error with retry info
func NewRateLimitError(retryAfter time.Duration) *DomainError {
    return &DomainError{
        Code:    codes.ResourceExhausted,
        Message: "rate limit exceeded",
        Details: []interface{}{
            &errdetails.RetryInfo{
                RetryDelay: durationpb.New(retryAfter),
            },
        },
    }
}

// Missing import for time
import "time"
import "google.golang.org/protobuf/types/known/durationpb"
```

### Error Registry Pattern

For larger applications, use an error registry to maintain consistency:

```go
package errors

import (
    "sync"

    "google.golang.org/grpc/codes"
)

// ErrorCode represents a domain-specific error code
type ErrorCode string

// Define all error codes as constants
const (
    ErrUserNotFound      ErrorCode = "USER_NOT_FOUND"
    ErrUserAlreadyExists ErrorCode = "USER_ALREADY_EXISTS"
    ErrInvalidEmail      ErrorCode = "INVALID_EMAIL"
    ErrInvalidPassword   ErrorCode = "INVALID_PASSWORD"
    ErrUnauthorized      ErrorCode = "UNAUTHORIZED"
    ErrRateLimited       ErrorCode = "RATE_LIMITED"
    ErrInternal          ErrorCode = "INTERNAL_ERROR"
)

// ErrorDefinition defines an error's properties
type ErrorDefinition struct {
    Code        ErrorCode
    GRPCCode    codes.Code
    Message     string
    Retryable   bool
}

// ErrorRegistry maintains error definitions
type ErrorRegistry struct {
    mu          sync.RWMutex
    definitions map[ErrorCode]*ErrorDefinition
}

// Global registry
var registry = &ErrorRegistry{
    definitions: make(map[ErrorCode]*ErrorDefinition),
}

// Register adds an error definition to the registry
func Register(def *ErrorDefinition) {
    registry.mu.Lock()
    defer registry.mu.Unlock()
    registry.definitions[def.Code] = def
}

// Get retrieves an error definition
func Get(code ErrorCode) *ErrorDefinition {
    registry.mu.RLock()
    defer registry.mu.RUnlock()
    return registry.definitions[code]
}

// Initialize the registry with all error definitions
func init() {
    Register(&ErrorDefinition{
        Code:      ErrUserNotFound,
        GRPCCode:  codes.NotFound,
        Message:   "user not found",
        Retryable: false,
    })

    Register(&ErrorDefinition{
        Code:      ErrUserAlreadyExists,
        GRPCCode:  codes.AlreadyExists,
        Message:   "user already exists",
        Retryable: false,
    })

    Register(&ErrorDefinition{
        Code:      ErrInvalidEmail,
        GRPCCode:  codes.InvalidArgument,
        Message:   "invalid email format",
        Retryable: false,
    })

    Register(&ErrorDefinition{
        Code:      ErrRateLimited,
        GRPCCode:  codes.ResourceExhausted,
        Message:   "rate limit exceeded",
        Retryable: true,
    })

    Register(&ErrorDefinition{
        Code:      ErrInternal,
        GRPCCode:  codes.Internal,
        Message:   "internal server error",
        Retryable: true,
    })
}
```

## Client-Side Error Extraction and Handling

Understanding how to properly handle errors on the client side is just as important as creating them on the server.

### Basic Error Handling

Extract status codes and messages from gRPC errors:

```go
package client

import (
    "context"
    "log"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// UserClient wraps the gRPC client with error handling
type UserClient struct {
    client pb.UserServiceClient
}

// GetUser demonstrates basic client-side error handling
func (c *UserClient) GetUser(ctx context.Context, userID string) (*pb.User, error) {
    resp, err := c.client.GetUser(ctx, &pb.GetUserRequest{UserId: userID})
    if err != nil {
        // Extract the gRPC status from the error
        st, ok := status.FromError(err)
        if !ok {
            // Not a gRPC error, handle as generic error
            return nil, fmt.Errorf("unknown error: %w", err)
        }

        // Handle based on status code
        switch st.Code() {
        case codes.NotFound:
            log.Printf("User %s not found", userID)
            return nil, ErrUserNotFound

        case codes.InvalidArgument:
            log.Printf("Invalid argument: %s", st.Message())
            return nil, ErrInvalidInput

        case codes.PermissionDenied:
            log.Printf("Permission denied for user %s", userID)
            return nil, ErrPermissionDenied

        case codes.Unavailable:
            log.Printf("Service unavailable, should retry")
            return nil, ErrServiceUnavailable

        default:
            log.Printf("gRPC error: code=%s message=%s", st.Code(), st.Message())
            return nil, fmt.Errorf("service error: %s", st.Message())
        }
    }

    return resp, nil
}

// Client-side error definitions
var (
    ErrUserNotFound       = fmt.Errorf("user not found")
    ErrInvalidInput       = fmt.Errorf("invalid input")
    ErrPermissionDenied   = fmt.Errorf("permission denied")
    ErrServiceUnavailable = fmt.Errorf("service unavailable")
)

import "fmt"
```

### Extracting Error Details

Extract rich error details from gRPC errors:

```go
package client

import (
    "context"
    "fmt"
    "time"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "myapp/proto/user"
)

// ValidationError represents client-side validation errors
type ValidationError struct {
    Violations []FieldViolation
}

// FieldViolation represents a single field error
type FieldViolation struct {
    Field       string
    Description string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed: %d violations", len(e.Violations))
}

// RateLimitError represents a rate limit error with retry info
type RateLimitError struct {
    RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
    return fmt.Sprintf("rate limited, retry after %v", e.RetryAfter)
}

// CreateUser demonstrates extracting error details
func (c *UserClient) CreateUser(ctx context.Context, email, name string) (*pb.User, error) {
    resp, err := c.client.CreateUser(ctx, &pb.CreateUserRequest{
        Email: email,
        Name:  name,
    })
    if err != nil {
        return nil, c.handleError(err)
    }

    return resp, nil
}

// handleError extracts and processes error details
func (c *UserClient) handleError(err error) error {
    st, ok := status.FromError(err)
    if !ok {
        return err
    }

    // Extract details from the status
    for _, detail := range st.Details() {
        switch d := detail.(type) {
        case *errdetails.BadRequest:
            // Convert to client-side validation error
            violations := make([]FieldViolation, len(d.FieldViolations))
            for i, v := range d.FieldViolations {
                violations[i] = FieldViolation{
                    Field:       v.Field,
                    Description: v.Description,
                }
            }
            return &ValidationError{Violations: violations}

        case *errdetails.RetryInfo:
            // Extract retry information
            return &RateLimitError{
                RetryAfter: d.RetryDelay.AsDuration(),
            }

        case *errdetails.ResourceInfo:
            // Log resource information
            log.Printf("Resource error: type=%s name=%s",
                d.ResourceType, d.ResourceName)

        case *errdetails.QuotaFailure:
            // Handle quota violations
            for _, v := range d.Violations {
                log.Printf("Quota violation: subject=%s desc=%s",
                    v.Subject, v.Description)
            }
            return fmt.Errorf("quota exceeded")

        case *errdetails.PreconditionFailure:
            // Handle precondition failures
            for _, v := range d.Violations {
                log.Printf("Precondition failure: type=%s subject=%s desc=%s",
                    v.Type, v.Subject, v.Description)
            }
            return fmt.Errorf("precondition failed: %s", st.Message())
        }
    }

    // Return a generic error if no specific details
    return fmt.Errorf("gRPC error [%s]: %s", st.Code(), st.Message())
}

import "log"
```

### Retry Logic Based on Error Details

Implement smart retry logic using error details:

```go
package client

import (
    "context"
    "time"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// RetryConfig configures retry behavior
type RetryConfig struct {
    MaxRetries     int
    InitialBackoff time.Duration
    MaxBackoff     time.Duration
    BackoffFactor  float64
}

// DefaultRetryConfig provides sensible defaults
var DefaultRetryConfig = RetryConfig{
    MaxRetries:     3,
    InitialBackoff: 100 * time.Millisecond,
    MaxBackoff:     10 * time.Second,
    BackoffFactor:  2.0,
}

// isRetryable determines if an error is retryable
func isRetryable(err error) (bool, time.Duration) {
    st, ok := status.FromError(err)
    if !ok {
        return false, 0
    }

    // Check for explicit retry info in details
    for _, detail := range st.Details() {
        if retryInfo, ok := detail.(*errdetails.RetryInfo); ok {
            return true, retryInfo.RetryDelay.AsDuration()
        }
    }

    // Check status codes that are typically retryable
    switch st.Code() {
    case codes.Unavailable:
        // Service unavailable is retryable
        return true, 0
    case codes.ResourceExhausted:
        // Rate limiting is retryable
        return true, 0
    case codes.Aborted:
        // Aborted operations may be retryable
        return true, 0
    case codes.DeadlineExceeded:
        // Deadline exceeded may be retryable with longer timeout
        return true, 0
    default:
        return false, 0
    }
}

// RetryableCall executes a gRPC call with retry logic
func RetryableCall[T any](
    ctx context.Context,
    config RetryConfig,
    call func(context.Context) (T, error),
) (T, error) {
    var lastErr error
    backoff := config.InitialBackoff

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        result, err := call(ctx)
        if err == nil {
            return result, nil
        }

        lastErr = err

        // Check if error is retryable
        retryable, retryAfter := isRetryable(err)
        if !retryable {
            var zero T
            return zero, err
        }

        // Use server-suggested retry delay if provided
        if retryAfter > 0 {
            backoff = retryAfter
        }

        // Don't sleep on the last attempt
        if attempt < config.MaxRetries {
            select {
            case <-ctx.Done():
                var zero T
                return zero, ctx.Err()
            case <-time.After(backoff):
            }

            // Increase backoff for next attempt
            backoff = time.Duration(float64(backoff) * config.BackoffFactor)
            if backoff > config.MaxBackoff {
                backoff = config.MaxBackoff
            }
        }
    }

    var zero T
    return zero, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// Example usage
func (c *UserClient) GetUserWithRetry(ctx context.Context, userID string) (*pb.User, error) {
    return RetryableCall(ctx, DefaultRetryConfig, func(ctx context.Context) (*pb.User, error) {
        return c.client.GetUser(ctx, &pb.GetUserRequest{UserId: userID})
    })
}

import "fmt"
import pb "myapp/proto/user"
```

## Error Mapping to HTTP (grpc-gateway)

When using grpc-gateway to expose your gRPC services over HTTP, you need to properly map gRPC errors to HTTP status codes.

### Default Error Mapping

grpc-gateway provides automatic mapping between gRPC and HTTP status codes:

```go
package gateway

// DefaultGRPCToHTTPMapping shows the automatic mappings
// gRPC Code          -> HTTP Status
// OK                 -> 200 OK
// CANCELLED          -> 499 Client Closed Request (non-standard)
// UNKNOWN            -> 500 Internal Server Error
// INVALID_ARGUMENT   -> 400 Bad Request
// DEADLINE_EXCEEDED  -> 504 Gateway Timeout
// NOT_FOUND          -> 404 Not Found
// ALREADY_EXISTS     -> 409 Conflict
// PERMISSION_DENIED  -> 403 Forbidden
// RESOURCE_EXHAUSTED -> 429 Too Many Requests
// FAILED_PRECONDITION-> 400 Bad Request
// ABORTED            -> 409 Conflict
// OUT_OF_RANGE       -> 400 Bad Request
// UNIMPLEMENTED      -> 501 Not Implemented
// INTERNAL           -> 500 Internal Server Error
// UNAVAILABLE        -> 503 Service Unavailable
// DATA_LOSS          -> 500 Internal Server Error
// UNAUTHENTICATED    -> 401 Unauthorized
```

### Custom Error Handler

Implement a custom error handler for grpc-gateway to include error details in HTTP responses:

```go
package gateway

import (
    "context"
    "encoding/json"
    "net/http"

    "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// HTTPError represents the error response structure
type HTTPError struct {
    Code    int                    `json:"code"`
    Message string                 `json:"message"`
    Details map[string]interface{} `json:"details,omitempty"`
}

// CustomErrorHandler handles gRPC errors and returns structured HTTP responses
func CustomErrorHandler(
    ctx context.Context,
    mux *runtime.ServeMux,
    marshaler runtime.Marshaler,
    w http.ResponseWriter,
    r *http.Request,
    err error,
) {
    st, ok := status.FromError(err)
    if !ok {
        // Not a gRPC error
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }

    httpError := HTTPError{
        Code:    grpcToHTTPStatus(st.Code()),
        Message: st.Message(),
        Details: make(map[string]interface{}),
    }

    // Extract error details
    for _, detail := range st.Details() {
        switch d := detail.(type) {
        case *errdetails.BadRequest:
            violations := make([]map[string]string, len(d.FieldViolations))
            for i, v := range d.FieldViolations {
                violations[i] = map[string]string{
                    "field":       v.Field,
                    "description": v.Description,
                }
            }
            httpError.Details["validation_errors"] = violations

        case *errdetails.RetryInfo:
            httpError.Details["retry_after_seconds"] = d.RetryDelay.AsDuration().Seconds()
            // Also set the Retry-After header
            w.Header().Set("Retry-After",
                fmt.Sprintf("%.0f", d.RetryDelay.AsDuration().Seconds()))

        case *errdetails.ResourceInfo:
            httpError.Details["resource"] = map[string]string{
                "type": d.ResourceType,
                "name": d.ResourceName,
            }

        case *errdetails.QuotaFailure:
            violations := make([]map[string]string, len(d.Violations))
            for i, v := range d.Violations {
                violations[i] = map[string]string{
                    "subject":     v.Subject,
                    "description": v.Description,
                }
            }
            httpError.Details["quota_violations"] = violations
        }
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(httpError.Code)
    json.NewEncoder(w).Encode(httpError)
}

// grpcToHTTPStatus maps gRPC codes to HTTP status codes
func grpcToHTTPStatus(code codes.Code) int {
    switch code {
    case codes.OK:
        return http.StatusOK
    case codes.Canceled:
        return 499 // Client Closed Request
    case codes.Unknown:
        return http.StatusInternalServerError
    case codes.InvalidArgument:
        return http.StatusBadRequest
    case codes.DeadlineExceeded:
        return http.StatusGatewayTimeout
    case codes.NotFound:
        return http.StatusNotFound
    case codes.AlreadyExists:
        return http.StatusConflict
    case codes.PermissionDenied:
        return http.StatusForbidden
    case codes.ResourceExhausted:
        return http.StatusTooManyRequests
    case codes.FailedPrecondition:
        return http.StatusPreconditionFailed
    case codes.Aborted:
        return http.StatusConflict
    case codes.OutOfRange:
        return http.StatusBadRequest
    case codes.Unimplemented:
        return http.StatusNotImplemented
    case codes.Internal:
        return http.StatusInternalServerError
    case codes.Unavailable:
        return http.StatusServiceUnavailable
    case codes.DataLoss:
        return http.StatusInternalServerError
    case codes.Unauthenticated:
        return http.StatusUnauthorized
    default:
        return http.StatusInternalServerError
    }
}

import "fmt"
```

### Setting Up grpc-gateway with Custom Error Handler

Configure grpc-gateway to use the custom error handler:

```go
package main

import (
    "context"
    "log"
    "net"
    "net/http"

    "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    gw "myapp/gateway"
    pb "myapp/proto/user"
)

func main() {
    ctx := context.Background()

    // Start gRPC server
    go startGRPCServer()

    // Create gateway mux with custom error handler
    mux := runtime.NewServeMux(
        runtime.WithErrorHandler(gw.CustomErrorHandler),
    )

    // Register gateway handlers
    opts := []grpc.DialOption{
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    }

    err := pb.RegisterUserServiceHandlerFromEndpoint(
        ctx, mux, "localhost:50051", opts,
    )
    if err != nil {
        log.Fatalf("Failed to register gateway: %v", err)
    }

    // Start HTTP server
    log.Println("Starting HTTP gateway on :8080")
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatalf("Failed to start HTTP server: %v", err)
    }
}

func startGRPCServer() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    server := grpc.NewServer()
    // Register services...

    log.Println("Starting gRPC server on :50051")
    if err := server.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

## Best Practices and Patterns

### Error Interceptor for Logging

Create an interceptor to log all errors consistently:

```go
package interceptors

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// ErrorLoggingInterceptor logs all gRPC errors with context
func ErrorLoggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    duration := time.Since(start)

    if err != nil {
        st, _ := status.FromError(err)
        log.Printf(
            "gRPC Error | method=%s | code=%s | duration=%v | message=%s",
            info.FullMethod,
            st.Code(),
            duration,
            st.Message(),
        )

        // Log details for debugging (be careful with sensitive data)
        for _, detail := range st.Details() {
            log.Printf("  Detail: %T = %+v", detail, detail)
        }
    }

    return resp, err
}

// PanicRecoveryInterceptor recovers from panics and returns internal errors
func PanicRecoveryInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (resp interface{}, err error) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Panic recovered in %s: %v", info.FullMethod, r)
            err = status.Errorf(codes.Internal, "internal server error")
        }
    }()

    return handler(ctx, req)
}
```

### Error Sanitization

Prevent leaking sensitive information in error messages:

```go
package errors

import (
    "strings"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// sensitivePatterns contains patterns that should be redacted
var sensitivePatterns = []string{
    "password",
    "token",
    "secret",
    "key",
    "credential",
}

// SanitizeError removes sensitive information from error messages
func SanitizeError(err error) error {
    st, ok := status.FromError(err)
    if !ok {
        return err
    }

    message := st.Message()

    // Check for sensitive patterns
    lowerMsg := strings.ToLower(message)
    for _, pattern := range sensitivePatterns {
        if strings.Contains(lowerMsg, pattern) {
            // Return a generic message for security
            return status.Error(st.Code(), "request failed due to invalid credentials")
        }
    }

    // For internal errors, don't expose details
    if st.Code() == codes.Internal {
        return status.Error(codes.Internal, "internal server error")
    }

    return err
}

// SanitizingInterceptor wraps errors to remove sensitive information
func SanitizingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    resp, err := handler(ctx, req)
    if err != nil {
        return nil, SanitizeError(err)
    }
    return resp, nil
}

import (
    "context"
    "google.golang.org/grpc"
)
```

## Testing Error Handling

Proper testing of error handling is essential for reliable services.

### Unit Testing Error Responses

Test that your service returns correct errors:

```go
package service_test

import (
    "context"
    "testing"

    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    "myapp/service"
    pb "myapp/proto/user"
)

func TestGetUser_NotFound(t *testing.T) {
    svc := service.NewUserService()

    _, err := svc.GetUser(context.Background(), &pb.GetUserRequest{
        UserId: "non-existent-user",
    })

    // Verify error is returned
    if err == nil {
        t.Fatal("expected error, got nil")
    }

    // Verify correct status code
    st, ok := status.FromError(err)
    if !ok {
        t.Fatal("expected gRPC status error")
    }

    if st.Code() != codes.NotFound {
        t.Errorf("expected NotFound, got %s", st.Code())
    }
}

func TestCreateUser_ValidationError(t *testing.T) {
    svc := service.NewUserService()

    _, err := svc.CreateUser(context.Background(), &pb.CreateUserRequest{
        Email: "invalid-email",
        Name:  "",
    })

    if err == nil {
        t.Fatal("expected error, got nil")
    }

    st, ok := status.FromError(err)
    if !ok {
        t.Fatal("expected gRPC status error")
    }

    if st.Code() != codes.InvalidArgument {
        t.Errorf("expected InvalidArgument, got %s", st.Code())
    }

    // Verify error details
    var foundBadRequest bool
    for _, detail := range st.Details() {
        if br, ok := detail.(*errdetails.BadRequest); ok {
            foundBadRequest = true

            // Check for expected field violations
            fields := make(map[string]bool)
            for _, v := range br.FieldViolations {
                fields[v.Field] = true
            }

            if !fields["email"] {
                t.Error("expected email field violation")
            }
            if !fields["name"] {
                t.Error("expected name field violation")
            }
        }
    }

    if !foundBadRequest {
        t.Error("expected BadRequest details")
    }
}
```

### Integration Testing with Error Scenarios

Test error handling in a full gRPC client-server setup:

```go
package integration_test

import (
    "context"
    "net"
    "testing"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/status"
    "google.golang.org/grpc/test/bufconn"

    "myapp/service"
    pb "myapp/proto/user"
)

const bufSize = 1024 * 1024

var lis *bufconn.Listener

func init() {
    lis = bufconn.Listen(bufSize)
    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, service.NewUserService())
    go func() {
        if err := s.Serve(lis); err != nil {
            panic(err)
        }
    }()
}

func bufDialer(context.Context, string) (net.Conn, error) {
    return lis.Dial()
}

func TestIntegration_ErrorHandling(t *testing.T) {
    ctx := context.Background()
    conn, err := grpc.NewClient("passthrough://bufnet",
        grpc.WithContextDialer(bufDialer),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        t.Fatalf("Failed to dial: %v", err)
    }
    defer conn.Close()

    client := pb.NewUserServiceClient(conn)

    tests := []struct {
        name         string
        request      *pb.GetUserRequest
        expectedCode codes.Code
    }{
        {
            name:         "empty user id",
            request:      &pb.GetUserRequest{UserId: ""},
            expectedCode: codes.InvalidArgument,
        },
        {
            name:         "non-existent user",
            request:      &pb.GetUserRequest{UserId: "unknown"},
            expectedCode: codes.NotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := client.GetUser(ctx, tt.request)
            if err == nil {
                t.Fatal("expected error")
            }

            st, ok := status.FromError(err)
            if !ok {
                t.Fatal("expected gRPC status")
            }

            if st.Code() != tt.expectedCode {
                t.Errorf("expected %s, got %s", tt.expectedCode, st.Code())
            }
        })
    }
}
```

## Conclusion

Proper error handling in gRPC is essential for building robust and maintainable microservices. Here are the key takeaways:

1. **Use appropriate status codes**: Choose the right gRPC status code that accurately represents the error condition. This enables clients to handle errors appropriately.

2. **Add rich error details**: Use the `errdetails` package to provide structured, actionable error information like field violations, retry timing, and resource identification.

3. **Create domain-specific error types**: Build custom error types that encapsulate your business logic while still mapping cleanly to gRPC status codes.

4. **Handle errors properly on the client**: Extract status codes and error details to provide meaningful feedback to users and implement smart retry logic.

5. **Map errors correctly for HTTP**: When using grpc-gateway, implement custom error handlers to translate gRPC errors to appropriate HTTP responses.

6. **Test error handling thoroughly**: Write unit and integration tests that verify your services return correct error codes and details.

7. **Sanitize errors in production**: Never expose sensitive information or internal implementation details in error messages sent to clients.

By following these patterns and best practices, you can build gRPC services that communicate errors clearly, enable clients to recover gracefully, and make debugging production issues much easier.

## Further Reading

- [gRPC Error Handling Documentation](https://grpc.io/docs/guides/error/)
- [Google Cloud API Error Model](https://cloud.google.com/apis/design/errors)
- [grpc-gateway Documentation](https://grpc-ecosystem.github.io/grpc-gateway/)
- [Go gRPC Package Documentation](https://pkg.go.dev/google.golang.org/grpc)
