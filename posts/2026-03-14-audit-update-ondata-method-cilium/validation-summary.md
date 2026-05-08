# Validation Summary: Auditing the OnData Method in Cilium Network Security

## Status
validated

## Post Type
Security audit guide

## Technologies Covered
- Cilium proxylib
- Cilium L7 parser `OnData` methods
- Go
- Go fuzzing and test tooling
- gosec
- Unix `grep`

## Sources Consulted
- Cilium documentation: Envoy and proxylib parser development, https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium proxy source: `proxylib/proxylib/parserfactory.go`, https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxy source: `proxylib/proxylib/reader.go`, https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy source: R2D2 parser example, https://github.com/cilium/proxy/blob/main/proxylib/r2d2/r2d2parser.go
- Cilium proxy source: Cassandra parser example, https://github.com/cilium/proxy/blob/main/proxylib/cassandra/cassandraparser.go
- Go command documentation for `go test` flags, https://go.dev/cmd/go/
- Go fuzzing documentation, https://go.dev/doc/security/fuzz/
- gosec official repository, https://github.com/securego/gosec

## Issues Found
- The post used `reader.PeekSlice`, but Cilium proxylib `Reader` exposes `Length`, `PeekFull`, `Read`, `Reset`, and `AdvanceInput`; it does not expose `PeekSlice`. Updated examples to use `PeekFull`.
- The post did not clarify that the `*proxylib.Reader` examples are for `ReaderParser`, not the primary `Parser` interface that receives `data [][]byte` and `endStream`. Added that clarification.
- The return-value contract table incorrectly stated that `DROP` and `ERROR` should use `0`, and treated `MORE` as an absolute byte count greater than available data. Updated the table and examples to match proxylib semantics: `MORE` requests additional bytes, `DROP` drops a byte count, and `ERROR` carries a proxylib error code.
- The invalid-length examples returned `DROP, 0`; Cilium documentation describes malformed framing as an `ERROR` case. Updated those examples to return `proxylib.ERROR` with `ERROR_INVALID_FRAME_LENGTH`.
- The state-assignment `grep` command used `\s`, which is not portable in basic `grep`. Replaced it with the POSIX character class `[[:space:]]`.
- The integer-safety example used manual shifts into `int` and described an imprecise overflow scenario. Updated it to use `binary.BigEndian.Uint32` and to validate the network-derived length before converting and adding the header length.

## Review Notes
The verification commands for `go test`, coverage, fuzzing, and `gosec` are valid patterns, assuming the target parser package and fuzz target exist and `gosec` is installed. The `grep`-based discovery commands are useful audit aids but should not be treated as complete static analysis.
