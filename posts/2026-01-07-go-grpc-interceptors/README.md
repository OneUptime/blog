# How to Implement gRPC Interceptors in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, gRPC, Interceptors, Middleware, Authentication, Tracing

Description: Implement gRPC interceptors in Go for cross-cutting concerns like logging, authentication, rate limiting, and distributed tracing.

---

gRPC interceptors are the equivalent of middleware in HTTP frameworks. They allow you to execute code before and after RPC calls, making them ideal for cross-cutting concerns like logging, authentication, rate limiting, and distributed tracing. In this guide, we will explore how to implement both unary and stream interceptors in Go.

## Understanding gRPC Interceptors

gRPC provides two types of interceptors based on the RPC call pattern:

1. **Unary Interceptors**: Handle single request-response calls
2. **Stream Interceptors**: Handle streaming calls (client, server, or bidirectional)

Each type can be implemented on both the client and server side, giving you four interceptor signatures in total.

## Prerequisites

Before we begin, ensure you have the following dependencies installed:

```bash
go get google.golang.org/grpc
go get google.golang.org/grpc/metadata
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
go get golang.org/x/time/rate
```

## Project Setup

Let us start by defining a simple protobuf service that we will use throughout this tutorial:

```protobuf
// api/service.proto
syntax = "proto3";

package api;

option go_package = "github.com/example/grpc-interceptors/api";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
  rpc CreateUsers(stream CreateUserRequest) returns (CreateUsersResponse);
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message ListUsersRequest {
  int32 page_size = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message CreateUsersResponse {
  int32 created_count = 1;
}
```

## Unary Interceptors

Unary interceptors wrap single request-response RPC calls. They receive the request, can modify it or perform actions, then pass it to the handler.

### Server-Side Unary Interceptor Signature

The server-side unary interceptor follows this signature:

```go
// UnaryServerInterceptor is the signature for server-side unary interceptors.
// ctx: The request context
// req: The incoming request
// info: Contains metadata about the RPC being called
// handler: The actual RPC handler to invoke
type UnaryServerInterceptor func(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error)
```

### Client-Side Unary Interceptor Signature

The client-side unary interceptor follows this signature:

```go
// UnaryClientInterceptor is the signature for client-side unary interceptors.
// ctx: The request context
// method: The full RPC method string
// req: The outgoing request
// reply: Where the response will be stored
// cc: The client connection
// invoker: The actual RPC invoker to call
// opts: Call options
type UnaryClientInterceptor func(
    ctx context.Context,
    method string,
    req, reply interface{},
    cc *grpc.ClientConn,
    invoker grpc.UnaryInvoker,
    opts ...grpc.CallOption,
) error
```

## Stream Interceptors

Stream interceptors handle all types of streaming RPCs. They wrap the stream and can intercept individual messages.

### Server-Side Stream Interceptor Signature

The server-side stream interceptor follows this signature:

```go
// StreamServerInterceptor is the signature for server-side stream interceptors.
// srv: The service implementation
// ss: The server stream
// info: Contains metadata about the streaming RPC
// handler: The actual stream handler to invoke
type StreamServerInterceptor func(
    srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) error
```

### Client-Side Stream Interceptor Signature

The client-side stream interceptor follows this signature:

```go
// StreamClientInterceptor is the signature for client-side stream interceptors.
// ctx: The request context
// desc: The stream descriptor
// cc: The client connection
// method: The full RPC method string
// streamer: The actual streamer to call
// opts: Call options
type StreamClientInterceptor func(
    ctx context.Context,
    desc *grpc.StreamDesc,
    cc *grpc.ClientConn,
    method string,
    streamer grpc.Streamer,
    opts ...grpc.CallOption,
) (grpc.ClientStream, error)
```

## Implementing a Logging Interceptor

Logging is one of the most common use cases for interceptors. Let us implement both unary and stream logging interceptors.

### Unary Logging Interceptor

This interceptor logs the method name, duration, and any errors for each RPC call:

