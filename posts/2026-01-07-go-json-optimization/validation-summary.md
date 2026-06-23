# Validation Summary: How to Optimize JSON Serialization in Go with sonic or easyjson

## Status
validated

## Post Type
Tutorial / performance optimization guide

## Technologies Covered
- Go
- encoding/json
- sonic
- easyjson
- Gin
- Echo
- Fiber
- sync.Pool

## Sources Consulted
- Go encoding/json package documentation: https://pkg.go.dev/encoding/json
- ByteDance sonic README and requirements: https://github.com/bytedance/sonic
- sonic API documentation: https://pkg.go.dev/github.com/bytedance/sonic
- sonic encoder package documentation/source: https://pkg.go.dev/github.com/bytedance/sonic/encoder
- sonic decoder package documentation/source: https://pkg.go.dev/github.com/bytedance/sonic/decoder
- easyjson README and CLI options: https://github.com/mailru/easyjson
- Gin render package documentation: https://pkg.go.dev/github.com/gin-gonic/gin/render
- Echo JSONSerializer documentation/source: https://pkg.go.dev/github.com/labstack/echo/v4
- Fiber configuration documentation/source: https://docs.gofiber.io/api/fiber

## Issues Found
- The standard-library limitations section incorrectly stated that `encoding/json` has no streaming support for complex structures. Updated the wording to clarify that streaming is available through `json.Encoder` and `json.Decoder`, but requires explicit streaming patterns.
- The sonic installation section listed Go 1.16 as the minimum. Updated it to Go 1.18 or higher, with the arm64 Go 1.20 caveat, matching current sonic requirements.
- The sonic configuration example used a non-current `encoder.NewEncoder(nil)` / `SetSortMapKeys` API shape. Replaced it with `encoder.Encode(cfg, encoder.SortMapKeys)` and corrected the HTML-escaping note.
- The easyjson package-generation command used an undocumented package wildcard form. Replaced it with `easyjson -all -pkg ./models`, matching the generator's package mode.
- The benchmark setup code block imported packages it did not use. Removed the unused imports from that block.
- The standard-library limitations code block referenced `User` without defining it in the snippet. Added a minimal `User` struct.
- The custom streaming encoder emitted array items without commas, producing invalid JSON. Added first-item tracking and comma writes between elements.
- The sonic streaming example read the entire file into memory and passed a byte slice to `decoder.NewStreamDecoder`, which expects an `io.Reader`. Updated it to use `sonic.ConfigDefault.NewDecoder(file)` and handle `io.EOF`.
- The Gin example imported `github.com/gin-gonic/gin/render` without using it. Removed the unused import.
- The Echo serializer wrote responses through `c.Blob(http.StatusOK, ...)`, which would override the status set by `c.JSON`. Updated it to write to `c.Response()` and preserved Echo's response status handling.
- The Echo deserializer allocated from `ContentLength` and ignored partial read errors, which can fail when the length is unknown or the read is short. Replaced it with `io.ReadAll`.
- The sonic error-handling example used `syntaxErr.Pos`, which is not portable across sonic's native and compatibility error implementations. Changed it to wrap the syntax error directly.

## Review Notes
The benchmark numbers remain illustrative and should still be treated as workload- and environment-dependent. I could not run `go test` locally because the container does not have the Go toolchain installed, so verification was performed against official documentation and upstream source.
