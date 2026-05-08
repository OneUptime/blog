# Validation Summary: Securing the OnData Method in Cilium Network Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium proxylib L7 parsers
- Cilium Envoy proxy integration
- Go protocol parsing
- Go testing, race detector, and fuzzing
- TCP stream framing

## Sources Consulted
- Cilium Envoy proxy parser guide: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium proxylib parser interface source: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxylib Reader source: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxylib operation and error constants: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/types.go
- Cilium Cassandra parser example: https://github.com/cilium/proxy/blob/main/proxylib/cassandra/cassandraparser.go
- Go command documentation for test flags: https://pkg.go.dev/cmd/go

## Issues Found
- The post used `reader.PeekSlice`, but the current Cilium proxylib `Reader` API exposes `PeekFull`, `Read`, `Length`, `Reset`, and `AdvanceInput`. Replaced `PeekSlice` examples with `PeekFull` and explicit buffers.
- The post stated and demonstrated `MORE` values as total data needed. Cilium proxylib defines `MORE N` as waiting for `N` additional bytes. Updated examples, the diagram, and troubleshooting text to use missing-byte counts.
- Several malformed-frame paths returned `DROP, 0`. Cilium treats zero-byte operations as parser errors, and malformed protocol data should be reported with `ERROR` and a proxylib error code. Updated those paths to return `ERROR_INVALID_FRAME_LENGTH`.
- Policy denial returned `DROP, 0`, which would not consume the denied frame. Updated the policy mismatch example to return `DROP, totalLen`.
- The length parsing example attempted to detect signed negative lengths after building an `int`, which is not reliable on 64-bit Go. Updated it to parse with `binary.BigEndian.Uint32`, cast to `int32` for signed-length validation, and guard invalid offsets before slicing.
- The introduction claimed an unchecked slice access could crash the Envoy proxy process. Cilium proxylib recovers parser panics and returns `PARSER_ERROR`, dropping the connection. Updated the claim to match proxylib behavior.

## Review Notes
The Go test commands and flags shown are valid, but the local environment did not have the `go` binary installed, so command behavior was verified against official Go command documentation instead of local `go help` output.