```go
package interceptors

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/status"
)

// UnaryLoggingInterceptor logs details about each unary RPC call.
// It captures the start time, invokes the handler, then logs the
// method, duration, and status code upon completion.
func UnaryLoggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    // Record the start time for duration calculation
    start := time.Now()

    // Extract request ID from context if available for correlation
    requestID := extractRequestID(ctx)

    // Log the incoming request
    log.Printf("[%s] Received unary RPC: %s", requestID, info.FullMethod)

    // Call the actual handler
    resp, err := handler(ctx, req)

    // Calculate the duration
    duration := time.Since(start)

    // Extract the gRPC status code from the error
    statusCode := status.Code(err)

    // Log the completion with relevant details
    log.Printf(
        "[%s] Completed %s | Duration: %v | Status: %s | Error: %v",
        requestID,
        info.FullMethod,
        duration,
        statusCode.String(),
        err,
    )

    return resp, err
}

// extractRequestID retrieves the request ID from context metadata.
// Returns "unknown" if no request ID is found.
func extractRequestID(ctx context.Context) string {
    // Implementation would extract from metadata
    // For brevity, returning a placeholder
    return "req-12345"
}
```

### Stream Logging Interceptor

For streaming RPCs, we need to wrap the stream to log individual messages:

```go
package interceptors

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/status"
)

// loggingServerStream wraps grpc.ServerStream to intercept
// SendMsg and RecvMsg calls for logging purposes.
type loggingServerStream struct {
    grpc.ServerStream
    method    string
    requestID string
}

// RecvMsg intercepts incoming messages and logs them.
func (s *loggingServerStream) RecvMsg(m interface{}) error {
    err := s.ServerStream.RecvMsg(m)
    if err != nil {
        log.Printf("[%s] Stream %s RecvMsg error: %v", s.requestID, s.method, err)
    } else {
        log.Printf("[%s] Stream %s received message", s.requestID, s.method)
    }
    return err
}

// SendMsg intercepts outgoing messages and logs them.
func (s *loggingServerStream) SendMsg(m interface{}) error {
    err := s.ServerStream.SendMsg(m)
    if err != nil {
        log.Printf("[%s] Stream %s SendMsg error: %v", s.requestID, s.method, err)
    } else {
        log.Printf("[%s] Stream %s sent message", s.requestID, s.method)
    }
    return err
}

// StreamLoggingInterceptor logs details about streaming RPC calls.
// It wraps the stream to log individual message sends and receives.
func StreamLoggingInterceptor(
    srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) error {
    start := time.Now()
    requestID := extractRequestID(ss.Context())

    log.Printf(
        "[%s] Started stream RPC: %s | ClientStream: %v | ServerStream: %v",
        requestID,
        info.FullMethod,
        info.IsClientStream,
        info.IsServerStream,
    )

    // Wrap the stream with our logging wrapper
    wrappedStream := &loggingServerStream{
        ServerStream: ss,
        method:       info.FullMethod,
        requestID:    requestID,
    }

    // Call the actual handler with the wrapped stream
    err := handler(srv, wrappedStream)

    duration := time.Since(start)
    statusCode := status.Code(err)

    log.Printf(
        "[%s] Completed stream %s | Duration: %v | Status: %s",
        requestID,
        info.FullMethod,
        duration,
        statusCode.String(),
    )

    return err
}
```

## Implementing an Authentication Interceptor

Authentication interceptors validate credentials before allowing RPC calls to proceed. We will implement a JWT-based authentication interceptor.

### Authentication Interceptor with JWT Validation

This interceptor extracts and validates JWT tokens from request metadata:

