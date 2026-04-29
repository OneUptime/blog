# Validation Summary: How to Build a Load Balancer in Go That Routes IPv4 Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- `net/http`
- `net/http/httputil`
- TCP
- HTTP reverse proxying
- IPv4 networking

## Sources Consulted
- Go `net/http/httputil` package docs: https://pkg.go.dev/net/http/httputil
- Go `net/http` package docs: https://pkg.go.dev/net/http
- Go `net` package docs: https://pkg.go.dev/net

## Issues Found
- The HTTP example claimed IPv4 routing, but `http.ListenAndServe(":8080", lb)` listens on the generic TCP network. I changed it to `net.Listen("tcp4", ":8080")` with `http.Serve(...)` so the frontend listener is explicitly IPv4-only.
- The HTTP example manually set `X-Forwarded-For` before calling `httputil.ReverseProxy`. Current Go documentation says `ReverseProxy` already sets or appends `X-Forwarded-For`, so the sample would duplicate the client IP. I removed the manual header mutation.
- The health-check loop did not close `resp.Body` on non-200 responses, even though Go’s `http.Get` documentation requires callers to close the body whenever `err` is `nil`. I updated the code to close the body whenever a response is returned.
- The health-check loop used the default HTTP client with no timeout. Go’s `http.Client` docs state that a zero timeout means no timeout, which can stall periodic health checks indefinitely. I changed the sample to reuse an `http.Client` with a timeout.
- The TCP proxy returned after the first `io.Copy` completed, which can cut off the opposite direction before it finishes. I updated the code to proxy with `*net.TCPConn`, use `CloseWrite()`, and wait for both directions to complete.

## Review Notes
- `httputil.NewSingleHostReverseProxy` is still a valid API in current Go, but the newer `Rewrite`/`SetXForwarded` path is what the package documentation recommends when a proxy needs custom header behavior.
- The local environment did not have the Go toolchain installed, so validation was completed by checking the code against official Go documentation and by static review rather than local compilation.
