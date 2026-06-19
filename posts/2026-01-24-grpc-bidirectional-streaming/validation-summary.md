# Validation Summary: How to Handle Bidirectional Streaming in gRPC

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- gRPC bidirectional streaming
- Protocol Buffers / proto3
- Go
- grpc-go
- Go concurrency with goroutines and channels
- gRPC status codes and error handling
- bufconn-based gRPC testing

## Sources Consulted
- gRPC Go basics tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC core concepts: https://grpc.io/docs/what-is-grpc/core-concepts/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go stream concurrency guidance: https://github.com/grpc/grpc-go/blob/master/Documentation/concurrency.md
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/

## Issues Found
- The server chat example imported `context` without using it and used `fmt.Sprintf` without importing `fmt`. Replaced the unused import with `fmt`.
- The chat stream handler could deadlock after the receiver goroutine returned normally, because the sender goroutine waited on `client.done` and `client.done` was only closed after `wg.Wait()`. Added a `sync.Once`-guarded close helper and signal the sender when the receiver exits.
- The chat stream handler read and wrote `currentRoom` from different goroutines during cleanup and receive handling. Added a mutex-backed cleanup helper to avoid a data race.
- Repeated JOIN messages could leave a client registered in an old room while `currentRoom` pointed to the new one. Updated JOIN handling to leave the previous room when switching rooms.
- The collaborative editing example referenced document helper methods and document storage that were not defined. Added `documents` state to `ChatServer` and included `getOrCreateDocument`, `addEditor`, and `removeEditor` helpers.
- The collaborative editing sender goroutine exited immediately because `editor` was nil when the goroutine started. Changed the handler to read the first operation, initialize the document/editor, and then start the sender and receiver goroutines.
- The collaborative editing `replace` operation recursively called `applyOperation` while holding the same mutex, which would deadlock. Reworked the operation to update the rune slice while holding the lock once.
- The collaborative editing content operations mixed byte length with rune storage and did not guard against negative positions. Updated insert/delete/replace logic to use rune lengths and validate positions.
- The client and test examples used deprecated grpc-go APIs: `grpc.Dial`, `grpc.DialContext`, `grpc.WithInsecure`, `grpc.WithBlock`, and `grpc.WithTimeout`. Updated them to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())`; the bufconn test uses `passthrough:///bufnet` with a custom dialer.
- The backpressure snippet returned `status.Error(codes.ResourceExhausted, ...)` without importing `codes` and `status`. Added the missing imports.
- The reconnecting client lost the previous room ID when replacing the embedded `ChatClient`, and its reset comment did not match behavior. Saved the previous room before replacement and reset the retry delay to the configured initial delay.

## Review Notes
- The proto3 enum compiles because its first value is zero. For future schema evolution, protobuf guidance recommends an explicit `_UNSPECIFIED` or `_UNKNOWN` zero value instead of a semantic default such as `TEXT`.
- The examples are illustrative and omit production concerns such as authentication, per-room authorization, persistence, and a complete operational transformation algorithm.
