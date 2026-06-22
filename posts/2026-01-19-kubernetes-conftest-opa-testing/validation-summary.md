# Validation Summary: How to Test Kubernetes Manifests with Conftest and OPA

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes manifests
- Conftest
- Open Policy Agent
- Rego
- Helm
- Kustomize
- GitHub Actions
- GitLab CI
- pre-commit

## Sources Consulted
- Conftest documentation: https://www.conftest.dev/
- Conftest options and configuration documentation: https://www.conftest.dev/options/
- Conftest installation documentation: https://www.conftest.dev/install/
- Conftest pre-commit documentation: https://www.conftest.dev/pre_commit/
- Conftest v0.64.0 release notes: https://github.com/open-policy-agent/conftest/releases/tag/v0.64.0
- Conftest pre-commit hook definitions: https://github.com/open-policy-agent/conftest/blob/master/.pre-commit-hooks.yaml
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- OPA policy testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- OPA Rego style guide: https://www.openpolicyagent.org/docs/style-guide
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- Updated Conftest examples from v0.46.0 to v0.64.0 because current Conftest uses OPA v1 by default and the post also used current `latest` images and docs patterns.
- Converted Rego examples from legacy `deny[msg]`, `warn[msg]`, and old test rule syntax to OPA v1-compatible `contains` / `if` rule heads.
- Renamed `.conftest.toml` to `conftest.toml`, matching Conftest's documented default configuration filename.
- Corrected the pre-commit hook from `conftest` to `conftest-test` and updated the manual pre-commit command accordingly.
- Replaced the direct Helm template directory test with testing rendered Helm output, because raw Helm templates are not valid Kubernetes YAML until rendered.
- Fixed the image registry and tag policy examples so registry prefixes are not overbroad and registry ports are not mistaken for image tags.
- Fixed the CPU resource parsing example so whole-core values such as `2` are not incorrectly treated as millicores.
- Corrected the Rego policy unit tests to use `with input as ...` and to provide a valid deployment that satisfies the other policies loaded from the policy directory.
- Corrected the GitLab CI manifest path to match the project structure shown in the post.
- Clarified the `--fail-on-warn` example comment to describe its actual behavior.

## Review Notes
- Extracted all Rego snippets from the post and verified them with OPA v1 syntax checking.
- Extracted the Rego unit test snippets and verified them with Conftest v0.64.0.
- The resource memory warning remains intentionally simplified, as the post explicitly labels it as a simplified check.