```go
package interceptors

import (
    "context"
    "strings"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

// AuthConfig holds configuration for the authentication interceptor.
type AuthConfig struct {
    // JWTSecret is the secret key used to validate JWT tokens
    JWTSecret string
    // PublicMethods is a list of methods that do not require authentication
    PublicMethods []string
}

// UserClaims represents the claims extracted from a valid JWT token.
type UserClaims struct {
    UserID string
    Email  string
    Roles  []string
}

// userClaimsKey is the context key for storing user claims.
type userClaimsKey struct{}

// NewAuthInterceptor creates a new authentication interceptor with the given config.
func NewAuthInterceptor(config AuthConfig) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Check if the method is public and does not require authentication
        if isPublicMethod(info.FullMethod, config.PublicMethods) {
            return handler(ctx, req)
        }

        // Extract the authorization token from metadata
        token, err := extractToken(ctx)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "missing or invalid authorization token")
        }

        // Validate the JWT token and extract claims
        claims, err := validateJWT(token, config.JWTSecret)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "invalid token: "+err.Error())
        }

        // Add claims to context for use by handlers
        ctx = context.WithValue(ctx, userClaimsKey{}, claims)

        return handler(ctx, req)
    }
}

// NewStreamAuthInterceptor creates a stream authentication interceptor.
func NewStreamAuthInterceptor(config AuthConfig) grpc.StreamServerInterceptor {
    return func(
        srv interface{},
        ss grpc.ServerStream,
        info *grpc.StreamServerInfo,
        handler grpc.StreamHandler,
    ) error {
        // Check if the method is public
        if isPublicMethod(info.FullMethod, config.PublicMethods) {
            return handler(srv, ss)
        }

        // Extract and validate token
        token, err := extractToken(ss.Context())
        if err != nil {
            return status.Error(codes.Unauthenticated, "missing or invalid authorization token")
        }

        claims, err := validateJWT(token, config.JWTSecret)
        if err != nil {
            return status.Error(codes.Unauthenticated, "invalid token: "+err.Error())
        }

        // Wrap the stream with an authenticated context
        wrappedStream := &authenticatedServerStream{
            ServerStream: ss,
            ctx:          context.WithValue(ss.Context(), userClaimsKey{}, claims),
        }

        return handler(srv, wrappedStream)
    }
}

// authenticatedServerStream wraps ServerStream to provide an authenticated context.
type authenticatedServerStream struct {
    grpc.ServerStream
    ctx context.Context
}

// Context returns the authenticated context.
func (s *authenticatedServerStream) Context() context.Context {
    return s.ctx
}

// extractToken retrieves the bearer token from gRPC metadata.
func extractToken(ctx context.Context) (string, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return "", status.Error(codes.Unauthenticated, "no metadata provided")
    }

    // Look for the authorization header
    authHeader := md.Get("authorization")
    if len(authHeader) == 0 {
        return "", status.Error(codes.Unauthenticated, "authorization header not provided")
    }

    // Extract the bearer token
    parts := strings.SplitN(authHeader[0], " ", 2)
    if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
        return "", status.Error(codes.Unauthenticated, "invalid authorization format")
    }

    return parts[1], nil
}

// isPublicMethod checks if a method is in the public methods list.
func isPublicMethod(method string, publicMethods []string) bool {
    for _, m := range publicMethods {
        if m == method {
            return true
        }
    }
    return false
}

// validateJWT validates the JWT token and returns the claims.
// In a real implementation, use a proper JWT library like golang-jwt/jwt.
func validateJWT(token, secret string) (*UserClaims, error) {
    // Placeholder implementation
    // Use github.com/golang-jwt/jwt/v5 for production
    return &UserClaims{
        UserID: "user-123",
        Email:  "user@example.com",
        Roles:  []string{"admin"},
    }, nil
}

// GetUserClaims retrieves user claims from the context.
func GetUserClaims(ctx context.Context) (*UserClaims, bool) {
    claims, ok := ctx.Value(userClaimsKey{}).(*UserClaims)
    return claims, ok
}
```

### Authorization Interceptor

Building on authentication, we can add role-based authorization:

```go
package interceptors

import (
    "context"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// MethodPermissions maps RPC methods to required roles.
type MethodPermissions map[string][]string

// NewAuthorizationInterceptor creates an interceptor that enforces role-based access.
func NewAuthorizationInterceptor(permissions MethodPermissions) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Get the required roles for this method
        requiredRoles, exists := permissions[info.FullMethod]
        if !exists {
            // No specific permissions required, allow the call
            return handler(ctx, req)
        }

        // Get user claims from context (set by auth interceptor)
        claims, ok := GetUserClaims(ctx)
        if !ok {
            return nil, status.Error(codes.Internal, "user claims not found in context")
        }

        // Check if user has any of the required roles
        if !hasAnyRole(claims.Roles, requiredRoles) {
            return nil, status.Errorf(
                codes.PermissionDenied,
                "user does not have required permissions for %s",
                info.FullMethod,
            )
        }

        return handler(ctx, req)
    }
}

// hasAnyRole checks if the user has any of the required roles.
func hasAnyRole(userRoles, requiredRoles []string) bool {
    roleSet := make(map[string]struct{}, len(userRoles))
    for _, role := range userRoles {
        roleSet[role] = struct{}{}
    }

    for _, required := range requiredRoles {
        if _, exists := roleSet[required]; exists {
            return true
        }
    }
    return false
}
```

## Implementing a Rate Limiting Interceptor

