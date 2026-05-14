# Validation Summary: How to Implement Automated Compliance Scanning with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and notification Alert resources
- Kubernetes CronJob manifests
- GitHub Actions workflows
- Trivy CLI and Trivy Operator
- kube-bench CIS benchmark scans
- Falco, Falco Helm chart, Falcosidekick, and Kubernetes audit rules
- kubectl and jq report aggregation

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Trivy CLI image command reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Trivy Operator CRD documentation: https://aquasecurity.github.io/trivy-operator/v0.30.0/docs/crds/
- Trivy Operator compliance documentation: https://aquasecurity.github.io/trivy-operator/v0.29.0/docs/compliance/compliance/
- Trivy Operator Helm chart values: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/README.md
- kube-bench flags and commands: https://aquasecurity.github.io/kube-bench/v0.6.7/flags-and-commands/
- Falco Helm chart values and README: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco Kubernetes audit event documentation: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/

## Issues Found
- The GitHub Actions checkout used the default shallow fetch, but the workflow compares against `origin/main...HEAD`. Added `fetch-depth: 0` so the merge-base comparison can work reliably.
- The image extraction pipeline used plain `xargs grep`, which can fail when no changed files are passed. Changed it to `xargs -r grep` for Ubuntu GitHub Actions runners.
- The Trivy Operator Helm values placed `targetNamespaces` under `operator`, used the obsolete/nonexistent `operator.complianceEnabled`, and used `nsa-1.0` instead of the current built-in `k8s-nsa-1.0` compliance spec. Updated those values to match the current chart.
- The kube-bench CronJob used `$(date +%Y%m%d)` in Kubernetes args without a shell, so it would be passed literally. Changed the container command to run through `/bin/sh -c`.
- The Falco chart snippet used deprecated `falco.rules_file` and a standalone ConfigMap that the HelmRelease did not mount. Updated the example to use `falco.rules_files` and the chart-supported `customRules` value.
- The Falco Kubernetes audit rule omitted `source: k8s_audit`, and the HelmRelease did not configure the `k8saudit` plugin or webhook service needed for audit-log rules. Added the documented plugin, rules artifact, service, and `load_plugins` configuration.
- The report script queried `compliancereports` and `.report.summary`, but Trivy Operator exposes cluster-scoped `clustercompliancereports` with counts under `.status.summary`. Updated the command and jq expression.
- The Flux Alert used deprecated `spec.summary`. Moved the summary text under `spec.eventMetadata.summary`.

## Review Notes
- The Trivy Operator compliance feature is still marked experimental in the upstream documentation, so future chart/operator upgrades may require another validation pass.
- The Falco `k8saudit` rule also requires Kubernetes API server audit webhook configuration outside the shown HelmRelease.
