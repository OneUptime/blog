# Validation Summary: How to Set Up Configuration Linting for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio and istioctl
- Kubernetes manifests and kubectl validation behavior
- GitHub Actions
- yamllint
- yq
- OPA/Rego
- Conftest
- pre-commit

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio 1.30.0 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Conftest documentation: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Open Policy Agent Rego v1 keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Rego contains keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- Open Policy Agent string built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/strings
- pre-commit documentation: https://pre-commit.com/

## Issues Found
- The `istioctl analyze` examples used `-f` and `--recursive`. Current `istioctl analyze` takes file and directory paths as positional arguments; `-f` belongs to commands such as `istioctl validate`, and `--recursive` is removed and hardcoded to true. Updated all `istioctl analyze` examples to use `istioctl analyze --use-kube=false istio-config/`.
- The CI example installed Istio 1.22.0, which is outdated for a 2026 post. Updated the example to Istio 1.30.0, the current release at validation time.
- The CI "Kubernetes schema validation" step installed `kubeval` with pip but did not run it, and `kubectl apply --dry-run=client` is not a reliable offline schema validator for Istio custom resources. Replaced the step with `istioctl validate -f istio-config/`, matching Istio's documented validation command.
- The Rego policy examples used older partial-set syntax such as `deny[msg] { ... }`. Updated the snippets to the current OPA/Rego v1-compatible `deny contains msg if { ... }` and `warn contains msg if { ... }` form used by current Conftest documentation.

## Review Notes
- The shell-based custom lint examples are illustrative and would benefit from more structured YAML-aware matching in a production implementation, but the examples are technically plausible for simple repositories.
- The GitHub CLI PR comment snippet assumes the workflow has suitable `GITHUB_TOKEN` permissions and `gh` authentication available.