Rate limiting protects your service from abuse and ensures fair resource usage. We will implement a token bucket rate limiter.

### Per-Client Rate Limiter

This interceptor applies rate limits per client identified by their IP or user ID:

```go
package interceptors

import (
    "context"
    "sync"

    "golang.org/x/time/rate"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/peer"
    "google.golang.org/grpc/status"
)

// RateLimiterConfig holds configuration for the rate limiter.
type RateLimiterConfig struct {
    // RequestsPerSecond is the rate limit for each client
    RequestsPerSecond float64
    // BurstSize is the maximum burst size allowed
    BurstSize int
}

// RateLimiter manages per-client rate limiters.
type RateLimiter struct {
    config   RateLimiterConfig
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
}

// NewRateLimiter creates a new rate limiter with the given configuration.
func NewRateLimiter(config RateLimiterConfig) *RateLimiter {
    return &RateLimiter{
        config:   config,
        limiters: make(map[string]*rate.Limiter),
    }
}

// getLimiter returns the rate limiter for a given client ID.
// Creates a new limiter if one does not exist.
func (r *RateLimiter) getLimiter(clientID string) *rate.Limiter {
    r.mu.RLock()
    limiter, exists := r.limiters[clientID]
    r.mu.RUnlock()

    if exists {
        return limiter
    }

    // Create a new limiter for this client
    r.mu.Lock()
    defer r.mu.Unlock()

    // Double-check after acquiring write lock
    if limiter, exists = r.limiters[clientID]; exists {
        return limiter
    }

    limiter = rate.NewLimiter(
        rate.Limit(r.config.RequestsPerSecond),
        r.config.BurstSize,
    )
    r.limiters[clientID] = limiter

    return limiter
}

// UnaryInterceptor returns a unary interceptor that enforces rate limits.
func (r *RateLimiter) UnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        clientID := extractClientID(ctx)
        limiter := r.getLimiter(clientID)

        if !limiter.Allow() {
            return nil, status.Errorf(
                codes.ResourceExhausted,
                "rate limit exceeded for client %s",
                clientID,
            )
        }

        return handler(ctx, req)
    }
}

// StreamInterceptor returns a stream interceptor that enforces rate limits.
func (r *RateLimiter) StreamInterceptor() grpc.StreamServerInterceptor {
    return func(
        srv interface{},
        ss grpc.ServerStream,
        info *grpc.StreamServerInfo,
        handler grpc.StreamHandler,
    ) error {
        clientID := extractClientID(ss.Context())
        limiter := r.getLimiter(clientID)

        if !limiter.Allow() {
            return status.Errorf(
                codes.ResourceExhausted,
                "rate limit exceeded for client %s",
                clientID,
            )
        }

        return handler(srv, ss)
    }
}

// extractClientID extracts the client identifier from the context.
// Falls back to the peer address if no user claims are available.
func extractClientID(ctx context.Context) string {
    // First, try to get the user ID from claims
    if claims, ok := GetUserClaims(ctx); ok {
        return claims.UserID
    }

    // Fall back to peer address
    if p, ok := peer.FromContext(ctx); ok {
        return p.Addr.String()
    }

    return "unknown"
}
```

### Method-Specific Rate Limiting

Sometimes you need different rate limits for different methods:

```go
package interceptors

import (
    "context"

    "golang.org/x/time/rate"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// MethodRateLimits maps methods to their rate limit configurations.
type MethodRateLimits map[string]RateLimiterConfig

// MethodRateLimiter applies different rate limits based on the method.
type MethodRateLimiter struct {
    limits   MethodRateLimits
    default_ RateLimiterConfig
    limiters map[string]*RateLimiter
}

// NewMethodRateLimiter creates a rate limiter with per-method configurations.
func NewMethodRateLimiter(limits MethodRateLimits, defaultConfig RateLimiterConfig) *MethodRateLimiter {
    m := &MethodRateLimiter{
        limits:   limits,
        default_: defaultConfig,
        limiters: make(map[string]*RateLimiter),
    }

    // Pre-create limiters for each configured method
    for method, config := range limits {
        m.limiters[method] = NewRateLimiter(config)
    }

    // Create the default limiter
    m.limiters["_default"] = NewRateLimiter(defaultConfig)

    return m
}

// UnaryInterceptor returns a unary interceptor with method-specific rate limits.
func (m *MethodRateLimiter) UnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        limiter := m.getLimiterForMethod(info.FullMethod)
        clientID := extractClientID(ctx)

        if !limiter.getLimiter(clientID).Allow() {
            return nil, status.Errorf(
                codes.ResourceExhausted,
                "rate limit exceeded for %s",
                info.FullMethod,
            )
        }

        return handler(ctx, req)
    }
}

// getLimiterForMethod returns the appropriate rate limiter for a method.
func (m *MethodRateLimiter) getLimiterForMethod(method string) *RateLimiter {
    if limiter, exists := m.limiters[method]; exists {
        return limiter
    }
    return m.limiters["_default"]
}
```

