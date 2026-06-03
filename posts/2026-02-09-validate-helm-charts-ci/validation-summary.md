# Validation Summary: How to Validate Helm Charts Using Chart Testing and Schema Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm and Helm charts
- Helm JSON schema validation
- helm-unittest
- chart-testing (`ct`)
- kubeval and kubeconform
- GitHub Actions
- pre-commit

## Sources Consulted
- Helm chart documentation: https://helm.sh/docs/v3/topics/charts/
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Helm project README and supported version notes: https://github.com/helm/helm
- chart-testing README and configuration documentation: https://github.com/helm/chart-testing
- chart-testing `ct lint` command documentation: https://github.com/helm/chart-testing/blob/main/doc/ct_lint.md
- chart-testing `ct install` command documentation: https://github.com/helm/chart-testing/blob/main/doc/ct_install.md
- chart-testing releases: https://github.com/helm/chart-testing/releases
- helm-unittest README and CLI usage: https://github.com/helm-unittest/helm-unittest
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- Kubernetes resource quantity documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- actions/checkout README: https://github.com/actions/checkout
- actions/upload-artifact README: https://github.com/actions/upload-artifact
- Azure setup-helm README: https://github.com/Azure/setup-helm

## Issues Found
- The `values.schema.json` example was fenced as YAML even though the file content is JSON. Changed the fence to `json` and removed the inline filename comment so the snippet remains valid JSON.
- The memory quantity regex only allowed values like `512Mi`, while the later maximum-values example used `1Gi`. Updated the schema to allow common Kubernetes memory suffixes such as `Ki`, `Mi`, `Gi`, and decimal suffixes.
- The helm-unittest example described `-3` as verbose output. Current helm-unittest usage documents `-f/--file` for test globs and JUnit output via `--output-type JUnit`; updated the command and changed "coverage report" to "JUnit test report."
- The chart-testing config used `helm-extra-set-args` as a YAML list and included `kubernetes-version`, which is not documented in the current `ct lint` / `ct install` flags. Updated `helm-extra-set-args` to the documented string form and removed the unsupported Kubernetes version key.
- The validation script used `helm template --validate` for schema validation. Helm validates `values.schema.json` during `helm template`; `--validate` also requires validating rendered manifests against a Kubernetes cluster. Removed `--validate` from the schema validation step.
- The security check searched for `runAsRoot: false`, which is not the Kubernetes security context field used in the rest of the article. Changed it to search for `runAsNonRoot: true`.
- The chart-testing install examples used v3.10.0. Updated them to v3.14.0, matching the current chart-testing release references.
- The GitHub Actions workflow used older action versions for checkout, setup-helm, and artifact upload. Updated to supported current major versions and a current Helm 3 release.
- The pre-commit hook passed changed filenames to a script that expects a chart directory. Changed it to iterate chart directories and set `pass_filenames: false`.

## Review Notes
Helm v4 is now the current stable Helm line, while Helm v3 remains in support mode. The post is still valid as a Helm 3 chart validation guide after the version updates, but future revisions should decide whether to present Helm 4 examples explicitly.
