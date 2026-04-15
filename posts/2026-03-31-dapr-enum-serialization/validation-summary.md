# Validation Summary: How to Handle Enum Serialization in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (polyglot pub/sub, gRPC)
- .NET / C# (System.Text.Json, JsonStringEnumConverter, Dapr .NET SDK)
- Go (encoding/json, custom UnmarshalJSON)
- Python (enum.Enum with str mixin, dataclasses, json module)
- Protocol Buffers (proto3 enum definitions)

## Sources Consulted
- Microsoft System.Text.Json documentation for `JsonStringEnumConverter` behavior and `JsonNamingPolicy` — https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties
- Microsoft documentation on `[JsonConverter]` attribute precedence over global options — https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
- Dapr .NET SDK `DaprClientBuilder.UseJsonSerializationOptions` — https://docs.dapr.io/developing-applications/sdks/dotnet/
- Go `encoding/json` package documentation for custom `UnmarshalJSON` — https://pkg.go.dev/encoding/json
- Python `enum` module documentation for `str, Enum` pattern — https://docs.python.org/3/library/enum.html
- Protocol Buffers Language Guide (proto3 enum semantics and forward compatibility) — https://protobuf.dev/programming-guides/proto3/#enum

## Issues Found
- **Incorrect enum integer value in intro paragraph:** The post stated that `.NET serializes `OrderStatus.Processing` as `2``, but given the enum definition in the code (`Pending=0, Processing=1, Fulfilled=2, Cancelled=3, Refunded=4`), `Processing` is at index `1`, not `2`. Fixed `2` to `1` in the introductory paragraph.

## Review Notes
- The .NET section applies `[JsonConverter(typeof(JsonStringEnumConverter))]` on the enum types (no naming policy = PascalCase output) AND registers a global `JsonStringEnumConverter(JsonNamingPolicy.CamelCase)` which would produce camelCase. Since attribute-level converters take precedence over global converters in System.Text.Json, the code works correctly (PascalCase, matching Go/Python expectations). However, any new enum added without the attribute would serialize as camelCase, which could cause cross-language mismatches. A future improvement could make this consistent by either removing the CamelCase naming policy from the global converter or noting the precedence behavior.
- The `[property: JsonConverter(typeof(JsonStringEnumConverter))]` attributes on the `OrderEvent` record properties are redundant when the enum types already carry the attribute, but this is harmless and arguably more explicit.
- The Go "Handling Unknown Enum Values Gracefully" section redefines `OrderStatus` as a struct (instead of the earlier `string` type alias). This is intentional to show a different pattern but could confuse readers who expect continuity. Both approaches are valid Go patterns.
