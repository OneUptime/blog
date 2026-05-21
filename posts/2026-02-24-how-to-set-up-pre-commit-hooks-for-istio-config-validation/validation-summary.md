# Validation Summary: How to Set Up Pre-Commit Hooks for Istio Config Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio and `istioctl`
- Git pre-commit hooks
- `pre-commit` framework
- Kubernetes manifest validation
- kubeconform
- Open Policy Agent / Rego
- conftest
- Bash
- Make

## Sources Consulted
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration validation troubleshooting: https://istio.io/latest/docs/ops/common-problems/validation/
- `pre-commit` official documentation: https://pre-commit.com/
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- Conftest official documentation: https://www.conftest.dev/
- Open Policy Agent Rego policy reference: https://www.openpolicyagent.org/docs/policy-reference

## Issues Found
- The post instructed readers to install kubeconform with `pip install kubeconform`. The official kubeconform documentation describes installing the kubeconform binary directly or using Homebrew on macOS, so the example was changed to `brew install kubeconform`.
- The Rego policy used legacy `deny[msg]` syntax. Current OPA and Conftest examples use Rego v1-style set rules, so the example was updated to `deny contains msg if { ... }`.

## Review Notes
- The `istioctl validate -f` examples and directory validation usage match the official Istio command reference.
- The `pre-commit` local hook structure with `repo: local`, `language: system`, file filtering, and filename passing is consistent with the official `pre-commit` documentation.
- kubeconform's `-strict` and `-ignore-missing-schemas` flags are valid according to the official usage documentation.
