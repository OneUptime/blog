# Validation Summary: How to Configure gRPC Servers with IPv6 in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- gRPC
- IPv6
- Tonic
- Tokio
- Protocol Buffers
- `grpcurl`
- TLS

## Sources Consulted
- Tonic crate docs: https://docs.rs/crate/tonic/latest
- `tonic-build` docs: https://docs.rs/tonic-build/latest/tonic_build/
- `tonic::transport` docs: https://docs.rs/tonic/latest/tonic/transport/
- `tonic::Request` docs: https://docs.rs/tonic/latest/tonic/struct.Request.html
- `tonic-prost` crate docs: https://docs.rs/crate/tonic-prost/latest
- `tonic-prost-build` crate docs: https://docs.rs/crate/tonic-prost-build/latest
- Cargo target layout reference: https://doc.rust-lang.org/cargo/reference/cargo-targets.html
- Cargo package layout guide: https://doc.rust-lang.org/cargo/guide/project-layout.html
- `grpcurl` upstream documentation: https://github.com/fullstorydev/grpcurl
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- OneUptime site link check: https://oneuptime.com

## Issues Found
- The dependency block was outdated for current Tonic releases. The post used `tonic = "0.11"`, `prost = "0.12"`, and `tonic-build = "0.11"`, but current Tonic documentation uses the `0.14.x` line, `tonic-prost` for the Prost runtime codec, and `tonic-prost-build` for protobuf code generation. I updated the dependency examples and switched `build.rs` to `tonic_prost_build::compile_protos(...)`.
- The TLS example used transport TLS types without enabling a Tonic TLS feature. I updated the `tonic` dependency to enable `tls-ring`, which is required for the `ServerTlsConfig` and `ClientTlsConfig` APIs shown in the post.
- The sample file paths did not match the Cargo commands. The post showed `src/server.rs` and `src/client.rs`, but `cargo run --bin server` and `cargo run --bin client` require binaries in `src/bin/` unless `[[bin]]` targets are declared explicitly. I corrected the paths to `src/bin/server.rs` and `src/bin/client.rs`.
- The plain gRPC client targeted `2001:db8::1`, which RFC 3849 reserves for documentation and which did not match the local test flow in the post. I changed the example client endpoint to `http://[::1]:50051` so it can connect to the sample server running on the same machine.
- The TLS code block was not self-consistent as written. It referenced `Channel`, `ClientTlsConfig`, `GreeterClient`, `GreeterServer`, `MyGreeter`, and the generated protobuf module without defining or importing them, and it did not include a `main` function for the advertised binary file. I added the missing imports, generated module, service implementation, and a `main` entry point.
- The `grpcurl` commands assumed server reflection, but the sample Tonic server does not register the reflection service. I replaced them with commands that use the local `.proto` file, which matches the upstream `grpcurl` documentation for working without reflection.
- The server comment said it was extracting a client IPv6 address from request extensions. `tonic::Request::remote_addr()` reports an optional remote socket address from the transport, and it is not guaranteed to be IPv6 in all deployments. I corrected the comment to describe what the API actually provides.

## Review Notes
- A scratch Cargo project was compiled against current crates during review, and `cargo check --bins` succeeded after applying the version, layout, and TLS fixes reflected in the post.
- This environment did not have `protoc` installed, so the compile check used a vendored `protoc` in the scratch project. Readers still need a working protobuf compiler setup for `tonic_prost_build::compile_protos(...)`.
- The TLS client example still uses `2001:db8::1` and `example.com` as deployment placeholders. In real use, the IPv6 address must be the actual server address and the TLS domain name must match the certificate SAN.
