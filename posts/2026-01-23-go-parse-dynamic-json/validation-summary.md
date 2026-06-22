# Validation Summary: How to Parse Dynamic JSON with Unknown Structure in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go `encoding/json` package
- JSON unmarshaling
- `map[string]interface{}` / `any`
- Type assertions and type switches
- `json.RawMessage`
- `json.Decoder`

## Sources Consulted
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go language specification, predeclared `any` alias: https://go.dev/ref/spec

## Issues Found
- The streaming decoder example used `decoder.More()` to loop over top-level concatenated JSON objects. Official `encoding/json` documentation defines `More()` as reporting whether there is another element in the current array or object being parsed. I changed the example to use the documented pattern of repeatedly calling `Decode` until `io.EOF`.
- The post stated that JSON numbers always unmarshal to `float64`. This is only true for numbers unmarshaled into `interface{}` values by default; typed struct fields can decode into numeric field types, and `Decoder.UseNumber` can decode interface numbers as `json.Number`. I narrowed the wording to the default `interface{}` case.

## Review Notes
- The local environment did not have the Go toolchain installed, so examples were reviewed statically against official documentation rather than compiled locally.
- Several examples omit `json.Unmarshal` error checks for brevity. This is common in short tutorials, but production code should check those errors consistently.
