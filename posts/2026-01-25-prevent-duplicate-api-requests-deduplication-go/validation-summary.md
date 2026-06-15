# Validation Summary: How to Prevent Duplicate API Requests with Deduplication in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- net/http
- Request deduplication
- Idempotency keys
- SHA-256 request fingerprinting
- Redis
- go-redis/v9
- Distributed locks

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go io package documentation: https://pkg.go.dev/io
- Go crypto/rand package documentation: https://pkg.go.dev/crypto/rand
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis distributed locks documentation: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- Redis Go client guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis/v9 API documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
- The HTTP middleware recorder wrote to the underlying `http.ResponseWriter` while recording, and then the middleware wrote the same response again after `Process` returned. I changed the recorder to buffer headers, status, and body only, then write once after deduplication completes.
- The recorder did not implement `Header()` and did not capture handler-set headers. I changed cached headers to use `http.Header`, implemented `Header()`, and replayed all header values.
- The recorder could leave `StatusCode` as zero when a handler only called `Write`. I updated `Write` to default the status to `http.StatusOK`, matching `net/http` behavior.
- Concurrent waiters could return `nil` as a successful cached duplicate if the original handler failed and no response was cached. I added an explicit error path when no cached response exists after waiting.
- The Redis lock example used an unconditional `DEL`, which can delete another instance's lock after the original lock expires. I changed it to use a random lock value and an atomic Lua compare-and-delete release pattern consistent with Redis locking guidance.
- The Redis example ignored JSON marshal and Redis `SET` errors. I added error handling so the example does not silently report success when caching fails.
- The content-based deduplication snippet used `io.ReadAll`, `io.NopCloser`, and `bytes.NewReader`, but the cumulative import list omitted `bytes` and `io`. I added the missing imports.

## Review Notes
The code examples are still presented as tutorial snippets rather than a single copy-pasteable program. Local Go compilation could not be run because the `go` binary is not installed in this workspace, so validation was performed against official Go, Redis, and go-redis documentation plus source-level review.
