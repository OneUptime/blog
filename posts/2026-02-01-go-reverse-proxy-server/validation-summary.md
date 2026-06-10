# Validation Summary: How to Build a Reverse Proxy Server in Go

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Go (Golang) standard library
- `net/http` package
- `net/http/httputil` package, specifically `httputil.ReverseProxy` and `httputil.NewSingleHostReverseProxy`
- `net` package (`net.Dialer`)
- `sync` and `sync/atomic` packages (RWMutex, atomic counters)
- HTTP proxy headers (X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Proto, X-Request-ID)
- Security response headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Round-robin load balancing and health checking patterns

## Sources Consulted
- Go `net/http/httputil` package documentation: https://pkg.go.dev/net/http/httputil
- Go `net/http` package documentation: https://pkg.go.dev/net/http (specifically `http.Transport`, `http.Request`, `http.Client`)
- Go `net` package documentation: https://pkg.go.dev/net (`net.Dialer`)
- Go `sync/atomic` package documentation: https://pkg.go.dev/sync/atomic
- RFC 7230 (HTTP/1.1 Message Syntax and Routing) — Host header semantics
- MDN documentation on X-Forwarded-Host / X-Forwarded-For / X-Forwarded-Proto conventions

## Issues Found
- **X-Forwarded-Host was being set to the backend host instead of the original client-requested host.** In both the "Header Manipulation Best Practices" section and the "Putting It All Together" section, the Director set `req.Host = target.Host` (or `backend.URL.Host`) before reading `req.Host` to set `X-Forwarded-Host`. This defeats the purpose of `X-Forwarded-Host`, which by convention should preserve the original Host the client requested. Fixed both code blocks to capture `originalHost := req.Host` before the rewrite and use that value for the `X-Forwarded-Host` header. Added a clarifying inline comment so readers understand why the capture-first ordering is necessary.

## Review Notes
- The post uses the classic `Director` field on `httputil.ReverseProxy`. Go 1.20 added a newer `Rewrite` field (with `httputil.ProxyRequest`) that is now preferred for new code because it makes hop-by-hop and `X-Forwarded-*` handling more explicit (`ProxyRequest.SetXForwarded()`, `ProxyRequest.SetURL()`). `Director` is not deprecated and still works exactly as shown, but a follow-up could mention the modern alternative.
- The `X-XSS-Protection` header is effectively deprecated — Chrome removed the XSS Auditor in v78, and modern Edge/Firefox/Safari do not implement it. Setting the header is harmless but provides no real security benefit. A future revision could replace it with a `Content-Security-Policy` recommendation, but this is not a correctness issue.
- `req.Header.Set("X-Forwarded-For", req.RemoteAddr)` sets the header to a `host:port` string (e.g. `192.0.2.1:1234`) because `req.RemoteAddr` includes the port. Strict RFC 7239 / convention is that `X-Forwarded-For` should contain only IP addresses; production proxies typically strip the port with `net.SplitHostPort`. The current code matches what many tutorials show and works with most downstream consumers, so left as-is.
- In the basic "Load Balancing Across Multiple Backends" section, `Backend.Alive` has no mutex while `NextBackend` reads it concurrently. This is technically a data race if `Alive` were ever mutated after startup. In that example it is only set during initialization so there is no actual race; the later "Health Checks" and "Putting It All Together" sections correctly introduce `sync.RWMutex` and `IsAlive()`. Acceptable as a progressive teaching example.
- The complete program in "Putting It All Together" treats only HTTP 200 as healthy (`b.SetAlive(resp.StatusCode == 200)`), while the earlier standalone `HealthChecker` accepts the full 2xx range. Both are defensible choices and not technically wrong.
- All package imports, struct field names, function signatures, and constants (`http.StatusBadGateway`, `http.Transport.MaxConnsPerHost`, etc.) verified against current Go standard library documentation.
