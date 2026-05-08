# Validation Summary: Validating Runtime Tests for Cilium Network Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium network policy and L7 policy enforcement
- Hubble flow observation
- Kubernetes custom resources
- Go integration tests
- Bash, grep, kubectl

## Sources Consulted
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Command Cheatsheet for CiliumNetworkPolicy resources: https://docs.cilium.io/en/stable/cheatsheet/
- Go command testing and build flags documentation: https://go.dev/cmd/go/
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html

## Issues Found
- The Hubble L7 denial example used `--verdict DENIED`. Hubble L7 denied HTTP flows are exposed as dropped flows and Hubble examples use `--verdict DROPPED`; `DENIED` appears in policy-verdict output text rather than as a standard Hubble verdict filter. Changed the command to `hubble observe --type l7 --verdict DROPPED --last 5 -o json`.
- The reliability script used `grep -E "--- PASS|--- FAIL"` and `grep -c "---"`. Because those patterns start with `-`, GNU grep treats them as options unless option parsing is ended or the pattern is passed with `-e`. Added `--` to both commands.

## Review Notes
The Go examples are illustrative snippets and depend on project-local helpers such as `helpers.Kubectl`, `waitForPolicyEnforcement`, and protocol-specific assertion helpers. The commands assume a test environment with Go, kubectl, Cilium CRDs, Hubble, and the relevant integration test package installed.
