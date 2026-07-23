# Validation Summary: How to Triage OSV-Scanner Findings with Reachability and Call Analysis

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner v2
- Go and `govulncheck`
- Rust, Cargo, optimized builds, and DWARF debug information
- Java/JAR reachability analysis
- Maven and Maven Central
- OSV vulnerability records and alias groups
- JSON and table scan output
- Container image scanning

## Sources Consulted

- [OSV-Scanner v2 usage and output flags](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner project source scanning and call analysis](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner container image scanning](https://google.github.io/osv-scanner/usage/scan-image)
- [OSV-Scanner output documentation](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.4.0 release](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
- [OSV-Scanner v2.4.0 call-analysis defaults and `all` handling](https://github.com/google/osv-scanner/blob/v2.4.0/cmd/osv-scanner/internal/helper/callanalysis_parser.go)
- [OSV-Scanner v2.4.0 JSON result model](https://github.com/google/osv-scanner/blob/v2.4.0/pkg/models/results.go)
- [OSV-Scanner v2.4.0 table-output implementation](https://github.com/google/osv-scanner/blob/v2.4.0/internal/output/table.go)
- [OSV-Scanner v2.4.0 Go call-analysis implementation](https://github.com/google/osv-scanner/blob/v2.4.0/internal/sourceanalysis/go.go)
- [OSV-Scanner v2.4.0 Rust call-analysis implementation](https://github.com/google/osv-scanner/blob/v2.4.0/internal/sourceanalysis/rust.go)
- [OSV-Scanner v2.2.2 JAR reachability release notes](https://github.com/google/osv-scanner/releases/tag/v2.2.2)
- [OSV-Scanner JAR reachability integration pull request](https://github.com/google/osv-scanner/pull/2113)
- [OSV-Scalibr Java reachability implementation](https://github.com/google/osv-scalibr/tree/main/enricher/reachability/java)
- [Go vulnerability scanning package used by OSV-Scanner](https://pkg.go.dev/golang.org/x/vuln/scan)
- [Go `govulncheck` documentation and limitations](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [OSV schema, including aliases, `modified`, and ecosystem-specific data](https://ossf.github.io/osv-schema/)

## Issues Found

- The opening description treated Go and Rust as if both produced a static call path. Go uses `govulncheck` call-graph analysis, while the Rust analyzer builds the workspace with optimization and LTO, then checks DWARF function symbols in the resulting outputs. The introduction and result-state descriptions now distinguish those models and avoid calling static results “confirmed.”
- The first command was described as a package-only baseline even though Go call analysis is enabled by default in OSV-Scanner v2. The text now states that the command captures package findings together with default Go analysis; the later `--no-call-analysis=go` command remains the package-only baseline.
- The Go implementation text and documentation link called `govulncheck` itself a library and referred only to a compiler prerequisite. OSV-Scanner imports `golang.org/x/vuln/scan` and invokes the `go` command, so the wording and link now identify the actual package and Go toolchain requirement.
- The Rust limitations text said unsupported constructs produce an unknown state. Unsupported proc-macro, dynamic-linking, and external non-Rust-code cases are outside the documented model, but the implementation can still emit a call-analysis value. The post now says compilation failure yields no conclusion and that values involving unsupported constructs must be treated as unreliable/unknown.
- The JAR description said the analyzer follows bytecode paths, which overstated its granularity. The implementation recursively follows class references from manifest entry points and maps reachable classes to Maven dependencies. The wording now reflects that class-level behavior.
- The named container-image example omitted its Docker prerequisite. The post now states that scanning an image by name requires the Docker CLI on `PATH`.
- The table-output description omitted that OSV-Scanner v2 hides uncalled findings unless `--all-vulns` is supplied. The post now documents the flag and default behavior.
- The JSON example used the obsolete camel-case key `experimentalAnalysis`. OSV-Scanner v2 serializes this field as `experimental_analysis`; the example now uses the released v2 schema.

## Review Notes

- The review was performed against OSV-Scanner v2.4.0, the latest release on 2026-07-23. The v2.2.2 release notes correctly identify the addition of JAR reachability.
- The hosted output documentation still shows the older camel-case analysis field in its sample, but every OSV-Scanner v2 release model, including v2.4.0, uses `experimental_analysis`. The tagged v2 source and JSON serialization tests were treated as authoritative.
- The v2.4.0 CLI help text lists Go and Rust but omits JAR from its supported-language sentence. The v2.4.0 parser, plugin wiring, integration tests, v2.2.2 release notes, and merged feature pull request all confirm that `--call-analysis=jar` and `--call-analysis=all` enable JAR reachability.
- A future revision could mention that scans containing only uncalled vulnerabilities do not produce OSV-Scanner's vulnerability error status. The complete JSON report should remain the record used for remediation and audit.