## Implementing an OpenTelemetry Tracing Interceptor

Distributed tracing is essential for understanding request flow across services. We will implement a custom tracing interceptor that integrates with OpenTelemetry.

### Tracing Interceptor Implementation

This interceptor creates spans for each RPC call and propagates trace context:

```go
package interceptors

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
    grpcstatus "google.golang.org/grpc/status"
)

// TracingConfig holds configuration for the tracing interceptor.
type TracingConfig struct {
    // ServiceName is the name of this service for tracing
    ServiceName string
    // TracerProvider is the OpenTelemetry tracer provider to use
    TracerProvider trace.TracerProvider
}

// metadataCarrier implements propagation.TextMapCarrier for gRPC metadata.
type metadataCarrier metadata.MD

// Get returns the value for a key from the carrier.
func (mc metadataCarrier) Get(key string) string {
    vals := metadata.MD(mc).Get(key)
    if len(vals) > 0 {
        return vals[0]
    }
    return ""
}

// Set sets a key-value pair in the carrier.
func (mc metadataCarrier) Set(key, val string) {
    metadata.MD(mc).Set(key, val)
}

// Keys returns all keys in the carrier.
func (mc metadataCarrier) Keys() []string {
    keys := make([]string, 0, len(mc))
    for k := range mc {
        keys = append(keys, k)
    }
    return keys
}

// NewTracingInterceptor creates a unary tracing interceptor.
func NewTracingInterceptor(config TracingConfig) grpc.UnaryServerInterceptor {
    tracer := config.TracerProvider.Tracer(
        config.ServiceName,
        trace.WithInstrumentationVersion("1.0.0"),
    )
    propagator := otel.GetTextMapPropagator()

    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Extract trace context from incoming metadata
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            ctx = propagator.Extract(ctx, metadataCarrier(md))
        }

        // Start a new span for this RPC
        ctx, span := tracer.Start(
            ctx,
            info.FullMethod,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                attribute.String("rpc.system", "grpc"),
                attribute.String("rpc.service", extractServiceName(info.FullMethod)),
                attribute.String("rpc.method", extractMethodName(info.FullMethod)),
            ),
        )
        defer span.End()

        // Add user information if available
        if claims, ok := GetUserClaims(ctx); ok {
            span.SetAttributes(
                attribute.String("user.id", claims.UserID),
                attribute.String("user.email", claims.Email),
            )
        }

        // Call the handler
        resp, err := handler(ctx, req)

        // Record the result
        if err != nil {
            st, _ := grpcstatus.FromError(err)
            span.SetStatus(codes.Error, st.Message())
            span.SetAttributes(
                attribute.String("rpc.grpc.status_code", st.Code().String()),
            )
        } else {
            span.SetStatus(codes.Ok, "")
            span.SetAttributes(
                attribute.String("rpc.grpc.status_code", "OK"),
            )
        }

        return resp, err
    }
}

// NewStreamTracingInterceptor creates a stream tracing interceptor.
func NewStreamTracingInterceptor(config TracingConfig) grpc.StreamServerInterceptor {
    tracer := config.TracerProvider.Tracer(
        config.ServiceName,
        trace.WithInstrumentationVersion("1.0.0"),
    )
    propagator := otel.GetTextMapPropagator()

    return func(
        srv interface{},
        ss grpc.ServerStream,
        info *grpc.StreamServerInfo,
        handler grpc.StreamHandler,
    ) error {
        ctx := ss.Context()

        // Extract trace context from incoming metadata
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            ctx = propagator.Extract(ctx, metadataCarrier(md))
        }

        // Start a new span for this stream
        ctx, span := tracer.Start(
            ctx,
            info.FullMethod,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                attribute.String("rpc.system", "grpc"),
                attribute.String("rpc.service", extractServiceName(info.FullMethod)),
                attribute.String("rpc.method", extractMethodName(info.FullMethod)),
                attribute.Bool("rpc.grpc.client_stream", info.IsClientStream),
                attribute.Bool("rpc.grpc.server_stream", info.IsServerStream),
            ),
        )
        defer span.End()

        // Wrap the stream with the traced context
        wrappedStream := &tracedServerStream{
            ServerStream: ss,
            ctx:          ctx,
        }

        err := handler(srv, wrappedStream)

        if err != nil {
            st, _ := grpcstatus.FromError(err)
            span.SetStatus(codes.Error, st.Message())
        } else {
            span.SetStatus(codes.Ok, "")
        }

        return err
    }
}

// tracedServerStream wraps ServerStream with a traced context.
type tracedServerStream struct {
    grpc.ServerStream
    ctx context.Context
}

// Context returns the traced context.
func (s *tracedServerStream) Context() context.Context {
    return s.ctx
}

// extractServiceName extracts the service name from a full method string.
func extractServiceName(fullMethod string) string {
    // Full method format: /package.Service/Method
    if len(fullMethod) > 0 && fullMethod[0] == '/' {
        fullMethod = fullMethod[1:]
    }
    for i := len(fullMethod) - 1; i >= 0; i-- {
        if fullMethod[i] == '/' {
            return fullMethod[:i]
        }
    }
    return fullMethod
}

// extractMethodName extracts the method name from a full method string.
func extractMethodName(fullMethod string) string {
    for i := len(fullMethod) - 1; i >= 0; i-- {
        if fullMethod[i] == '/' {
            return fullMethod[i+1:]
        }
    }
    return fullMethod
}
```

