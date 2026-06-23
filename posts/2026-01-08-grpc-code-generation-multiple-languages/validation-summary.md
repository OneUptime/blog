# Validation Summary: How to Generate gRPC Code from Proto Files in Multiple Languages

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough of generating gRPC client/server code from `.proto` files across Go, Python, Node.js/TypeScript, Java, and Rust, plus build automation with Buf.

## Technologies Covered
- Protocol Buffers (proto3) and the `protoc` compiler
- gRPC
- Go (`protoc-gen-go`, `protoc-gen-go-grpc`)
- Python (`grpcio`, `grpcio-tools`)
- Node.js / TypeScript (`@grpc/grpc-js`, `grpc-tools`, `ts-proto`, `protobuf-ts`)
- Java (Maven `protobuf-maven-plugin`, Gradle `protobuf-gradle-plugin`, `grpc-java`)
- Rust (`tonic`, `prost`, `tonic-build`)
- Buf (`buf.yaml`, `buf.gen.yaml`, BSR, lint/breaking)
- Makefile-based automation

## Sources Consulted
- gRPC official quickstarts and docs (https://grpc.io/docs/languages/)
- Protocol Buffers releases & compiler docs (https://github.com/protocolbuffers/protobuf/releases, https://protobuf.dev)
- `protoc-gen-go` / `protoc-gen-go-grpc` docs (https://protobuf.dev/reference/go/go-generated/, https://grpc.io/docs/languages/go/)
- Go gRPC status/codes packages (https://pkg.go.dev/google.golang.org/grpc/status, https://pkg.go.dev/google.golang.org/grpc/codes)
- grpcio-tools / Python gRPC docs (https://grpc.io/docs/languages/python/)
- ts-proto README (https://github.com/stephenh/ts-proto) and protobuf-ts (https://github.com/timostamm/protobuf-ts)
- MDN BigInt reference (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) — non-integer argument throws `RangeError`
- tonic / tonic-build docs (https://docs.rs/tonic, https://docs.rs/tonic-build/0.10.2), prost-types Empty mapping
- Buf documentation for v2 config (https://buf.build/docs/configuration/v2/buf-yaml, https://buf.build/docs/configuration/v2/buf-gen-yaml)
- grpc-java / protobuf-maven-plugin / protobuf-gradle-plugin docs

## Issues Found
1. **Go server: invalid imports (compile errors).** The import block declared `"time"` (never used → Go "imported and not used" compile error) and used `status.Errorf(codes.NotFound, ...)` in `GetUser` without importing `google.golang.org/grpc/status` or `google.golang.org/grpc/codes`. Fixed by removing the unused `"time"` import and adding the two missing gRPC imports.

2. **TypeScript server: `BigInt(Date.now() / 1000)` runtime crash (two occurrences).** `Date.now() / 1000` yields a non-integer float, and `BigInt()` throws a `RangeError` when given a non-integer. Fixed to `BigInt(Math.floor(Date.now() / 1000))`, preserving the author's intent to produce a 64-bit seconds value.

3. **TypeScript client: missing `User` import (compile error).** `client.ts` used the `User` type in `Promise<User>` (twice) but only imported `UserServiceClient`. Added `User` to the import from the generated module.

4. **Rust `Cargo.toml`: missing dependencies.** The `main.rs` example uses `uuid::Uuid`, `chrono::Utc`, and `tokio_stream::wrappers::ReceiverStream`, but the provided `Cargo.toml` declared none of them, so the example would not compile. Added `tokio-stream = "0.1"`, `uuid = { version = "1", features = ["v4"] }`, and `chrono = "0.4"`.

5. **Buf gen comment mislabeled the plugin.** The `buf.gen.yaml` comment read `# TypeScript (using ts-proto)` while the configured plugin is `buf.build/community/timostamm-protobuf-ts`, which is the **protobuf-ts** library, not ts-proto (whose BSR plugin is `community/stephenh-ts-proto`). Corrected the comment to `# TypeScript (using protobuf-ts)`.

## Review Notes
- The Go example references a `generateID()` helper that is not defined; this is clearly an intentional placeholder for the reader to implement and was left as-is.
- Python's `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works and is widely used, so it was left unchanged, but a future update could modernize it.
- Version pins (protoc 25.1 / 3.25.1, grpc-java 1.60.0, tonic/prost 0.10/0.12, Buf v2 config) are mutually consistent and accurate for the late-2023/2024 timeframe of the post. They are not the newest releases as of mid-2026 but remain valid and functional; readers using `@latest` plugins will get newer versions.
- The `tonic-build` `.compile()` method is correct for tonic 0.10; note it was renamed to `.compile_protos()` in tonic 0.11+, so readers upgrading should adjust.
- The proto file, Buf v1->v2 config, protoc/grpc_tools commands, Java Maven/Gradle configuration, and the `google.protobuf.Empty` → Rust `()` mapping were all verified as correct.
