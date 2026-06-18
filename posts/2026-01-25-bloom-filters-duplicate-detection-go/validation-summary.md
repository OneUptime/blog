# Validation Summary: How to Use Bloom Filters for Duplicate Detection in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Bloom filters
- `github.com/bits-and-blooms/bloom/v3`
- Go `hash/fnv`
- Go `net/url`
- Go file I/O

## Sources Consulted
- Go package documentation for `github.com/bits-and-blooms/bloom/v3`: https://pkg.go.dev/github.com/bits-and-blooms/bloom/v3
- `bits-and-blooms/bloom` README and design notes: https://github.com/bits-and-blooms/bloom
- Go standard library documentation for `hash/fnv`: https://pkg.go.dev/hash/fnv
- Go standard library documentation for `net/url`: https://pkg.go.dev/net/url
- Go language specification, import declarations: https://go.dev/ref/spec#Import_declarations
- Bloom filter overview and false-positive behavior: https://en.wikipedia.org/wiki/Bloom_filter

## Issues Found
- The basic implementation imported `hash` but did not use it, which would make the Go snippet fail to compile. Removed the unused import.
- The persistence example imported `bytes` and `io` without using them and used `fmt.Println` without importing `fmt`. Replaced the unused imports with `fmt`.
- The production implementation claimed `github.com/bits-and-blooms/bloom/v3` is thread-safe. The library documentation says access from multiple goroutines is generally unsynchronized and requires caller-provided synchronization when modifications are possible. Removed the thread-safe claim and changed the `TestOrAdd` comment to describe it as a combined test/add operation.
- Several comments described negative membership results for unadded items as guaranteed in examples. Bloom filters can return false positives, so those comments were changed to note that unadded items usually return false but may return true.
- The URL deduplication code comments said `IsNew` returns true if a URL has not been seen before and that `TestOrAdd` returns true if already present. Because false positives are possible, those comments now say "definitely not seen before" and "probably already present."
- The comparison table listed Bloom filter memory as `O(1) fixed`. A Bloom filter is fixed-size after creation, but the required size scales with the expected item count for a target false-positive rate. Updated the table to `O(n) bits, fixed after creation`.

## Review Notes
- I could not compile the snippets locally because the `go` command is not installed in this environment. The review was performed against current official Go documentation and the current `bits-and-blooms/bloom/v3` API documentation.
- The custom `[]bool` implementation is useful for teaching, but it is not bit-packed like production Bloom filter implementations, so its memory usage is less representative than the library examples.
