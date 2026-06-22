# Validation Summary: Testing Helm Charts with Chart Testing (ct) and helm test

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Chart Testing (ct)
- Helm test hooks
- helm-unittest
- GitHub Actions
- GitLab CI
- kind
- JSON Schema

## Sources Consulted
- Helm chart tests documentation: https://helm.sh/docs/topics/chart_tests/
- Helm chart schema files documentation: https://helm.sh/docs/topics/charts/#schema-files
- Helm `helm test` command documentation: https://helm.sh/docs/helm/helm_test/
- Helm chart-testing README and command docs: https://github.com/helm/chart-testing
- Helm chart-testing `ct lint` docs: https://github.com/helm/chart-testing/blob/main/doc/ct_lint.md
- Helm chart-testing `ct install` docs: https://github.com/helm/chart-testing/blob/main/doc/ct_install.md
- Helm chart-testing-action README: https://github.com/helm/chart-testing-action
- helm-unittest documentation: https://github.com/helm-unittest/helm-unittest
- GitHub release metadata for chart-testing, chart-testing-action, kind, and Helm

## Issues Found
- Updated chart-testing version examples from 3.10.0 to 3.14.0, matching the current upstream release and release asset naming.
- Changed the JSON Schema declaration from draft 2020-12 to draft-07, because Helm's values schema validation is based on JSON Schema support compatible with draft-07 rather than 2020-12.
- Corrected the ct values-schema validation example. `--validate-chart-schema` validates `Chart.yaml`, not `values.schema.json`; values schema validation is performed through `helm lint`, so the ct example now uses `--helm-lint-extra-args "--strict"`.
- Corrected the ct installation example for passing a values file. `--helm-extra-set-args` is intended for extra set-style Helm arguments, while `--helm-extra-args` is the appropriate ct flag for passing a Helm `--values` argument.
- Updated CI action and tool versions in the GitHub Actions and GitLab CI snippets to current upstream versions.
- Fixed troubleshooting commands that treated the `helm.sh/hook` annotation as a Kubernetes label. The command now filters pod annotations from `kubectl` JSON output.
- Replaced the hard-coded `test` namespace in the test-pod logs command with `<namespace>` because ct uses generated namespaces unless one is explicitly configured.

## Review Notes
The examples are otherwise aligned with Helm's documented chart test hook behavior, ct lint/install behavior, and helm-unittest usage. The CI snippets remain examples; production pipelines should pin versions according to the repository's compatibility and upgrade policy.
