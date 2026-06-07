# Validation Summary: How to Handle JSON Parsing with Codable in Swift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift (language) — Codable, Encodable, Decodable, property wrappers, async/await, enums with raw values
- Foundation — `JSONDecoder`, `JSONEncoder`, `Date`, `DateFormatter`, `Locale`, `URLSession`, `URLRequest`, `HTTPURLResponse`
- Swift Concurrency — `async`/`await`, `Result`, `DispatchQueue`
- JSON (data format), ISO 8601 date strings

## Sources Consulted
- Apple Developer documentation — Encoding and Decoding Custom Types: https://developer.apple.com/documentation/foundation/archives_and_serialization/encoding_and_decoding_custom_types
- Apple Developer documentation — `Codable`, `Encodable`, `Decodable` protocols: https://developer.apple.com/documentation/swift/codable
- Apple Developer documentation — `JSONDecoder`: https://developer.apple.com/documentation/foundation/jsondecoder (including `KeyDecodingStrategy.convertFromSnakeCase`, `DateDecodingStrategy.iso8601` / `.formatted`)
- Apple Developer documentation — `JSONEncoder`: https://developer.apple.com/documentation/foundation/jsonencoder (including `OutputFormatting.prettyPrinted` and `.sortedKeys`)
- Apple Developer documentation — `URLSession.data(from:)` / `data(for:)` async methods: https://developer.apple.com/documentation/foundation/urlsession/3767352-data
- Apple Developer documentation — `DecodingError` cases (`keyNotFound`, `typeMismatch`, `valueNotFound`, `dataCorrupted`): https://developer.apple.com/documentation/swift/decodingerror
- Swift Evolution SE-0166 (Swift Archival & Serialization) — original Codable proposal
- Established property-wrapper-with-default-source pattern (popularised by John Sundell): https://www.swiftbysundell.com/tips/default-decoding-values/

## Issues Found
- **Broken `Default` property wrapper in the "Default Values and Fallbacks" section.** The original code had two bugs:
  1. `init(from decoder:) throws` read `wrappedValue` on the right-hand side of `?? wrappedValue` before the stored property had been initialised. Swift requires properties to be initialised before being read, so this would not compile inside a struct initialiser.
  2. The `KeyedDecodingContainer` extension fell back to `Default(wrappedValue: T.self as! T)`. `T.self` is a metatype (`T.Type`), not an instance of `T`; this cast is nonsensical and would crash at runtime even if the surrounding code compiled. The property wrapper as written had no mechanism to know what default value to use when a JSON key was absent — the wrapped struct's `@Default var x: Bool = true` default is only consumed by Swift's memberwise initialiser, not by the synthesized `Decodable` conformance.

  **Fix:** Replaced the broken pattern with the standard protocol-based variant. A `DefaultValue` protocol supplies the default through an associated `Value` type and a `defaultValue` static property; the wrapper is parameterised by a `Source: DefaultValue` so it can fall back to `Source.defaultValue` both during decoding and when the key is absent. Source enums (`NotificationsEnabledDefault`, `ThemeDefault`, `FontSizeDefault`) are declared and the `Settings` struct uses `@Default<NotificationsEnabledDefault> var notificationsEnabled: Bool`, etc. This pattern compiles, works at runtime, and is the widely-recognised Swift idiom for the use case the section is teaching.

## Review Notes
- The polymorphic-JSON example calls both `decoder.container(keyedBy:)` and `decoder.singleValueContainer()` on the same `Decoder`. Foundation's `JSONDecoder` supports this and it is the conventional pattern for type-tagged polymorphic decoding, so I left it as-is. Readers porting to other Codable backends should be aware that the Decoder protocol does not strictly guarantee this works in all implementations.
- The `APIClient` example uses `URLSession.shared.data(from:)` and `.data(for:)` async variants, which require iOS 15 / macOS 12 / tvOS 15 / watchOS 8 or newer. The post does not call out the minimum deployment target. Not incorrect, but worth flagging for readers maintaining older codebases.
- The `Encoding Swift Objects to JSON` example shows a hard-coded illustrative output containing `"created_at" : "2024-01-15T10:30:00Z"` even though the code constructs the order with `createdAt: Date()`. The output is purely illustrative documentation; not a functional bug.
- All other code blocks (basic decoding, snake_case strategy, `CodingKeys`, nested objects, arrays, optionals, ISO8601 and `.formatted` date strategies, custom `init(from:)` / `encode(to:)`, polymorphic decoding via type tag, `DecodingError` catch-pattern matching, the generic API client, raw-value enum Codable, `JSONEncoder.outputFormatting = [.prettyPrinted, .sortedKeys]`, decoder/encoder reuse, and the `DispatchQueue.global` background-parsing helper) check out against current Swift Foundation behaviour.
