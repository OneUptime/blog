# Validation Summary: How to Use unsafe for Zero-Copy Operations in Go

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Go
- `unsafe` package
- `reflect` string and slice headers
- `encoding/binary`
- `sync/atomic`
- cgo
- `go vet`
- Staticcheck

## Sources Consulted
- Go `unsafe` package documentation: https://pkg.go.dev/unsafe
- Go `reflect` package documentation for `StringHeader` and `SliceHeader`: https://pkg.go.dev/reflect
- Go 1.20 release notes: https://go.dev/doc/go1.20
- Go `cmd/vet` documentation: https://pkg.go.dev/cmd/vet
- Go `cmd/cgo` pointer passing rules: https://pkg.go.dev/cmd/cgo#hdr-Passing_pointers
- Staticcheck command documentation: https://pkg.go.dev/honnef.co/go/tools/cmd/staticcheck

## Issues Found
- The post said the `unsafe` package provides "three" essential types/functions while listing four. Changed this to "several".
- Benchmark examples assigned results to the blank identifier, which can let the compiler optimize away the work being benchmarked. Added package-level sink variables and assigned benchmark results to them.
- The legacy `reflect.StringHeader` / `reflect.SliceHeader` example constructed plain header structs. Official `unsafe` documentation says these headers should only be used as pointers to actual string or slice values. Reworked the example to point at real values and noted that these headers are deprecated.
- Several comments claimed the Go garbage collector may move data. Current Go documentation describes the real issue as `uintptr` having no pointer semantics: it does not keep objects live and would not be updated if an object moved. Updated the wording accordingly.
- The fixed-size memory pool used `[]byte` storage without documenting that pointers stored there are invisible to the garbage collector, and it did not align the backing buffer. Added the pointer-free constraint warning and aligned the buffer.
- A benchmark comparison also used the blank identifier for string conversion results. Added a package-level string sink.
- The integer-size pitfall used an `int64` read while discussing assumptions about `int`, and the "safe" version still used an unsafe aligned/native-endian read. Changed the unsafe example to use `int`, and changed the safe version to decode with `encoding/binary`.
- The stack-reference pitfall claimed returning `unsafe.Pointer(&x)` to a local variable is unsafe. In Go, returning an actual pointer can make the value escape. Changed the pitfall to returning a `uintptr`, which does hide the reference from the garbage collector.
- Unicode boundary test cases were empty strings. Replaced them with escaped Unicode test data.
- The complete JSON extractor searched for `"key":"` and therefore failed against the sample JSON, which contains whitespace after the colon. Updated the extractor to find `"key"`, skip JSON whitespace around the colon, and then read the quoted value.

## Review Notes
- The local environment does not have the Go toolchain installed, so code examples were not compiled locally. The review was performed against official Go documentation and static inspection.
- The JSON extractor remains a deliberately narrow example and is not a full JSON parser; it still returns raw escaped content rather than unescaping JSON string values.
