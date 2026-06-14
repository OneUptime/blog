# Validation Summary: How to Build a WebSocket Chat App with Rooms in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go modules
- net/http
- Gorilla WebSocket
- WebSocket ping/pong handling
- Browser WebSocket API
- JSON

## Sources Consulted
- Go Modules Reference: https://go.dev/ref/mod
- Go tutorial, "Create a Go module": https://go.dev/doc/tutorial/create-module
- Gorilla WebSocket package documentation: https://pkg.go.dev/github.com/gorilla/websocket
- Gorilla WebSocket chat example: https://github.com/gorilla/websocket/blob/main/examples/chat/README.md

## Issues Found
- The original sample stored the current room on `Client` and read it from `readPump` while the hub goroutine wrote it during join and leave handling. That introduced a data race and weakened the claim that hub-channel coordination avoids locks and race conditions. I changed message broadcasting so the client sends a `ClientMessage` to the hub, and the hub resolves the sender's current room inside its event loop.
- The original `writePump` batched queued JSON messages into one WebSocket text frame separated by newline characters. The browser frontend calls `JSON.parse(event.data)`, so a batched frame containing multiple JSON objects would fail to parse. I removed the batching so each outbound JSON message is sent as its own WebSocket message.

## Review Notes
The Gorilla WebSocket APIs used in the tutorial are current and documented. The code follows the library's concurrency guidance of one reader goroutine and one writer goroutine per connection after the room-state fix. The local environment did not have the Go toolchain installed, so command execution and compilation were verified by source review against official documentation rather than by running `go run`.
