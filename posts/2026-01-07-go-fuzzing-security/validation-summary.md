# Validation Summary: How to Use Fuzzing in Go for Security Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go built-in fuzz testing
- Go `testing` package
- `go test` fuzzing flags
- GitHub Actions
- OSS-Fuzz / ClusterFuzz
- Go race detector, AddressSanitizer, and MemorySanitizer

## Sources Consulted
- Go Fuzzing documentation: https://go.dev/doc/security/fuzz/
- Go `testing` package documentation: https://pkg.go.dev/testing
- Go command testing flags documentation: https://pkg.go.dev/cmd/go#hdr-Testing_flags
- Go command build and sanitizer flags documentation: https://pkg.go.dev/cmd/go
- Go Security Best Practices: https://go.dev/doc/security/best-practices
- OSS-Fuzz Go integration guide: https://google.github.io/oss-fuzz/getting-started/new-project-guide/go-lang/
- Effective Go: https://go.dev/doc/effective_go

## Issues Found
- The post used `-test.fuzzcachedir`, which is not a documented current `go test` flag. Replaced it with `GOCACHE=/tmp/go-cache`, since Go stores the generated fuzz corpus under the build cache.
- The indefinite fuzzing command used `-fuzztime=0`. Replaced it with the documented default form, `go test -fuzz=FuzzParseURL`, which runs until a failure, timeout, or interruption.
- The AES/CBC example's PKCS#7 unpadding helper accepted invalid padding. Updated it to reject empty input, zero padding, oversized padding, and inconsistent padding bytes.
- The supported fuzz types list omitted the documented aliases `byte` and `rune` in their canonical positions. Updated the list to show `int32/rune` and `uint8/byte`.
- The differential fuzzing example defined `CustomJSONMarshal` but called `CustomJSONUnmarshal`, which would not compile. Changed the helper to `CustomJSONUnmarshal`.
- The timeout example carried an unused result variable from the goroutine. Replaced it with blank identifier assignment to keep the snippet compile-safe.
- The sanitizer command labeled as AddressSanitizer used `-race`. Changed it to `-asan` and added a separate race detector command.
- The OSS-Fuzz example used the legacy `func Fuzz(data []byte) int` shape while the article focuses on native Go fuzzing. Replaced it with a native `func FuzzParser(f *testing.F)` target, matching OSS-Fuzz's native Go fuzzing support.

## Review Notes
Could not run local `go test` validation because the review environment does not have the `go` binary installed. The review was performed against current official Go and OSS-Fuzz documentation.
