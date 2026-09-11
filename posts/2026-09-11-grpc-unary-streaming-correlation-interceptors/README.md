# Add Correlation IDs to gRPC Unary and Streaming Interceptors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, gRPC, Go, Logging, Observability

Description: Establish per-RPC correlation context in Go unary and streaming interceptors, return response metadata, and isolate concurrent streams without global state.

---

A gRPC unary call has one handler execution, while a streaming RPC can exchange many messages over a long lifetime. Both need an RPC-level correlation ID, but a streaming interceptor must replace the stream's context rather than only modifying a local variable.

Go makes cleanup simpler when the ID is stored in an immutable derived context. No thread-local value needs clearing. The key requirement is to create the context for each RPC and pass it to the actual handler, including through a wrapped `ServerStream`.

## Define the metadata contract

Use the ASCII metadata key `x-correlation-id`. Public-facing RPCs can generate a new value. Internal RPCs may preserve a validated value if a separate authentication layer establishes that the caller is trusted to supply it.

Do not infer trust from the metadata itself. A caller can provide a plausible hexadecimal value. Keep authorization and tenant identity in their normal authenticated mechanisms.

The [gRPC metadata guide](https://grpc.io/docs/guides/metadata/) describes request headers and response headers/trailers. Lowercase keys and bounded ASCII values avoid unnecessary encoding ambiguity.

## Create an RPC context

The following code belongs in a Go package named `correlation`. It requires `google.golang.org/grpc`:

```go
package correlation

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "regexp"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

type key struct{}
var validID = regexp.MustCompile(`^[0-9a-f]{32}$`)

func ID(ctx context.Context) string {
    value, _ := ctx.Value(key{}).(string)
    return value
}

func rpcContext(ctx context.Context, trustIncoming bool) (context.Context, string, error) {
    id := ""
    if trustIncoming {
        md, _ := metadata.FromIncomingContext(ctx)
        values := md.Get("x-correlation-id")
        if len(values) == 1 && validID.MatchString(values[0]) {
            id = values[0]
        }
    }
    if id == "" {
        var bytes [16]byte
        if _, err := rand.Read(bytes[:]); err != nil {
            return ctx, "", status.Error(codes.Internal, "request initialization failed")
        }
        id = hex.EncodeToString(bytes[:])
    }
    return context.WithValue(ctx, key{}, id), id, nil
}
```

Multiple values are treated as invalid. This avoids accepting whichever occurrence a downstream parser happens to prefer. The format is the service's contract, not a special gRPC identifier format.

The boolean configures the listener or server's trust policy. If trust differs by authenticated principal, derive that decision from verified identity before calling the helper instead of enabling it globally.

## Wrap unary calls

Add the unary interceptor to the same package:

```go
func Unary(trustIncoming bool) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler) (any, error) {
        next, id, err := rpcContext(ctx, trustIncoming)
        if err != nil {
            return nil, err
        }
        if err := grpc.SetHeader(next, metadata.Pairs("x-correlation-id", id)); err != nil {
            return nil, err
        }
        return handler(next, req)
    }
}
```

The handler receives `next`, which retains the original deadline and cancellation while adding the ID. `SetHeader` queues response metadata; the framework sends it with the response according to its normal lifecycle.

Read `ID(ctx)` in the logging integration and attach it as a structured field. Passing a context to a logging API does not universally mean the API extracts arbitrary context values automatically.

## Replace the streaming context

For streaming RPCs, wrap `ServerStream.Context()`:

```go
type serverStream struct {
    grpc.ServerStream
    ctx context.Context
}

func (s *serverStream) Context() context.Context { return s.ctx }

func Stream(trustIncoming bool) grpc.StreamServerInterceptor {
    return func(srv any, stream grpc.ServerStream, info *grpc.StreamServerInfo,
        handler grpc.StreamHandler) error {
        next, id, err := rpcContext(stream.Context(), trustIncoming)
        if err != nil {
            return err
        }
        if err := stream.SetHeader(metadata.Pairs("x-correlation-id", id)); err != nil {
            return err
        }
        wrapped := &serverStream{ServerStream: stream, ctx: next}
        return handler(srv, wrapped)
    }
}
```

Register both interceptors on the server:

```go
server := grpc.NewServer(
    grpc.ChainUnaryInterceptor(correlation.Unary(false)),
    grpc.ChainStreamInterceptor(correlation.Stream(false)),
)
```

The registration snippet is in your application's main package. Register generated service implementations on `server` and serve it using the normal gRPC setup. If you have logging, authentication, recovery, or tracing interceptors, choose and test their order so each sees the intended context.

## Distinguish stream identity from message identity

Keep the RPC ID stable for the stream's lifetime. If messages represent independent commands, add application message IDs and operation correlation IDs to the protobuf envelope. Headers are sent at RPC setup and are not a per-message carrier.

Create a new RPC ID on reconnect. An application workflow can keep a separate durable ID across reconnects, but a single permanent connection ID makes individual failures hard to isolate.

Do not run simultaneous sends or simultaneous receives on the same Go stream unless supported by the specific API contract. Correlation context is concurrency-safe; that does not make every operation on the stream safe to call concurrently.

## Verify errors and isolation

Test unary success, handler errors, canceled deadlines, streaming completion, early stream errors, and two concurrent streams. Read response metadata from the client and confirm it matches the handler's structured logs.

Repeat with missing, duplicate, and malformed metadata on a trusted internal server. Run an unrelated RPC afterward and verify no prior ID is present. Because the implementation passes contexts rather than mutating globals, cleanup follows the RPC's object lifetime.

## Conclusion

Create a derived context per RPC, pass it directly to unary handlers, and wrap `ServerStream.Context` for streaming handlers. Return the selected ID in response metadata and use separate message identifiers when one stream contains several operations.

## Official Documentation

- [gRPC metadata](https://grpc.io/docs/guides/metadata/)
- [gRPC Go interceptors and server streams](https://pkg.go.dev/google.golang.org/grpc)
- [Go context values and cancellation](https://pkg.go.dev/context)
