# Validation Summary: How to Unmarshal JSON with Unknown Fields in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go `encoding/json`
- `json.Unmarshal`
- `json.Decoder.DisallowUnknownFields`
- `json.RawMessage`
- Go reflection
- `mapstructure`

## Sources Consulted
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `encoding/json.Decoder.DisallowUnknownFields` documentation: https://pkg.go.dev/encoding/json#Decoder.DisallowUnknownFields
- Go `encoding/json.RawMessage` documentation: https://pkg.go.dev/encoding/json#RawMessage
- `go-viper/mapstructure/v2` package documentation: https://pkg.go.dev/github.com/go-viper/mapstructure/v2
- Archived `mitchellh/mapstructure` repository status: https://github.com/mitchellh/mapstructure

## Issues Found
- The `mapstructure` example imported `github.com/mitchellh/mapstructure`, whose repository was archived in 2024. Updated the example to use the maintained `github.com/go-viper/mapstructure/v2` module, whose documentation describes it as the migration target with the same API.
- The `GetJSONTags` helper only accepted fields with explicit non-empty JSON tag names. That did not match Go's `encoding/json` behavior for exported struct fields without tags or fields tagged with options only, such as `json:",omitempty"`. Updated the helper to fall back to the Go field name when no explicit JSON tag name is present.

## Review Notes
The standard-library examples and explanations match the Go `encoding/json` documentation: unknown object keys are ignored by default when decoding into structs, and `Decoder.DisallowUnknownFields` reports unknown object keys. Code execution was not performed because the local environment does not have the `go` command installed; examples were reviewed against official documentation and package APIs.