## Chaining Multiple Interceptors

gRPC allows you to chain multiple interceptors. The order matters as interceptors execute in sequence.

### Using grpc.ChainUnaryInterceptor

Chain interceptors in the order you want them to execute:

```go
package main

import (
    "log"
    "net"

    "google.golang.org/grpc"
    "go.opentelemetry.io/otel"

    "github.com/example/grpc-interceptors/interceptors"
)

func main() {
    // Create the rate limiter
    rateLimiter := interceptors.NewRateLimiter(interceptors.RateLimiterConfig{
        RequestsPerSecond: 100,
        BurstSize:         10,
    })

    // Define authentication configuration
    authConfig := interceptors.AuthConfig{
        JWTSecret: "your-secret-key",
        PublicMethods: []string{
            "/api.UserService/HealthCheck",
        },
    }

    // Define authorization permissions
    permissions := interceptors.MethodPermissions{
        "/api.UserService/DeleteUser": {"admin"},
        "/api.UserService/CreateUser": {"admin", "manager"},
    }

    // Create tracing configuration
    tracingConfig := interceptors.TracingConfig{
        ServiceName:    "user-service",
        TracerProvider: otel.GetTracerProvider(),
    }

    // Create the gRPC server with chained interceptors.
    // The order is important:
    // 1. Rate limiting - reject early if rate exceeded
    // 2. Tracing - start the span early to capture full request lifecycle
    // 3. Logging - log the request details
    // 4. Authentication - validate the token
    // 5. Authorization - check permissions
    server := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            rateLimiter.UnaryInterceptor(),
            interceptors.NewTracingInterceptor(tracingConfig),
            interceptors.UnaryLoggingInterceptor,
            interceptors.NewAuthInterceptor(authConfig),
            interceptors.NewAuthorizationInterceptor(permissions),
        ),
        grpc.ChainStreamInterceptor(
            rateLimiter.StreamInterceptor(),
            interceptors.NewStreamTracingInterceptor(tracingConfig),
            interceptors.StreamLoggingInterceptor,
            interceptors.NewStreamAuthInterceptor(authConfig),
        ),
    )

    // Register your service implementation
    // api.RegisterUserServiceServer(server, &userServiceImpl{})

    // Start the server
    listener, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    log.Println("Starting gRPC server on :50051")
    if err := server.Serve(listener); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

### Client-Side Interceptor Chain

Apply interceptors on the client side for consistent behavior:

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/metadata"
)

// clientLoggingInterceptor logs outgoing RPC calls on the client side.
func clientLoggingInterceptor(
    ctx context.Context,
    method string,
    req, reply interface{},
    cc *grpc.ClientConn,
    invoker grpc.UnaryInvoker,
    opts ...grpc.CallOption,
) error {
    start := time.Now()
    log.Printf("Calling %s", method)

    err := invoker(ctx, method, req, reply, cc, opts...)

    log.Printf("Completed %s in %v", method, time.Since(start))
    return err
}

// clientTracingInterceptor propagates trace context to the server.
func clientTracingInterceptor(
    ctx context.Context,
    method string,
    req, reply interface{},
    cc *grpc.ClientConn,
    invoker grpc.UnaryInvoker,
    opts ...grpc.CallOption,
) error {
    // Create outgoing metadata with trace context
    md, ok := metadata.FromOutgoingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    } else {
        md = md.Copy()
    }

    // Inject trace context into metadata
    propagator := otel.GetTextMapPropagator()
    propagator.Inject(ctx, metadataCarrier(md))

    // Set the metadata in the outgoing context
    ctx = metadata.NewOutgoingContext(ctx, md)

    return invoker(ctx, method, req, reply, cc, opts...)
}

// metadataCarrier implements propagation.TextMapCarrier for metadata.
type metadataCarrier metadata.MD

func (mc metadataCarrier) Get(key string) string {
    vals := metadata.MD(mc).Get(key)
    if len(vals) > 0 {
        return vals[0]
    }
    return ""
}

func (mc metadataCarrier) Set(key, val string) {
    metadata.MD(mc).Append(key, val)
}

func (mc metadataCarrier) Keys() []string {
    keys := make([]string, 0, len(mc))
    for k := range mc {
        keys = append(keys, k)
    }
    return keys
}

func createClient() (*grpc.ClientConn, error) {
    // Create client connection with chained interceptors
    conn, err := grpc.Dial(
        "localhost:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithChainUnaryInterceptor(
            clientTracingInterceptor,
            clientLoggingInterceptor,
        ),
    )
    if err != nil {
        return nil, err
    }

    return conn, nil
}
```

