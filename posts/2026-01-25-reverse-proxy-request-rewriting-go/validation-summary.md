# Validation Summary: How to Build a Reverse Proxy with Request Rewriting in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http
- net/http/httputil ReverseProxy
- HTTP reverse proxying
- Request rewriting
- HTTP headers and request bodies

## Sources Consulted
- Go standard library documentation for net/http/httputil ReverseProxy, ProxyRequest, Rewrite, ModifyResponse, ErrorHandler, FlushInterval, and NewSingleHostReverseProxy: https://pkg.go.dev/net/http/httputil
- Go standard library source for net/http/httputil ReverseProxy upgrade handling and NewSingleHostReverseProxy behavior: https://go.dev/src/net/http/httputil/reverseproxy.go
- Go standard library documentation for net/http Request, Response, Transport, Header, and ContentLength behavior: https://pkg.go.dev/net/http
- Go standard library documentation for net.Dialer timeout and keep-alive fields: https://pkg.go.dev/net

## Issues Found
- The custom reverse proxy examples used `Director`, which is deprecated for customized proxy behavior. Updated those examples and the surrounding explanation to use `Rewrite`, `httputil.ProxyRequest`, `SetURL`, and `SetXForwarded`.
- The header example set `X-Forwarded-Host` after replacing `req.Host` with the backend host, which could lose the original client-facing host. Replaced the manual forwarding header handling with `req.SetXForwarded()`.
- The request body example set `Content-Length` with `string(rune(len(modified)))`, which produces a single Unicode code point rather than a decimal byte length. Removed the incorrect header assignment and kept the correct `ContentLength` update.
- The request body rewrite now guards against a nil outbound body before calling `io.ReadAll`, which avoids a panic for empty-body requests that still match the method and content-type checks.
- The multi-backend router claimed to find the longest prefix but returned the first matching map entry, which is nondeterministic. Updated it to track the longest matching prefix before dispatching.
- The production note said responses are buffered by default. Updated it to describe `ReverseProxy` response copying and `FlushInterval` behavior accurately.
- The production note said the basic reverse proxy does not handle WebSocket upgrades. Updated it to reflect current `ReverseProxy` support for HTTP protocol upgrades such as WebSockets.

## Review Notes
The local environment does not have the Go toolchain installed, so I could not run `go test` or compile extracted examples locally. The snippets were reviewed against the current official Go documentation and source. Future improvements could include using `mime.ParseMediaType` for JSON content-type checks that include parameters such as `charset=utf-8`, and adding explicit server read/write timeouts to the listener example.
