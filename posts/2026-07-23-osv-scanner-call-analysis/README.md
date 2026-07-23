# How to Triage OSV-Scanner Findings with Reachability and Call Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Reachability Analysis, Go, Rust, Vulnerability Triage

Description: Use OSV-Scanner call analysis to prioritize findings while respecting missing advisory symbols, toolchain requirements, and analysis limits.

---

A package-version match says a dependency version is affected. Go and Rust call analysis ask a narrower question: does static analysis find a path from the project to a vulnerable function named by advisory data? Experimental JAR reachability instead asks whether dependency classes are reachable from a built application JAR.

OSV-Scanner v2 enables Go call analysis by default, supports Rust analysis experimentally, and has supported experimental JAR reachability since v2.2.2. Each is a prioritization signal, not a reason to declare a vulnerable dependency safe forever.

## Run the default scan first

Capture the package-level baseline:

```bash
osv-scanner scan source \
  --recursive \
  --format=json \
  --output-file=package-findings.json \
  .
```

Package findings remain the complete set to remediate. Reachability then adds analyzer-specific context: Go and Rust can distinguish confirmed-called, analyzed-not-called, and not-analyzed results, while JAR analysis can identify dependency packages not found on a reachable class path.

## Understand Go call analysis

Go call analysis is enabled by default. OSV-Scanner uses the `govulncheck` library to analyze Go source and identify calls to vulnerable functions. The Go compiler must be installed and available on `PATH`.

To request only Go analysis explicitly:

```bash
osv-scanner scan source --call-analysis=go .
```

`--call-analysis=all` also enables the experimental Rust and JAR analyzers; it is not a synonym for Go-only analysis.

To disable Go analysis—for example, to measure the package-only baseline:

```bash
osv-scanner scan source --no-call-analysis=go .
```

Analysis also depends on the advisory supplying vulnerable symbol information. A package can match a known vulnerability while having no function-level data to analyze.

## Enable Rust analysis cautiously

Rust call analysis is currently marked experimental. It compiles source and examines DWARF debug information in the output binary:

```bash
osv-scanner scan source \
  --call-analysis=rust \
  --no-call-analysis=go \
  ./rust-service
```

The Rust toolchain, including `cargo`, must be on `PATH` and capable of compiling every scanned crate and target. The official documentation warns that this process executes dependency `build.rs` scripts, which can run arbitrary code.

Do not enable it on an untrusted pull request in a privileged runner. Use an isolated, least-privileged environment without production secrets or unnecessary network access.

Documented Rust limitations include dependencies on procedural macros, dynamically linked dependencies, and dependencies that link external non-Rust code. Compilation failures and unsupported constructs produce unknown reachability, not “not called.”

## Analyze a built JAR experimentally

OSV-Scanner v2.2.2 added the `jar` analysis option for scanning built artifacts, including images:

```bash
osv-scanner scan image \
  --call-analysis=jar \
  example/service:2026-07-23
```

This analyzer follows bytecode paths from application entry points and maps reachable classes back to Maven dependencies. The current implementation is limited to Maven-built JARs with the expected metadata and main-class information, and it downloads dependency JARs from Maven Central to build class mappings. Run it only where that network access is acceptable.

Unlike Go and Rust analysis, JAR reachability marks vulnerabilities in an unreachable dependency package rather than matching calls to vulnerable symbols supplied by an advisory. Failure to analyze the JAR is unknown coverage, not proof that its dependencies are unreachable.

## Read the result states correctly

For Go and Rust, table output separates findings affecting code called by the project from findings in code paths not found to be called. JSON attaches analysis to vulnerability groups. A simplified shape is:

```json
{
  "groups": [
    {
      "ids": ["GHSA-example", "RUSTSEC-example"],
      "experimentalAnalysis": {
        "RUSTSEC-example": {
          "called": false
        }
      }
    }
  ]
}
```

Interpret three states, not two:

| State | Meaning | Suggested priority |
|---|---|---|
| `called: true` | A vulnerable function is found on a call path | Urgent technical review |
| `called: false` | Analysis ran for supplied vulnerable symbols and found no call | Lower priority, retain finding |
| No analysis entry | Analysis did not produce a conclusion | Package-level priority; investigate why |

For Go and Rust, an absent analysis object is not equivalent to `called: false`. It may mean missing symbol metadata, unsupported language behavior, a toolchain failure, or no analysis for that record in an alias group. For JAR analysis, treat an analysis failure or unsupported JAR layout as unknown in the same way.

## Triage the alias group and package instance

OSV-Scanner groups records connected through aliases. One source record may contain function data while an aliased GHSA or CVE record does not. Review the group's IDs, analysis map, affected package, installed version, and source file together.

A practical order is:

1. Confirm the installed version is truly affected.
2. Confirm call analysis completed with the expected toolchain and build tags or features.
3. Prioritize `called: true` findings.
4. For `called: false`, check dynamic dispatch, reflection, plugins, generated code, native calls, and runtime-only entry points outside the model.
5. Treat no-analysis findings as unknown.
6. Upgrade to a fixed version whenever feasible regardless of current call state.

## Make reachability reproducible

Record:

- OSV-Scanner version and flags;
- compiler and toolchain versions;
- target, build tags, feature flags, and workspace members;
- advisory IDs and `modified` timestamps;
- source revision and lockfile digest;
- whether analysis completed or fell back to package-only matching.

Reachability can change without a dependency update when application code begins calling a different path. Rerun it on code changes and, for Go and Rust, after advisory symbol data changes.

Use time-bound exceptions only after documenting why the analysis represents production execution. “Static analysis did not find a call” is evidence for prioritization, not a universal proof of non-exploitability.

## Official Documentation

- [OSV-Scanner source scanning and call analysis](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner call-analysis output](https://google.github.io/osv-scanner/output/)
- [Go vulnerability checking library used by OSV-Scanner](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [OSV schema ecosystem-specific affected-function data](https://ossf.github.io/osv-schema/)
- [OSV-Scanner v2.2.2 JAR reachability release notes](https://github.com/google/osv-scanner/releases/tag/v2.2.2)
- [OSV-Scalibr Java reachability implementation](https://github.com/google/osv-scalibr/tree/main/enricher/reachability/java)