## Recovery Interceptor

A recovery interceptor catches panics and converts them to gRPC errors:

```go
package interceptors

import (
    "context"
    "runtime/debug"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// RecoveryInterceptor catches panics and returns an Internal error.
func RecoveryInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (resp interface{}, err error) {
    defer func() {
        if r := recover(); r != nil {
            // Log the stack trace for debugging
            log.Printf("Panic recovered in %s: %v\n%s",
                info.FullMethod, r, debug.Stack())

            err = status.Errorf(
                codes.Internal,
                "internal server error",
            )
        }
    }()

    return handler(ctx, req)
}

// StreamRecoveryInterceptor catches panics in stream handlers.
func StreamRecoveryInterceptor(
    srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) (err error) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Panic recovered in stream %s: %v\n%s",
                info.FullMethod, r, debug.Stack())

            err = status.Errorf(
                codes.Internal,
                "internal server error",
            )
        }
    }()

    return handler(srv, ss)
}
```

## Best Practices

When implementing gRPC interceptors, follow these best practices:

1. **Order Matters**: Place rate limiting and authentication early in the chain to reject invalid requests quickly.

2. **Keep Interceptors Focused**: Each interceptor should handle one concern. This makes them easier to test and maintain.

3. **Use Context for Data**: Pass data between interceptors using context values rather than global state.

4. **Handle Errors Gracefully**: Always return proper gRPC status codes that clients can understand.

5. **Be Mindful of Performance**: Interceptors run on every request, so avoid expensive operations.

6. **Test Interceptors Independently**: Write unit tests for each interceptor in isolation.

7. **Log Appropriately**: Avoid logging sensitive data like tokens or passwords.

8. **Use Timeouts**: Add context timeouts to prevent long-running operations.

## Conclusion

gRPC interceptors provide a powerful mechanism for implementing cross-cutting concerns in your Go services. By implementing logging, authentication, rate limiting, and tracing interceptors, you can build robust and observable microservices.

The key takeaways are:

- Unary interceptors handle request-response calls, while stream interceptors handle streaming RPCs
- Wrap server streams when you need to modify the context or intercept messages
- Chain interceptors in a logical order with fast-failing checks early
- Use OpenTelemetry for distributed tracing across services
- Implement recovery interceptors to handle panics gracefully

With these patterns in place, your gRPC services will be production-ready with proper observability, security, and resilience built in.
