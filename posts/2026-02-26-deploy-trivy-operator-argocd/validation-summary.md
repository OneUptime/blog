# Validation Summary: How to Deploy Trivy Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Trivy Operator
- Trivy
- Argo CD
- Helm
- Kubernetes
- Prometheus ServiceMonitor
- Grafana dashboards
- kubectl and Argo CD CLI

## Sources Consulted
- Trivy Operator CRD overview: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/
- Trivy Operator vulnerability scanning configuration: https://aquasecurity.github.io/trivy-operator/v0.20.1/docs/vulnerability-scanning/trivy/
- Trivy Operator metrics documentation: https://aquasecurity.github.io/trivy-operator/v0.13.1/tutorials/integrations/metrics/
- Aqua Security Helm chart repository index: https://aquasecurity.github.io/helm-charts/index.yaml
- Trivy Operator Helm chart 0.32.1 package and generated values reference: https://github.com/aquasecurity/helm-charts/releases/download/trivy-operator-0.32.1/trivy-operator-0.32.1.tgz
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The wrapper chart pinned `trivy-operator` chart version `0.24.1`, which is outdated. Updated it to `0.32.1`, the current chart version in the Aqua Security Helm repository.
- The values snippet used a non-existent `scanners.*.enabled` structure. Replaced it with the chart-supported `operator.vulnerabilityScannerEnabled`, `operator.configAuditScannerEnabled`, `operator.exposedSecretScannerEnabled`, `operator.rbacAssessmentScannerEnabled`, `operator.infraAssessmentScannerEnabled`, and `operator.clusterComplianceEnabled` settings.
- The metrics settings were under `trivyOperator` with invalid keys. Moved them to the supported `operator.metricsVulnIdEnabled`, `operator.metricsFindingsEnabled`, and `operator.metricsExposedSecretInfo` keys.
- The Trivy database values included the registry inside `dbRepository` and `javaDbRepository`; the chart renders these as `dbRegistry/dbRepository` and `javaDbRegistry/javaDbRepository`. Split the values so the rendered repositories are correct.
- The compliance spec IDs `nsa` and `cis` are not valid Helm chart spec names. Replaced them with `k8s-nsa-1.0` and `k8s-cis-1.23`.
- The example Trivy server image used an older Trivy tag. Updated it to the Trivy image tag used by the current Trivy Operator chart.
- A few inline comments described the wrong setting behavior, such as labeling `scanJobsConcurrentLimit` as scanning all namespaces. Updated those comments to match the actual values.

## Review Notes
The YAML snippets parse successfully after the fixes. The Argo CD Application manifest and sync options are structurally valid, but the example assumes an Argo CD project named `security` already exists and that the Prometheus Operator CRDs are installed before enabling `serviceMonitor`.
