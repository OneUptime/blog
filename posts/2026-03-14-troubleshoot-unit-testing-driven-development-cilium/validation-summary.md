# Validation Summary: Troubleshooting Unit Testing for Cilium L7 Parser Development

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium proxylib L7 parser development
- Go unit testing
- Go coverage tooling
- Go race detector and test shuffling
- Delve debugger

## Sources Consulted
- Cilium documentation: Envoy and proxylib parser development: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium proxy proxylib source, `reader.go`: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy proxylib source, `test_util.go`: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/test_util.go
- Go command documentation for `go test` flags, coverage, race, shuffle, benchmark, count, and test binary behavior: https://go.dev/cmd/go/
- Go coverage documentation: https://go.dev/doc/build-cover
- Go `testing` package documentation for `testing.Verbose`: https://pkg.go.dev/testing
- Delve `dlv test` documentation: https://manpages.debian.org/bookworm/delve/dlv-test.1.en.html

## Issues Found
- The post used `proxylib.NewTestReader(data)` in examples. Current proxylib exposes `NewReader(input [][]byte, endStream bool)` and `ReaderParser.OnData` expects a `*proxylib.Reader`. Updated the examples to construct readers with `proxylib.NewReader([][]byte{data}, false)` and pass `&reader` to `OnData`.
- The prerequisites referred broadly to "Cilium source code with proxylib". Cilium's current documentation directs parser work in the `cilium/proxy` repository under `proxylib`, so this was changed to "Cilium proxy source code with proxylib".
- The troubleshooting note for 0% coverage implied that using a separate `_test` package prevents coverage. External test packages can still produce coverage for exported behavior. Reworded the note to focus on testing the correct package path and executing code under test, while preserving the same-package advice only for unexported parser state access.

## Review Notes
- The remaining `go test` flags and Delve command forms are consistent with official Go and Delve documentation. The workspace does not have the `go` binary installed, so command verification was performed against official documentation rather than local `go help` output.
