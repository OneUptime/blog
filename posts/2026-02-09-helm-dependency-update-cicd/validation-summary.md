# Validation Summary: How to Implement Helm Chart Dependency Update Automation in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm charts and chart dependencies
- Helm CLI
- Bash scripting
- GitHub Actions
- GitLab CI/CD
- yq
- jq
- Snyk CLI
- Kubernetes kind-based chart testing

## Sources Consulted
- Helm `helm dependency update` documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm `helm search repo` documentation: https://helm.sh/docs/v3/helm/helm_search_repo/
- Helm chart dependency best practices: https://docs.helm.sh/docs/chart_best_practices/dependencies/
- Helm `helm install`, `helm template`, and `helm lint` command documentation: https://helm.sh/docs/helm/helm_install/, https://helm.sh/docs/helm/helm_template/, https://helm.sh/docs/helm/helm_lint/
- Masterminds semver constraint documentation used by Helm: https://github.com/Masterminds/semver
- mikefarah/yq evaluate and in-place update documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- Azure setup-helm action documentation: https://github.com/Azure/setup-helm
- peter-evans/create-pull-request documentation: https://github.com/peter-evans/create-pull-request
- GitHub `GITHUB_TOKEN` behavior documentation: https://docs.github.com/actions/concepts/security/github_token
- GitHub upload-artifact documentation and deprecation notice: https://github.com/actions/upload-artifact
- GitLab push options documentation: https://docs.gitlab.com/topics/git/commit/
- Snyk Helm chart scanning documentation: https://docs.snyk.io/developer-tools/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-cli-for-iac/test-your-iac-files/helm-charts

## Issues Found
- The dependency update script derived Helm repository names from repository URLs, producing names like `charts-bitnami-com` instead of the configured repo names `bitnami` and `prometheus-community`. Updated the script to map known repository URLs and fall back to `helm repo list`.
- The script could write an empty dependency version if `helm search repo` returned no matching result. Updated `get_latest_version` to fall back to the current version.
- The update log printed `$version` instead of the parsed `$old_version`. Corrected the variable used in the message.
- The GitHub and GitLab workflows checked only `Chart.yaml` for updates even though `helm dependency update` also changes `Chart.lock` and may change `charts/`. Updated the diff checks to include those paths.
- Several GitHub Actions examples used old action versions, and `actions/upload-artifact@v3` is deprecated. Updated examples to current action versions.
- The GitHub PR workflow used `GITHUB_TOKEN`, which can require manual approval for PR-triggered workflows created by automation. Updated the example to use a dedicated dependency update token.
- The dependency version constraint comments were inaccurate: caret ranges allow minor and patch updates for stable major versions, while the shown tilde range stays within the specified minor line. Corrected the comments.
- The compatibility check rendered the same chart state before and after dependency update rather than explicitly comparing old and new dependency versions. Updated the example to render temporary old and new chart copies.
- The security check used an unofficial Helm Snyk plugin flow and used `yq` without installing it. Replaced the scan with Snyk's documented `helm template` plus `snyk iac test` flow and added tool installation.

## Review Notes
The examples are now technically consistent with current Helm and CI/CD documentation. In a production post, it may be worth noting that committing vendored chart archives under `charts/` is a team policy choice; some teams commit only `Chart.yaml` and `Chart.lock` and rebuild dependencies during CI.
