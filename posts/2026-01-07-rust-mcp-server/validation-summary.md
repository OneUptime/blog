# Validation Summary: How to Build an MCP Server in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio
- Serde / serde_json
- JSON-RPC 2.0
- Model Context Protocol (MCP)
- Claude Desktop MCP configuration
- async-trait
- reqwest
- SQLx
- Cargo features and optional dependencies

## Sources Consulted
- Model Context Protocol 2025-11-25 lifecycle specification: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
- Model Context Protocol 2025-11-25 transports specification: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- Model Context Protocol 2025-11-25 schema reference: https://modelcontextprotocol.io/specification/2025-11-25/schema
- Model Context Protocol tools specification: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- Model Context Protocol resources specification: https://modelcontextprotocol.io/specification/2025-03-26/server/resources
- Model Context Protocol prompts specification: https://modelcontextprotocol.io/specification/2025-03-26/server/prompts
- Serde field attributes documentation: https://serde.rs/field-attrs.html
- async-trait crate documentation: https://docs.rs/async-trait
- Tokio `AsyncBufReadExt` documentation: https://docs.rs/tokio/latest/tokio/io/trait.AsyncBufReadExt.html
- Tokio `BufReader` documentation: https://docs.rs/tokio/latest/tokio/io/struct.BufReader.html
- Rust `std::path::Path` documentation: https://doc.rust-lang.org/std/path/struct.Path.html
- Cargo features documentation: https://doc.rust-lang.org/cargo/reference/features.html
- reqwest crate documentation: https://docs.rs/reqwest/
- SQLx crate documentation: https://docs.rs/sqlx/latest/sqlx/

## Issues Found

1. **Missing dependencies for shown code**: The Rust snippets used `async_trait::async_trait` and `url::Url`, but `Cargo.toml` did not include `async-trait` or `url`. Added both dependencies and wired `url` into the optional `http` feature.

2. **Outdated crate versions**: The post used older `reqwest` and SQLx versions. Updated `reqwest` to the current 0.13 line and SQLx to the 0.8 line, which is current enough for the shown API and compatible with the Rust compiler used for validation. Also changed optional dependency features to explicit `dep:` entries per Cargo feature guidance.

3. **Incorrect MCP protocol version**: The `initialize` response hardcoded `2024-11-05`. Updated it to the current stable MCP protocol version checked during review, `2025-11-25`.

4. **JSON-RPC notification handling**: The server responded to every parsed message, including notifications such as `notifications/initialized`. MCP lifecycle documentation requires the client to send that notification after initialization, and JSON-RPC notifications should not receive responses. Added notification handling that returns no response.

5. **Incorrect JSON field names for MCP content**: Image and embedded resource content used Rust's `mime_type` field name on the wire. MCP schemas use `mimeType`. Added Serde renames and skipped absent optional resource content fields.

6. **Parse-error response shape**: The response type skipped the `id` field when absent, which would omit `id` on parse errors. JSON-RPC error responses for parse errors should serialize `id: null`. Removed the skip attribute from the response `id` field.

7. **RwLock guard serialization examples**: The `resources/list` and `prompts/list` examples attempted to move out of a read guard inside `serde_json::json!`. Changed them to serialize references.

8. **Await while holding tool registry lock**: The `tools/call` handler held the tools read lock across the awaited tool call. Changed it to clone the `Arc` handler before awaiting.

9. **File allowlist path handling**: The file reader stored allowlisted directories as strings and read the original path after canonicalizing it. Changed the allowlist storage to `PathBuf` and read from the canonicalized path that was checked.

10. **HTTP method mismatch and host allowlist weakness**: The HTTP tool schema advertised `GET` and `POST`, but the implementation always used GET. Added method dispatch. The host allowlist also used a raw suffix check that could match unrelated hostnames; changed it to exact host or subdomain matching.

11. **Minor compile warning in database example**: The SQLx row conversion placeholder bound an unused variable. Renamed it to `_row`.

## Review Notes
- The corrected Rust snippets were extracted into a temporary crate and checked with `cargo check --all-features`. The check passed with only expected warnings for optional example structs and capability structs that are defined but not constructed in the minimal sample.
- The database example remains intentionally simplified: it demonstrates where a read-only query tool would fit, but the placeholder row-to-JSON conversion still returns empty objects.
- The Claude Desktop configuration shape with `mcpServers`, `command`, `args`, and `env` is consistent with common MCP stdio server configuration examples.
