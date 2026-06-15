# Validation Summary: How to Build a Consul Service Registry Client in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Cargo
- Tokio
- Reqwest
- Serde and serde_json
- thiserror
- uuid
- HashiCorp Consul HTTP API
- Service discovery, service registration, health checks, and round-robin load balancing

## Sources Consulted
- HashiCorp Consul Agent Service HTTP API: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul Health HTTP API: https://developer.hashicorp.com/consul/api-docs/health
- Rust Cargo Book, `cargo new`: https://doc.rust-lang.org/cargo/commands/cargo-new.html
- Reqwest crate documentation: https://docs.rs/reqwest/
- Tokio crate documentation: https://docs.rs/tokio/
- Serde attributes documentation: https://serde.rs/attributes.html
- thiserror crate documentation: https://docs.rs/thiserror/
- uuid crate documentation: https://docs.rs/uuid/

## Issues Found
- The `ServiceInstance` struct did not match the response shape returned by Consul's `/v1/health/service/:service` endpoint. The post was deserializing the nested `Service` object but expected fields such as `ServiceID`, `ServiceName`, `ServiceAddress`, `ServicePort`, and `ServiceTags`; Consul's documented nested `Service` object uses `ID`, `Service`, `Address`, `Port`, and `Tags`. Updated the struct field renames so discovery returns actual service instances.
- `discover_service` returned an empty `Ok(Vec::new())` when no nested services could be parsed, which made the later `ServiceNotFound` example misleading. Added an empty-result check that returns `ConsulError::ServiceNotFound`.
- `deregister_service` ignored non-success HTTP statuses. Added a `DeregistrationFailed` error variant and status handling to match the registration path's error behavior.
- The text described Consul JSON fields as PascalCase, but the documented response includes fields such as `ID` and `Service`. Changed the wording to "capitalized JSON field names" for accuracy.

## Review Notes
- The combined Rust code from the post was compiled in a temporary Cargo project with the listed dependency versions using `cargo check`; it passed.
- The dependency versions in the post are not the newest major versions for all crates, but the APIs used remain valid for the versions shown.
