# Validation Summary: How to Mock External APIs in Rust Tests with wiremock

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo
- Tokio
- reqwest
- serde / serde_json
- thiserror
- wiremock-rs
- HTTP API testing and mocking

## Sources Consulted
- wiremock 0.6.5 official docs: https://docs.rs/wiremock/latest/wiremock/
- wiremock 0.5.22 official docs for version-specific comparison: https://docs.rs/wiremock/0.5.22/wiremock/
- wiremock ResponseTemplate docs: https://docs.rs/wiremock/0.5.22/wiremock/struct.ResponseTemplate.html
- wiremock Respond trait docs: https://docs.rs/wiremock/0.5.22/wiremock/trait.Respond.html
- wiremock Mock and expectation docs: https://docs.rs/wiremock/0.5.22/wiremock/struct.Mock.html
- wiremock matcher docs: https://docs.rs/wiremock/0.5.22/wiremock/matchers/index.html
- reqwest 0.13.4 official docs: https://docs.rs/reqwest/latest/reqwest/
- reqwest RequestBuilder docs: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html
- reqwest ClientBuilder docs: https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html
- reqwest GitHub README / examples: https://github.com/seanmonstar/reqwest
- Local compile check with Rust/Cargo against wiremock 0.5.22, then wiremock 0.6.5 and reqwest 0.13.4.

## Issues Found
- The setup snippet used older dependency lines (`reqwest = "0.11"`, `wiremock = "0.5"`, `thiserror = "1"`). Updated them to current compatible lines: `reqwest = "0.13"`, `wiremock = "0.6"`, and `thiserror = "2"`.
- Updating to reqwest 0.13 requires the `query` feature for `RequestBuilder::query`, so the setup now enables `features = ["json", "query"]`.
- The header matching example said an unmatched request "fails". wiremock returns a 404 response when no mock matches, so the comment was corrected.
- The connection-refused example used `localhost:59999` and called it definitely unused. That is not guaranteed, so the example now binds an available local port and drops the listener before making the request.

## Review Notes
The core wiremock usage is technically correct: `MockServer::start`, matchers, `ResponseTemplate`, closure-based `Respond` implementations, `.expect(...)`, `.reset()`, delayed responses, and request-count verification match the official API. The examples are illustrative and split across files; a real project would still need the shown module paths (`myapi::github_client`) to match its actual crate name.
