# Validation Summary: How to Stream Events with Server-Sent Events in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go net/http
- Server-Sent Events
- EventSource browser API
- HTTP streaming
- Nginx reverse proxy configuration

## Sources Consulted
- WHATWG HTML Living Standard, Server-sent events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- MDN, Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN, EventSource API: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Go package documentation, net/http: https://pkg.go.dev/net/http
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx directive index / core module documentation: https://nginx.org/en/docs/

## Issues Found
- The connection-limit note stated that browsers limit connections per domain to typically 6 without qualifying that this is the non-HTTP/2 behavior. Updated the sentence to clarify that HTTP/2 uses a negotiated maximum number of simultaneous streams instead.

## Review Notes
- The Go examples use current `net/http` APIs and the `http.Flusher` runtime check recommended by the Go documentation.
- The SSE event format, `text/event-stream` content type, `event`, `data`, `id`, `retry`, comment heartbeats, and `Last-Event-ID` behavior match the WHATWG specification and MDN documentation.
- The Nginx buffering guidance matches the official `proxy_buffering` and `X-Accel-Buffering` behavior. The exact deployment may still need proxy-specific testing because intermediaries can buffer despite application-level flushing.
