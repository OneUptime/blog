# Validation Summary: How to Implement Server Push with HTTP/2 in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go `net/http`
- HTTP/2
- HTTP/2 server push
- TLS certificates
- OpenSSL
- curl

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `http.Pusher` and `http.PushOptions` documentation: https://pkg.go.dev/net/http#Pusher
- RFC 9113, HTTP/2 server push and `SETTINGS_ENABLE_PUSH`: https://www.rfc-editor.org/rfc/rfc9113
- Chrome Developers, "Remove HTTP/2 Server Push from Chrome": https://developer.chrome.com/blog/removing-push
- MDN HTTP/2 glossary entry noting removal from most major browser engines: https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2
- Local OpenSSL 3.0.13 `openssl req -help` output
- Local curl 8.5.0 `curl --version` and `curl --help http` output

## Issues Found
- The post implied HTTP/2 server push is currently useful for browser page-load optimization in general. Updated the introduction, usage guidance, verification section, and conclusion to explain that most major browsers have removed HTTP/2 server push support and that Go's `http.Pusher` is mainly useful with HTTP/2 clients that explicitly support push.
- The self-signed certificate command used only `CN=localhost` and the deprecated OpenSSL `-nodes` option. Updated it to include a `subjectAltName=DNS:localhost` extension and use `-noenc`.
- The verification section recommended Chrome DevTools and suggested `curl -v --http2` would show `PUSH_PROMISE` frames. Updated it to say modern browsers no longer expose HTTP/2 server push, `curl` can confirm HTTP/2 negotiation, and push promises should be verified with a push-capable HTTP/2 client library or frame-level debugging tool.
- The cache guidance described browser cancellation of pushed resources. Updated it to refer to client-side cache behavior generically because current major browsers no longer support HTTP/2 server push.

## Review Notes
The Go API usage is still valid: `http.Pusher` and `http.PushOptions` are present in the standard library, and `ListenAndServeTLS` is an appropriate way to run a Go HTTPS server that can negotiate HTTP/2 in the usual configuration. I could not compile the Go examples locally because the `go` command is not installed in this environment.
