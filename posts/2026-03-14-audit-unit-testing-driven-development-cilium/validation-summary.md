# Validation Summary: Auditing Unit Test Practices for Cilium L7 Parser Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium proxylib L7 parser development
- Go testing
- Go fuzzing
- Go coverage tooling
- Shell commands for test auditing

## Sources Consulted
- Go command documentation: https://go.dev/cmd/go/
- Go fuzzing documentation: https://go.dev/doc/security/fuzz/
- Cilium proxy development documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium proxy `Parser` and `ReaderParser` interfaces: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxy `Reader` implementation: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy connection dispatch logic: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/connection.go

## Issues Found
- The assertion-quality examples used `proxylib.NewTestReader(data)`, which is not the current Cilium proxylib reader constructor. Updated the examples to use `proxylib.NewReader([][]byte{...}, false)` and pass `&reader` to `OnData`, matching the current `ReaderParser` interface.

## Review Notes
- The `grep` and `awk` commands are useful audit heuristics, not complete static analysis. The post already frames the assertion-count command as a rough metric.
- The security checklist is necessarily protocol-dependent. For protocols with unsigned length fields, "negative length" should be interpreted as malformed encodings that decode incorrectly if handled with signed arithmetic.
- I could not run local `go help` or `go test` because the `go` binary is not installed in this environment, so Go CLI checks were verified against the official online Go command documentation.
