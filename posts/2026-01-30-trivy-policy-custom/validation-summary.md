# Validation Summary: How to Build Custom Policies in Trivy

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Trivy (misconfiguration scanning, `trivy config` subcommand)
- Open Policy Agent (OPA) Rego (v1 syntax with `import rego.v1`)
- Dockerfile policy authoring
- Kubernetes manifest policy authoring
- Terraform / AWS resource policy authoring (S3, RDS, EBS, CloudTrail)
- Compliance frameworks (CIS, PCI-DSS, SOC2, HIPAA)
- GitHub Actions (`aquasecurity/trivy-action`)
- SARIF result upload (`github/codeql-action/upload-sarif`)

## Sources Consulted
- Trivy custom policies docs — https://trivy.dev/latest/docs/scanner/misconfiguration/custom/
- Trivy `trivy config` CLI reference — https://trivy.dev/latest/docs/references/configuration/cli/trivy_config/
- Trivy config file reference — https://trivy.dev/latest/docs/references/configuration/config-file/
- OPA Policy Testing docs (mocking input with `with input as`) — https://www.openpolicyagent.org/docs/policy-testing
- aquasecurity/trivy-action README — https://github.com/aquasecurity/trivy-action

## Issues Found

1. **CLI flag names were outdated.** The post used `--policy` and `--namespaces`, which were renamed in current Trivy versions to `--config-check` and `--check-namespaces` respectively. Updated every `trivy config` invocation (Local Scanning section, Debugging section, and the Policy Evaluation Flow sequence diagram) to use the current flag names.

2. **Severity table contained incorrect claims about CI behavior.**
   - "CRITICAL — Fails CI by default" is wrong: Trivy exits 0 regardless of findings unless `--exit-code` is set explicitly.
   - "MEDIUM / LOW — Warning only" suggested a built-in per-severity warning mode that does not exist; severity is just a filter used together with `--exit-code`.
   - Reworded the table to a simple severity-vs-use-case mapping and explained the actual exit-code/`--severity` contract above it.

3. **Severity example with multiple `--exit-code` flags was impossible.** The original showed `--severity CRITICAL --exit-code 1 --severity HIGH,MEDIUM,LOW --exit-code 0`, but `--exit-code` takes a single int and `--severity` cannot be repeated to set per-severity exit codes. Replaced with two valid, distinct examples.

4. **Severity count was off.** The post said Trivy "supports four severity levels"; Trivy actually defines five (UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL). Updated the sentence to reflect this.

5. **`trivy.yaml` config used the wrong section names.** The post placed `policy` and `namespaces` under a top-level `scan:` key. In current Trivy, custom Rego configuration belongs under a dedicated `rego:` section, and the field name is `check`, not `policy`. Updated the YAML example accordingly.

6. **OPA test syntax was incorrect.** The tests used `input := { ... }` inside the rule body, which does not override the document referenced by the rule under test — it just creates a local variable. Per OPA's policy-testing documentation the correct pattern is `with input as <mock>`. Renamed the local mock to `test_input` and applied `with input as test_input` to the `no_root.deny` calls in all three tests so they actually exercise the policy.

## Review Notes

- The Rego policies themselves use the v1 syntax (`import rego.v1`, `contains ... if { ... }`). Trivy supports this and OPA 1.0 makes v1 the default, so this is fine, though the upstream Trivy custom-checks examples do not always include the explicit `import rego.v1`.
- The `result.new(msg, cause)` helper used throughout the post is the documented Trivy convention for emitting findings — verified against the Trivy custom-policies docs.
- The Dockerfile input schema (`input.Stages[*].Commands[*].Cmd` / `.Value`) and the Terraform input schema (`input.resource.<type>[<name>]`) match how Trivy parses these inputs.
- `aquasecurity/trivy-action@master` works, but pinning to a release tag (currently `v0.36.0`) is the upstream-recommended practice. Left as-is because the author's intent was illustrative and the action itself is valid; readers should pin in production.
- The `data.kubernetes.networkpolicies[ns]` lookup in the NetworkPolicy example assumes cross-resource visibility that Trivy's per-file evaluation model does not generally provide; the inline comment already flags this as illustrative, so it was left unchanged.
- Author uses `aquasecurity/trivy-action@master` and `github/codeql-action/upload-sarif@v3` — the SARIF upload requires Trivy to be configured to emit SARIF output (e.g. `format: 'sarif'` and an `output` path on the action), which isn't shown in the snippet. Not factually wrong, but readers copying the snippet verbatim will get a missing-file error. Out of scope for a technical-correctness fix.
