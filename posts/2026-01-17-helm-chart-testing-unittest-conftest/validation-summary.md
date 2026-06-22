# Validation Summary: How to Write and Run Tests for Helm Charts

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Helm
- Helm charts
- Kubernetes
- chart-testing (ct)
- helm-unittest
- Conftest
- Open Policy Agent / Rego
- Kind
- GitHub Actions

## Sources Consulted
- Helm `helm lint` command documentation: https://helm.sh/docs/helm/helm_lint/
- Helm `helm template` command documentation: https://helm.sh/docs/helm/helm_template/
- Helm `helm test` command documentation: https://helm.sh/docs/helm/helm_test/
- Helm chart tests documentation: https://helm.sh/docs/topics/chart_tests/
- Helm `helm install`, `helm upgrade`, and `helm rollback` command documentation: https://helm.sh/docs/helm/helm_install/, https://helm.sh/docs/helm/helm_upgrade/, https://helm.sh/docs/helm/helm_rollback/
- chart-testing official repository and release notes: https://github.com/helm/chart-testing
- helm-unittest official documentation: https://github.com/helm-unittest/helm-unittest and https://raw.githubusercontent.com/helm-unittest/helm-unittest/main/DOCUMENT.md
- Conftest official documentation: https://www.conftest.dev/
- Conftest options and output documentation: https://www.conftest.dev/options/ and https://www.conftest.dev/output/
- Conftest release notes: https://github.com/open-policy-agent/conftest/releases/tag/v0.68.2
- Kubernetes kubectl reference documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- Azure setup-helm action repository: https://github.com/Azure/setup-helm
- Helm kind-action repository: https://github.com/helm/kind-action

## Issues Found
- The Conftest Rego policy examples used pre-OPA-v1 partial set syntax such as `deny[msg]`. Updated them to current Rego syntax, for example `deny contains msg if`, matching current Conftest documentation and OPA v1 behavior.
- The helm-unittest example used the deprecated `isNull` assertion. Replaced it with `notExists`, which is the documented non-deprecated assertion for a missing path.
- The render validation example described client-side dry run as Kubernetes schema validation. Updated it to `kubectl apply --dry-run=server -f -` and noted that cluster access is required for API-server validation.
- Updated pinned chart-testing install commands from v3.10.1 to v3.14.0, the current official release verified from the Helm chart-testing release page.
- Updated pinned Conftest install commands from v0.46.2 to v0.68.2, the current official release verified from the Conftest release page.
- Updated GitHub Actions examples from `azure/setup-helm@v3` to `azure/setup-helm@v5.0.0` and from `helm/kind-action@v1` to `helm/kind-action@v1.14.0` to match current published action releases.

## Review Notes
- The remaining examples are intentionally generic and assume a chart named `my-chart` with conventional helper templates and values. The hardcoded deployment name in the integration script may need adjustment for charts with custom fullname helpers, but it is technically valid for the example chart naming convention used throughout the post.
