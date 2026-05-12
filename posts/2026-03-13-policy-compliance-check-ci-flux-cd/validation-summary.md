# Validation Summary: How to Configure Policy Compliance Check in CI for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (GitOps)
- OPA Conftest (v0.50.0)
- Rego policy language
- Kyverno CLI (v1.11.1)
- Kyverno ClusterPolicy resources
- Kustomize
- GitHub Actions

## Sources Consulted
- Conftest v0.50.0 release assets — https://github.com/open-policy-agent/conftest/releases/tag/v0.50.0 (confirmed `conftest_0.50.0_Linux_x86_64.tar.gz` exists)
- Kyverno v1.11.1 release assets — https://github.com/kyverno/kyverno/releases/tag/v1.11.1 (confirmed `kyverno-cli_v1.11.1_linux_x86_64.tar.gz` exists)
- Official Kyverno policy library — https://github.com/kyverno/policies/blob/main/pod-security/baseline/disallow-privileged-containers/disallow-privileged-containers.yaml (confirmed `=(privileged): "false"` string form is the canonical pattern)
- OPA Policy Language reference — https://www.openpolicyagent.org/docs/policy-language/ (future keyword imports for `in`, `if`, `contains`)
- Kyverno writing policies docs — https://kyverno.io/docs/writing-policies/validate/
- Kustomize install script — https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh

## Issues Found
- **Missing `import future.keywords.in`**: The Rego policy uses the `in` membership operator (e.g., `input.kind in ["Deployment", "StatefulSet", "DaemonSet"]`) but only imports `future.keywords.if` and `future.keywords.contains`. Conftest 0.50.0 bundles OPA v0.62.x where the `in` keyword still requires its own explicit `future.keywords.in` import (or `import rego.v1`). Without it, OPA fails to parse the policy. Fixed by adding `import future.keywords.in` alongside the existing future-keyword imports.

## Review Notes
- The `=(privileged): "false"` pattern in the Kyverno policy is intentionally a string, matching the canonical Kyverno policy library convention. Kyverno's resource validation engine handles the string-to-boolean comparison for this pattern style; this is not an error.
- The `conftest test` command in Step 3 specifies both `--namespace main` and `--all-namespaces`. Since the policy uses `package main` and `--all-namespaces` overrides/supersedes `--namespace`, the two flags are redundant rather than wrong — the command still works as intended. Left as-is to avoid unnecessary stylistic changes.
- The conftest tarball extraction with `tar xz -C /usr/local/bin/` extracts all archive contents (binary plus README, LICENSE, etc.) into `/usr/local/bin/`. Functional, though a more targeted extraction would be cleaner. Left as-is.
- Conftest v0.50.0 and Kyverno CLI v1.11.1 are both pinned to releases from early 2024 — readers may want to bump to newer releases when adopting, but the pinned versions are valid and reproducible.
- The Kustomize install script URL still references the `master` branch, which currently resolves correctly on the upstream repo.
