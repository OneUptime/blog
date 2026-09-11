# Attach Correlation IDs to Go Context and HTTP or gRPC Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Go, HTTP, gRPC, Logging

Description: Carry request correlation through Go context.Context, enrich slog explicitly, and forward validated metadata across HTTP and gRPC boundaries.

---

Go already passes request lifetime through `context.Context`. A correlation ID fits there when it is request-scoped metadata that must travel across API boundaries. Adding it to the context avoids a second diagnostic parameter while preserving the normal explicit `ctx` argument.

Context storage does not automatically enrich logs or serialize network headers. Add those steps deliberately. This guide uses the standard `log/slog` package and a private context key so unrelated packages cannot accidentally overwrite the value.

## Define a small context API

Create a package such as `correlation`:

```go
package correlation

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "log/slog"
)

type idKey struct{}

func NewID() (string, error) {
    var bytes [16]byte
    if _, err := rand.Read(bytes[:]); err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes[:]), nil
}

func WithID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, idKey{}, id)
}

func ID(ctx context.Context) string {
    id, _ := ctx.Value(idKey{}).(string)
    return id
}

func Logger(ctx context.Context, base *slog.Logger) *slog.Logger {
    if id := ID(ctx); id != "" {
        return base.With("correlation_id", id)
    }
    return base
}
```

The [Go context documentation](https://pkg.go.dev/context) recommends private key types to avoid collisions and limits context values to data that belongs across request/API boundaries. Do not put application configuration or optional business arguments into the context merely to shorten function signatures.

`WithValue` derives a context rather than mutating the parent. Passing it to a goroutine is safe, but the values you store should also be safe to share. An immutable string is a straightforward choice.

## Generate an ID in HTTP middleware

Add this code to the same package:

```go
package correlation

import (
    "log/slog"
    "net/http"
)

func HTTP(next http.Handler, base *slog.Logger) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id, err := NewID()
        if err != nil {
            http.Error(w, "request initialization failed", http.StatusInternalServerError)
            return
        }
        ctx := WithID(r.Context(), id)
        w.Header().Set("X-Correlation-ID", id)
        Logger(ctx, base).InfoContext(ctx, "http.started", "method", r.Method)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

Use this around your application's handler and supply a JSON logger created with `slog.New(slog.NewJSONHandler(os.Stdout, nil))`. The public boundary generates the ID rather than trusting an arbitrary request header.

If an authenticated upstream assigns IDs, validate exactly one header value against your bounded format before storing it. Keep the authentication decision outside the parser. A matching string is well formed, not necessarily trustworthy.

The middleware leaves cancellation attached to the incoming request context. Replacing it with `context.Background()` would discard cancellation and deadlines along with useful parent values.

## Enrich slog explicitly

A handler or service can log using:

```go
log := correlation.Logger(ctx, baseLogger)
log.InfoContext(ctx, "inventory lookup", "sku", sku)
```

`InfoContext` passes a context to the logging handler. It does not, by itself, turn arbitrary context values into log attributes. The helper explicitly adds `correlation_id`, so the behavior is visible and easy to test.

A custom `slog.Handler` can centralize this enrichment if many call sites need it. If you implement one, preserve `WithAttrs`, `WithGroup`, and `Enabled` semantics rather than only wrapping `Handle`. Start with the small helper unless the extra abstraction has a concrete benefit.

The [slog package documentation](https://pkg.go.dev/log/slog) explains structured attributes and context-aware handler methods.

## Forward the ID across HTTP and gRPC

For HTTP, create an outgoing request with the current context and set the approved header:

```go
request, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
if err != nil {
    return err
}
if id := correlation.ID(ctx); id != "" {
    request.Header.Set("X-Correlation-ID", id)
}
```

For gRPC, use metadata. This helper replaces the key in a copied outgoing metadata map instead of appending duplicates:

```go
func Outgoing(ctx context.Context) context.Context {
    id := correlation.ID(ctx)
    if id == "" {
        return ctx
    }
    md, _ := metadata.FromOutgoingContext(ctx)
    md = md.Copy()
    md.Set("x-correlation-id", id)
    return metadata.NewOutgoingContext(ctx, md)
}
```

The last helper belongs in your client package and needs imports for `context`, your correlation package, and `google.golang.org/grpc/metadata`. Call the generated RPC client with the returned context. Configure an inbound interceptor to validate metadata and call `WithID` on the server side.

Metadata keys are lowercase in gRPC conventions. Use an ordinary ASCII metadata value for this ID; binary metadata uses separate `-bin` keys. Restrict forwarding to trusted destinations and avoid copying arbitrary incoming metadata wholesale.

## Handle goroutines and detached work carefully

Pass `ctx` explicitly into goroutines that belong to the request and honor its cancellation. For durable background work, copy selected identifiers into a job envelope and create a worker context with its own deadline. Do not retain a request context indefinitely just to keep a correlation value.

Go does not need a thread-local cleanup operation here: contexts are passed explicitly. The equivalent mistake is reusing a context from a previous request or storing it on a long-lived service struct.

## Verify the boundaries

Send concurrent requests and compare response IDs with HTTP and service logs. Check that canceled requests stop downstream calls. For gRPC, inspect received metadata and confirm exactly one correlation value reaches the server.

Also log outside a request to verify the helper does not invent or reuse an ID. Keep exact IDs in logs and trace attributes, not metric labels whose series count would grow with request volume.

## Conclusion

Use a private Go context key for the ID, preserve the incoming request lifetime, and enrich logs explicitly. HTTP headers and gRPC metadata are separate transport steps, so verify both boundaries rather than assuming a context value crosses the network automatically.

## Official Documentation

- [Go context package](https://pkg.go.dev/context)
- [Go slog package](https://pkg.go.dev/log/slog)
- [gRPC metadata guide](https://grpc.io/docs/guides/metadata/)
- [gRPC Go APIs](https://pkg.go.dev/google.golang.org/grpc)
