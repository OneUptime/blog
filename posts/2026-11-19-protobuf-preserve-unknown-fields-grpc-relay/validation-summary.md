# Validation Summary: Preserve Unknown Protobuf Fields in gRPC Relays Through Older Services

## Status
validated

## Post Type
Technical guide with an executable Python serialization demonstration.

## Technologies Covered
- Protocol Buffers (proto3), binary serialization, unknown fields, and schema evolution
- Python generated Protobuf messages and `google.protobuf.json_format`
- gRPC and the `grpcio-tools` compiler
- JSON conversion and relay compatibility testing

## Sources Consulted
- Proto3 language guide: unknown-field retention, message copying, default values, and deleted field reservations: https://protobuf.dev/programming-guides/proto3/
- ProtoJSON format and schema evolution constraints: https://protobuf.dev/programming-guides/json/
- Compiler/runtime compatibility, including Python-specific guarantees: https://protobuf.dev/support/cross-version-runtime-guarantee/
- Python generated code guide: compiler flags, generated module names, packages, and message APIs: https://protobuf.dev/reference/python/python-generated/
- Python message API reference: https://googleapis.dev/python/protobuf/latest/google/protobuf/message.html
- Python JSON formatting API reference: https://googleapis.dev/python/protobuf/latest/google/protobuf/json_format.html
- gRPC Python quick start and compiler invocation: https://grpc.io/docs/languages/python/quickstart/
- Noncanonical serialization: https://protobuf.dev/programming-guides/serialization-not-canonical/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Executed the compiler invocation and the exact Python example extracted from the README in a temporary virtual environment: Python 3.13.12, grpcio-tools 1.85.3, protobuf 7.36.2, libprotoc 35.1, and the upb runtime backend. Both schemas compiled and all four original assertions passed.
- Additional execution checks confirmed that editing `id` after `CopyFrom` retains `region`, and that parsing a new-schema JSON key with `ignore_unknown_fields=True` discards that field.
- The README required no changes. Its schemas, compiler command, and Python APIs are consistent with the official documentation; no deprecated API usage was identified.
- Distinct Protobuf packages prevent the two `Order` definitions from colliding in the descriptor namespace. The Python module names come from the proto filenames, rather than the package declarations.
- Binary parsing and serialization and same-type `CopyFrom` preserve unknown fields. Reconstructing only known fields and serializing through old-schema JSON lose the added field. Ignoring unknown JSON keys does not preserve them as binary unknown fields.
- Semantic field assertions are appropriate because Protobuf serialization is not canonical. Deleted field numbers should remain reserved, and reservations of names protect against accidental name reuse in text-based contracts.
- All documentation links resolve to relevant official resources, and the author profile resolves. The API reference pages carry an older documentation version label; the current programming guides were also consulted.
- The demonstration tests serialization without an RPC server. It does not establish compatibility for every deployed runtime, gateway, queue, or persistence layer; the post correctly calls for testing the actual path and compiler/runtime combination.
