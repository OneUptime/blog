# Validation Summary: How to Secure Rust APIs Against Common Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Axum
- Tokio
- SQLx
- PostgreSQL
- Argon2
- JSON Web Tokens
- validator
- tower-http CORS and headers
- governor rate limiting
- OWASP web/API security concepts

## Sources Consulted
- Axum 0.7 documentation and changelog: https://docs.rs/axum/0.7.9/axum/ and https://github.com/tokio-rs/axum/blob/main/axum/CHANGELOG.md
- Axum `FromRequestParts` documentation: https://docs.rs/axum/0.7.9/axum/extract/trait.FromRequestParts.html
- tower-http `CorsLayer` documentation: https://docs.rs/tower-http/0.5.2/tower_http/cors/struct.CorsLayer.html
- JSON Web Token RFC 7519: https://datatracker.ietf.org/doc/html/rfc7519
- jsonwebtoken `Validation` documentation: https://docs.rs/jsonwebtoken/9.3.1/jsonwebtoken/struct.Validation.html
- argon2 crate documentation: https://docs.rs/argon2/0.5.3/argon2/
- SQLx `QueryBuilder` and query API documentation: https://docs.rs/sqlx/0.7.4/sqlx/struct.QueryBuilder.html
- validator 0.16 documentation: https://docs.rs/validator/0.16.1/validator/
- governor 0.6 documentation: https://docs.rs/governor/0.6.3/governor/
- MDN `X-XSS-Protection` documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection

## Issues Found
- The dependency snippet omitted crates and features required by the examples. Added `async-trait`, `lazy_static`, `regex`, `thiserror`, `chrono`, and `tracing`; enabled `uuid` serialization; and added SQLx `uuid`, `chrono`, and `json` features.
- The SQLx `QueryBuilder` example built rows into a custom `User` type without deriving `sqlx::FromRow`. Added the derive and removed an unused `Row` import.
- The JWT validation example set issuer and audience checks but did not require those claims, or `nbf`, to be present. Added `required_spec_claims` entries for `exp`, `nbf`, `iss`, and `aud`.
- The Axum middleware examples used pre-0.7 generic `Next<B>` / `Request<B>` signatures. Updated them to Axum 0.7's non-generic `Next` and `axum::extract::Request` forms.
- The CORS example referenced `http::Method` without importing the `http` crate or module. Imported `Method` from `axum::http` and used it directly.
- The governor rate limiter type used an incorrect `NotKeyed` import path and omitted the middleware type parameter. Replaced the explicit type with governor's `DefaultDirectRateLimiter` alias.
- The security headers example enabled the deprecated `X-XSS-Protection` browser filter. Changed it to `0` and noted that CSP should be used for XSS protection.

## Review Notes
- Verified the non-database Rust snippets in a temporary Cargo project using the stated crate versions. SQLx `query!` / `query_as!` macros require a live `DATABASE_URL` or prepared offline metadata plus a matching schema, so those examples were reviewed structurally rather than compiled against an actual database.
- The article remains version-specific to Axum 0.7, tower-http 0.5, SQLx 0.7, jsonwebtoken 9, validator 0.16, argon2 0.5, and governor 0.6. Newer major versions exist for several crates and may require further updates in a future refresh.
