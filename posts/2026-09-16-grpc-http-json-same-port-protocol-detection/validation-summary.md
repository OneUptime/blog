# Validation Summary: How to Serve gRPC and HTTP/JSON on the Same Port with Protocol Detection and Safe Fallbacks

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered

- Go 1.22+
- gRPC-Go
- Go `net/http` and `http.ServeMux`
- HTTP/2 over TLS
- Native gRPC and gRPC-Web media types
- gRPC health checking
- gRPC-Gateway

## Sources Consulted

- [gRPC-Go `Server.ServeHTTP` documentation](https://pkg.go.dev/google.golang.org/grpc#Server.ServeHTTP)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [Go 1.22 release notes: enhanced routing patterns](https://go.dev/doc/go1.22#enhanced_routing_patterns)
- [Go `mime.ParseMediaType` documentation](https://pkg.go.dev/mime#ParseMediaType)
- [gRPC over HTTP/2 protocol specification](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)
- [gRPC-Web protocol specification](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)
- [gRPC-Go health package documentation](https://pkg.go.dev/google.golang.org/grpc/health)
- [gRPC-Gateway customization documentation](https://grpc-ecosystem.github.io/grpc-gateway/docs/mapping/customizing_your_gateway/)

## Issues Found
No technical issues found.

## Review Notes
The example intentionally relies on the experimental `grpc.Server.ServeHTTP` API and Go's HTTP/2 implementation; the post accurately calls out the associated feature and performance caveats. The method-qualified `ServeMux` pattern correctly establishes Go 1.22 as the minimum version. The media-type parsing and dispatch order correctly accept native `application/grpc` and `application/grpc+...` types while rejecting gRPC-Web instead of forwarding it to the native handler. No README changes were required.
