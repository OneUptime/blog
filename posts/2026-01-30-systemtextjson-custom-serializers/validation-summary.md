# Validation Summary: How to Build Custom Serializers with System.Text.Json

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- C# (C# 11+ for UTF-8 string literals)
- .NET (6+)
- System.Text.Json
- `JsonConverter<T>` and `JsonConverterFactory`
- `Utf8JsonReader` / `Utf8JsonWriter`
- `JsonDocument`
- ASP.NET Core (`AddJsonOptions`)
- xUnit (for the testing section)

## Sources Consulted
- Microsoft Docs: How to write custom converters for JSON serialization in .NET — https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
- Microsoft Docs: `JsonConverter<T>` class — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonconverter-1
- Microsoft Docs: `JsonConverterFactory` class — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonconverterfactory
- Microsoft Docs: `Utf8JsonReader` struct — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.utf8jsonreader
- Microsoft Docs: `Utf8JsonWriter` class — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.utf8jsonwriter
- Microsoft Docs: `JsonDocument.ParseValue` — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsondocument.parsevalue
- Microsoft Docs: `JsonNamingPolicy` — https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonnamingpolicy
- Microsoft Docs: `DateTimeOffset.ToUnixTimeSeconds` — https://learn.microsoft.com/en-us/dotnet/api/system.datetimeoffset.tounixtimeseconds
- Microsoft Docs: UTF-8 string literals (C# 11) — https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-11.0/utf8-string-literals

## Issues Found
No technical issues found.

The Unix timestamp arithmetic in the test fixtures was verified:
- `1769774400` correctly maps to `2026-01-30 12:00:00 UTC` (20483 days since epoch × 86400 + 43200 seconds).
- `1609459200` correctly maps to `2021-01-01 00:00:00 UTC`.
- `-86400` correctly maps to `1969-12-31 00:00:00 UTC`.

All API surface usage (`JsonConverter<T>.Read/Write`, `JsonConverterFactory.CanConvert/CreateConverter`, `Utf8JsonReader.ValueTextEquals`, `Utf8JsonReader.ValueSpan`, `Utf8JsonReader.HasValueSequence`, `Utf8JsonWriter.WriteNumber(ReadOnlySpan<byte>, double)`, `JsonDocument.ParseValue(ref Utf8JsonReader)`, `DateTimeOffset.ToUnixTimeSeconds()`) matches the official System.Text.Json API. The polymorphic converter pattern is also correct: the inner `JsonSerializer.Serialize/Deserialize` calls use the *concrete* runtime type, and the default `JsonConverter<Notification>.CanConvert` returns `false` for derived types, so no infinite recursion occurs.

## Review Notes
- The `Event.ModifiedAt` example applies `[JsonConverter(typeof(UnixTimestampConverter))]` (a `JsonConverter<DateTime>`) directly to a `DateTime?` property. In modern .NET, System.Text.Json handles this via an internal nullable wrapper, so it does work — and the very next section explains the cleaner approach using a dedicated `NullableUnixTimestampConverter` or factory. Not an error, just a teaching-progression choice.
- The `UnixTimestampConverterFactory` references `NullableUnixTimestampDateTimeOffsetConverter`, but the class body is not shown. Readers can infer it from the `NullableUnixTimestampConverter` pattern shown earlier.
- The `Point3DConverter` uses `"x"u8.ToArray()` (UTF-8 string literals), which requires C# 11+ and .NET 7+. Readers on earlier targets would need `Encoding.UTF8.GetBytes("x")` instead.
- The `EmailConverter.Read` returns `null!` for null tokens despite the type being a reference type — `return null;` would be cleaner, but `null!` is functionally equivalent and the null-forgiveness operator is harmless here.
- The `EncryptedStringConverterFactory` registration code calls `builder.Services.BuildServiceProvider()` inside `AddJsonOptions` to resolve `IEncryptionService`. This builds a *second* service provider, which is a known anti-pattern (it can produce duplicate singletons and bypass scope validation). A production codebase would typically resolve the service via `IConfigureOptions<JsonOptions>` instead. The code as shown works for demonstration but is worth flagging for production use.
- All timestamp arithmetic and code examples are correct against current System.Text.Json API surface.
