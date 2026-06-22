# Validation Summary: How to Fix json.Marshal Returning '{}' for Structs in Go

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Go
- Go standard library `encoding/json`
- Go reflection with `reflect`
- JSON marshaling and struct tags

## Sources Consulted
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `reflect` package documentation: https://pkg.go.dev/reflect

## Issues Found
- Corrected the expected output in the JSON tags example: the `name` field marshals from `Name: "John"`, not from the email value.
- Clarified nil pointer behavior: `json.Marshal` encodes nil pointers as `null`, not `"{}"`.
- Corrected the `omitempty` notes to match Go's documented empty values, including empty slices/maps, nil interfaces, and the special case for zero-length arrays.
- Fixed the custom `MarshalJSON` example so the broken method actually implements `json.Marshaler`, while the fixed example remains valid and avoids infinite recursion.
- Corrected the `interface{}` section and checklist to focus on exported fields of the concrete value, not whether the concrete type name itself is exported.
- Corrected the map-key explanation to match Go's documented supported key types: string types, integer types, and types implementing `encoding.TextMarshaler`.
- Updated the reflection debugging helper to avoid calling `Value.Interface()` on unexported fields, which would panic according to the `reflect` documentation.

## Review Notes
Go was not installed in the local environment, so examples were reviewed statically against the official Go documentation rather than compiled locally.
