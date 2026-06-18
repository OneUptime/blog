# Validation Summary: How to Extend Protocol Buffers with prost in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Protocol Buffers proto3
- prost
- prost-build
- prost-types
- serde
- gRPC

## Sources Consulted
- prost crate documentation: https://docs.rs/prost/latest/prost/
- prost-build Config documentation: https://docs.rs/prost-build/latest/prost_build/struct.Config.html
- prost-build compile_protos documentation: https://docs.rs/prost-build/latest/prost_build/fn.compile_protos.html
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers well-known types reference: https://protobuf.dev/reference/protobuf/google.protobuf/

## Issues Found
- The dependency snippet used older `prost`, `prost-types`, and `prost-build` versions (`0.12`). Updated them to the current `0.14` line shown in the official prost documentation.
- The dependency snippet omitted crates used later by the code examples. Added `chrono` for timestamp creation and `serde` with the `derive` feature for the custom derive example.
- The optional fields section stated that proto3 uses wrapper types for optional primitives. Updated the wording because modern proto3 supports explicit scalar presence with the `optional` modifier, while wrapper types are still common in existing schemas.
- The wrapper helper code used `prost_types::StringValue`, but prost generates wrapper fields such as `google.protobuf.StringValue` as `Option<String>` by default. Updated `bio_or_default` and `set_bio` to work with the generated `Option<String>` field.

## Review Notes
- The post assumes generated code is included under a `crate::myapp` module. That is a normal prost pattern, but a complete project would also need an `include!(concat!(env!("OUT_DIR"), "/myapp.rs"))` module declaration.
- prost-build requires `protoc` to be available unless a project configures an alternative source for it.
