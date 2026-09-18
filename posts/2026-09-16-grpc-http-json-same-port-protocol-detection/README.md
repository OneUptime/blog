# Serve gRPC and HTTP/JSON on One Port with Protocol Detection and Safe Fallbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, HTTP/2, API, Networking

Description: Serve native gRPC and explicit HTTP/JSON routes on one TLS listener using request-level protocol detection and safe media-type fallbacks.

---

Native gRPC and an HTTP/JSON API can share a TLS port when the server classifies each HTTP request before dispatching it. TLS negotiates the HTTP version; the request's media type distinguishes native gRPC from ordinary JSON traffic.

Checking only whether a connection uses HTTP/2 is insufficient. A browser or REST client can also send JSON requests over HTTP/2. Checking only a broad `application/grpc` prefix can accidentally classify gRPC-Web traffic as native gRPC.

## Choose the ownership boundary

In Go, `grpc.Server.ServeHTTP` allows a gRPC server to act as an HTTP handler. A root handler can then route native gRPC requests to it and ordinary API routes to an `http.ServeMux`.

This uses Go's HTTP/2 server rather than the native gRPC-Go HTTP/2 transport. The [`ServeHTTP` documentation](https://pkg.go.dev/google.golang.org/grpc#Server.ServeHTTP) marks the API experimental and notes differences in supported features and performance. Check those constraints against your service before choosing it.

If you need native transport behavior, another option is one public proxy listener with distinct internal gRPC and HTTP backends. Connection-level multiplexers can separate some protocols, but cannot route unrelated requests sharing one HTTP/2 connection independently. Request-level dispatch avoids that ambiguity here.

## Implement a narrow dispatcher

This complete example serves the standard gRPC health service and a small JSON liveness endpoint on port 8443. Supply `server.crt` and `server.key`, with a certificate valid for the hostname used by clients.

```go
package main

import (
    "encoding/json"
    "log"
    "mime"
    "net/http"
    "strings"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

func dispatch(grpcHandler, httpHandler http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        rawType := r.Header.Get("Content-Type")
        mediaType, _, err := mime.ParseMediaType(rawType)
        if rawType != "" && err != nil {
            http.Error(w, "invalid content type", http.StatusBadRequest)
            return
        }
        native := mediaType == "application/grpc" ||
            strings.HasPrefix(mediaType, "application/grpc+")
        if native {
            if r.ProtoMajor != 2 {
                http.Error(w, "native gRPC requires HTTP/2", http.StatusUnsupportedMediaType)
                return
            }
            grpcHandler.ServeHTTP(w, r)
            return
        }
        if strings.HasPrefix(mediaType, "application/grpc") {
            http.Error(w, "unsupported gRPC media type", http.StatusUnsupportedMediaType)
            return
        }
        httpHandler.ServeHTTP(w, r)
    })
}

func main() {
    grpcServer := grpc.NewServer()
    healthServer := health.NewServer()
    healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
    healthpb.RegisterHealthServer(grpcServer, healthServer)

    mux := http.NewServeMux()
    mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
    })

    server := &http.Server{
        Addr:              ":8443",
        Handler:           dispatch(grpcServer, mux),
        ReadHeaderTimeout: 5 * time.Second,
    }
    log.Fatal(server.ListenAndServeTLS("server.crt", "server.key"))
}
```

The method-qualified mux pattern requires Go 1.22 or newer. A normal TLS setup through `ListenAndServeTLS` supports HTTP/2 with Go's standard server configuration; see the [HTTP server documentation](https://pkg.go.dev/net/http#Server.ListenAndServeTLS). Avoid replacing TLS protocol configuration in ways that disable `h2` negotiation.

The gRPC server has no separate TLS credentials here because the HTTP server owns TLS. Unknown ordinary routes receive the mux's 404 response. There is no catch-all HTML page that could turn an incorrectly routed RPC into an apparent HTTP success.

## Preserve protocol boundaries

The [native gRPC HTTP/2 protocol](https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html) specifies a gRPC media type, framed message bodies, and gRPC status trailers. The dispatcher accepts the base media type and `application/grpc+...` subtypes. Whether a particular subtype has a registered codec remains the gRPC server's decision.

An `application/grpc-web...` request uses a different protocol and reaches the explicit unsupported-type response. If browser clients need gRPC-Web, add a compatible gateway or wrapper deliberately and test its CORS policy. Changing a content-type header does not translate its body or trailers.

Similarly, the JSON `/healthz` route is an independent HTTP endpoint. It reports that the process responds; it does not prove that application dependencies are ready. To expose existing business RPCs as JSON, mount generated gRPC-Gateway handlers and define the request/response mapping. The [gateway customization documentation](https://grpc-ecosystem.github.io/grpc-gateway/docs/mapping/customizing_your_gateway/) explains marshaling and HTTP behavior.

## Test both positive and negative routes

Test the JSON path over HTTP/1.1 and HTTP/2. Then call the health RPC with a generated client or `grpcurl`, supplying its proto descriptor if server reflection is not enabled. This example intentionally does not register reflection.

Also send a native gRPC content type over HTTP/1.1, a gRPC-Web content type, malformed media-type syntax, and a normal HTTP/2 JSON request. The dispatcher should reject unsupported protocols while preserving ordinary HTTP routing.

Use a streaming RPC from your application to verify trailers, cancellation, incremental message delivery, and the proxy path. A successful unary health call alone does not exercise those behaviors.

For production, coordinate HTTP and gRPC shutdown, use RPC deadlines, and choose any whole-response HTTP timeouts with long-lived streams in mind. The shared port simplifies exposure, but the two APIs still need explicit authentication, request limits, and lifecycle behavior appropriate to their handlers.
