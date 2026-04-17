# Validation Summary: How to Use Cap'n Proto Format in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (CapnProto format support)
- Cap'n Proto (binary serialization format and schema language)
- clickhouse-client CLI
- ClickHouse HTTP interface

## Sources Consulted
- ClickHouse official formats documentation: https://clickhouse.com/docs/en/interfaces/formats#capnproto
- ClickHouse server settings docs (`format_schema_path`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- Cap'n Proto language reference: https://capnproto.org/language.html
- Cap'n Proto history / Kenton Varda background: https://capnproto.org/faq.html

## Issues Found
- **Schema field names did not match SQL column names.** The original schema used camelCase (`eventId`, `eventType`, `userId`) while the SELECT and INSERT examples referenced snake_case columns (`event_id`, `event_type`, `user_id`). ClickHouse's CapnProto format matches schema field names to table column names exactly, so the examples would have failed with a column/field mismatch error. Changed the schema field names to `event_id`, `event_type`, `user_id` (keeping `ts` and `value` as-is) to align with the SQL statements, and added a short note to the Schema Requirement section clarifying that field names must match ClickHouse column names exactly. Snake_case identifiers are accepted by the capnp compiler (it prefers camelCase by style convention but does not reject snake_case).

## Review Notes
- The file ID `@0xb5d4f3b2a1e8c7d6;` is syntactically a valid 64-bit Cap'n Proto file ID. In real usage, developers should generate a unique ID via `capnp id`.
- The Bool -> UInt8 type mapping is historically correct and still works. Modern ClickHouse also has a native `Bool` type; CapnProto `Bool` can map to either depending on the target column type.
- The default `format_schema_path` value shown (`/var/lib/clickhouse/format_schemas/`) matches the standard server configuration shipped by ClickHouse.
- The format_schema setting syntax `'events:Event'` (filename without extension, colon, message/struct name) is correct.
- Kenton Varda, the creator of Cap'n Proto, was the primary author of Protocol Buffers v2 at Google — the post's attribution is accurate.
- The Cap'n Proto "zero-copy" characterization applies to reads by the Cap'n Proto library itself; ClickHouse still converts the CapnProto representation into its own columnar storage on INSERT, so the zero-copy benefit is primarily on the consumer side — the post correctly frames this.
