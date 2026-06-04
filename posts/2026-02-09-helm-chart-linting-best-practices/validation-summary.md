# Validation Summary: How to Implement Helm Chart Linting Best Practices with helm lint and ct lint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm chart templates
- Kubernetes
- chart-testing (`ct`)
- GitHub Actions
- pre-commit
- JSON Schema
- Bash

## Sources Consulted
- Helm `helm lint` command documentation: https://helm.sh/docs/helm/helm_lint/
- Helm chart file and `Chart.yaml` documentation: https://helm.sh/docs/v3/topics/charts/
- Helm chart tests documentation: https://helm.sh/docs/v3/topics/chart_tests/
- helm/chart-testing README and configuration documentation: https://github.com/helm/chart-testing
- helm/chart-testing `ct lint` command documentation: https://raw.githubusercontent.com/helm/chart-testing/main/doc/ct_lint.md
- helm/chart-testing `ct install` command documentation: https://raw.githubusercontent.com/helm/chart-testing/main/doc/ct_install.md
- helm/chart-testing-action README and example workflow: https://github.com/helm/chart-testing-action
- gruntwork-io/pre-commit hook repository: https://github.com/gruntwork-io/pre-commit

## Issues Found
- The post stated that missing values always cause runtime errors that linting catches. Helm can render missing scalar values as empty strings, while missing nested objects can cause template failures. Updated the example to use Helm's `required` function for mandatory values and `dig` for a safe nested default.
- The post described chart-testing as always validating upgrade paths. `ct install` only validates upgrade paths when `--upgrade` is used. Updated the explanation and added an explicit `ct install --upgrade` command.
- The chart-testing download example used `v3.8.0`, which is no longer current. Updated the example to `v3.14.0`, matching the current chart-testing release documented by the project.
- The `ct.yaml` example included unsupported `test-values` and `kubernetes-versions` configuration keys. Removed those keys and clarified that chart-testing discovers per-chart `ci/*-values.yaml` files automatically.
- The `validate-chart-schema` comment incorrectly implied that chart-testing requires a values schema. Updated it to state that this validates `Chart.yaml` against the chart schema.
- The `helm-extra-args: --timeout 600s` example was inappropriate for `ct lint`, because `--timeout` is not a `helm lint` flag. Replaced it with `helm-lint-extra-args: --strict`.
- The GitHub Actions workflow used outdated action versions and pinned an old Helm version. Updated the actions to match the current official chart-testing-action example and removed the stale Helm version pin.
- The schema validation section said Helm validates values only during installation. Updated it to mention linting, templating, installation, and upgrades.

## Review Notes
- The `stable=https://charts.helm.sh/stable` repository URL is still usable as the archived Helm stable repository, but future examples may be clearer if they use actively maintained chart repositories only.
- Local `helm` and `ct` binaries were not installed in the workspace, so command verification was performed against official documentation rather than local `--help` output.
