# Validation Summary: Validating the OnData Method in Cilium Network Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium proxy/proxylib
- Go testing
- Go fuzzing
- Kubernetes
- CiliumNetworkPolicy
- Envoy L7 proxy

## Sources Consulted
- Cilium Envoy/proxylib documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium upgrade documentation for proxylib removal: https://docs.cilium.io/en/latest/operations/upgrade.html
- Cilium policy API source for `l7proto`: https://github.com/cilium/cilium/blob/v1.19/pkg/policy/api/l4.go
- Cilium proxy `Parser` and `ReaderParser` interfaces: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxy `Reader` helper: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy test helper conventions: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/test_util.go
- Go fuzzing documentation: https://go.dev/doc/security/fuzz/
- Go `testing.F` documentation: https://pkg.go.dev/testing
- Cilium debug CLI documentation: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html

## Issues Found
- The post used the old `github.com/cilium/cilium/proxylib/proxylib` import path and referred only to Cilium source. Updated the prerequisite and examples to use the current Cilium proxy/proxylib source path, `github.com/cilium/proxy/proxylib/proxylib`.
- The code examples used `proxylib.NewTestReader`, which is not present in the current Cilium proxy proxylib package. Replaced it with a small `testReader` helper built on `proxylib.NewReader`.
- The fuzz invariants incorrectly required `PASS` to consume no more than the currently available bytes and `DROP` to consume zero bytes. Cilium proxylib permits `PASS N` to apply beyond the current buffer, and `DROP N` drops positive bytes. Updated the invariants accordingly and added handling for `ERROR`, `INJECT`, and `NOP`.
- Malformed frame examples returned `DROP, 0`, which the proxylib framework treats as an invalid operation length. Updated malformed frame cases to return `ERROR` with `ERROR_INVALID_FRAME_LENGTH`.
- The property-based test indexed short byte slices before checking their length. Changed the loop to start at the minimum header size.
- The "error state terminal" property expected `DROP`. Updated it to expect `ERROR`, which better matches proxylib's parser failure semantics.
- The integration command `cilium bpf proxy list` is not a current documented Cilium debug command. Replaced it with documented `cilium-dbg status --all-redirects` and `cilium-dbg envoy admin listeners` checks.
- Added a version caveat that Envoy Go extensions/proxylib are deprecated in newer Cilium releases and removed from Cilium 1.20.

## Review Notes
The post remains a conceptual guide for a custom parser named `myprotocol`; the snippets still assume the reader-facing parser and parser state types exist in the user's implementation. I could not run Go compilation or `go test` in this workspace because the `go` binary is not installed, so validation was performed against official documentation and upstream source.
