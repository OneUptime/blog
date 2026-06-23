# Validation Summary: How to Implement JWT Authentication Securely in Rust

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Rust
- JWT / JSON Web Tokens
- jsonwebtoken
- Axum
- axum-extra typed headers
- Tokio
- Serde
- Argon2 password hashing
- Validator
- HTTP cookies
- OAuth-style access and refresh token flows

## Sources Consulted
- jsonwebtoken documentation: https://docs.rs/jsonwebtoken/latest/jsonwebtoken/
- jsonwebtoken `Validation` documentation: https://docs.rs/jsonwebtoken/latest/jsonwebtoken/struct.Validation.html
- Axum `FromRequestParts` documentation: https://docs.rs/axum/latest/axum/extract/trait.FromRequestParts.html
- Axum `RequestPartsExt` documentation: https://docs.rs/axum/latest/axum/trait.RequestPartsExt.html
- axum-extra `TypedHeader` documentation: https://docs.rs/axum-extra/latest/axum_extra/struct.TypedHeader.html
- axum-extra feature documentation: https://docs.rs/axum-extra/latest/axum_extra/
- Argon2 crate documentation: https://docs.rs/argon2/latest/argon2/
- Validator crate documentation: https://docs.rs/validator/latest/validator/
- Rust Reference, const generics allowed types: https://doc.rust-lang.org/reference/items/generics.html#const-generics
- RFC 7519, JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519
- RFC 8725, JSON Web Token Best Current Practices: https://www.rfc-editor.org/info/rfc8725
- OWASP Web Security Testing Guide, Testing JSON Web Tokens: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
- MDN `Set-Cookie` documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- OneUptime linked article, Axum REST APIs: https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view
- OneUptime linked article, Rust API security: https://oneuptime.com/blog/post/2026-01-07-rust-api-security/view

## Issues Found
- The dependency block omitted crates used by later snippets: `tracing`, `validator`, and `anyhow`. Added them so the examples match the imports and macros used in the handlers.
- The token service used `Header::default()` and `Validation::default()` while the post warns readers to explicitly specify the JWT algorithm. Updated encoding and decoding to use `Algorithm::HS256`, `Header::new(Algorithm::HS256)`, and `Validation::new(Algorithm::HS256)`.
- The Axum authentication extractor imported `axum::async_trait` and used `#[async_trait]`. Axum's current `FromRequestParts` examples support `async fn` directly in the trait implementation, and the re-exported `async_trait` import is not needed. Removed the import and attributes.
- The middleware imported `StatusCode` but did not use it. Removed the unused import from that snippet.
- The role extractor used `RequireRole<const ROLE: &'static str>`, but stable Rust const generic parameters do not allow `&'static str`. Replaced it with a concrete `RequireAdmin` extractor and updated the protected route example accordingly.
- The cookie helper imported `header` but did not use it. Removed the unused import.

## Review Notes
- The examples are still intentionally partial and use placeholders for database queries, application error types, and application state. That is acceptable for a guide, but a full application would need to define those pieces.
- The post uses Axum 0.7 and axum-extra 0.9. Those APIs are internally consistent for the shown examples, but newer Axum versions exist, so a future refresh could update the dependency versions and snippets together.
- The refresh-token rotation section remains conceptual because the actual persistence and revocation logic is left as comments. A production implementation should store refresh token identifiers or families server-side and enforce reuse detection.
