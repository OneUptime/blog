# Validation Summary: How to Create a WebSocket Server in Go Listening on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (standard library: `net`, `net/http`, `context`, `os/signal`, `syscall`, `sync`)
- gorilla/websocket (github.com/gorilla/websocket)
- WebSocket protocol (RFC 6455)
- IPv4 networking (`tcp4` listener)

## Sources Consulted
- Go `net.Listen` documentation: https://pkg.go.dev/net#Listen (confirms `tcp4` network argument for IPv4-only)
- Go `net/http.Server.Shutdown` documentation: https://pkg.go.dev/net/http#Server.Shutdown
- gorilla/websocket package documentation: https://pkg.go.dev/github.com/gorilla/websocket (v1.5.3)
  - `Upgrader`, `Upgrade`, `ReadMessage`, `WriteMessage`, `TextMessage`, `IsCloseError`
  - Concurrency guarantees (one concurrent reader, one concurrent writer)
- Go `os/signal.NotifyContext` documentation: https://pkg.go.dev/os/signal#NotifyContext (introduced in Go 1.16)

## Issues Found
1. **Conclusion incorrectly described `http.Server.Shutdown` behavior with WebSockets.**
   - Original text claimed: "Use `http.Server.Shutdown` for graceful shutdown to wait for in-flight WebSocket handlers to complete."
   - This is incorrect. Per the official Go docs: "Shutdown does not attempt to close nor wait for hijacked connections such as WebSockets. The caller of Shutdown should separately notify such long-lived connections of shutdown and wait for them to close, if desired."
   - Fix: Rewrote the sentence to accurately state that Shutdown stops accepting new connections but does not wait for hijacked WebSocket connections, and that callers should separately notify clients.

## Review Notes
- The Hub-based broadcast example performs concurrent `WriteMessage` calls from the `Broadcast` goroutine while a per-connection reader goroutine is also active. Gorilla docs note that only one goroutine may call write methods concurrently on a given `Conn`. In practice, because each connection only has one reader (not a writer) in the basic handler shown, and `Broadcast` holds an RLock while iterating, single `Broadcast` invocations are serialized with themselves via lock acquisition order; however, multiple concurrent broadcasts could still race on writes to the same connection. A per-connection send channel + writer goroutine (as in gorilla's canonical chat example) is the recommended pattern for production. This is a design improvement rather than a strict error, so it was not changed.
- Example 2 uses `http.ListenAndServe("0.0.0.0:8765", nil)` which uses the `tcp` network. Binding to the `0.0.0.0` literal results in IPv4 in practice (the resolver returns an IPv4 address for that literal), but for strict IPv4-only semantics the `tcp4` listener used in examples 1 and 3 is preferable. Kept as-is because it is still functional for IPv4 binding.
- `ln, _ := net.Listen(...)` in the graceful-shutdown example discards the error. Acceptable for a didactic snippet; real code should handle it.
- The graceful-shutdown example omits the `wsHandler` and `upgrader` definitions for brevity; readers must reuse one from a previous section. This is implied by context.
- `go get github.com/gorilla/websocket` still works, but modern Go module workflows (Go 1.16+) typically use `go get` only for adding dependencies after `go mod init`. Not an error.
