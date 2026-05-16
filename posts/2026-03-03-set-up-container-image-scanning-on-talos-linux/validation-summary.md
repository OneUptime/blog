# Validation Summary: How to Set Up Container Image Scanning on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Trivy Operator (Aqua Security)
- Trivy CLI
- Helm v3
- Kubernetes ValidatingWebhookConfiguration (admissionregistration.k8s.io/v1)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- jq (for parsing JSON output of CRDs)

## Sources Consulted
- Trivy Operator Helm installation docs: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Trivy Operator vulnerability scanning configuration: https://aquasecurity.github.io/trivy-operator/latest/docs/vulnerability-scanning/trivy/
- Trivy Operator Helm values.yaml: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/values.yaml
- Trivy Operator Prometheus metrics integration: https://aquasecurity.github.io/trivy-operator/latest/tutorials/integrations/metrics/
- Kubernetes admissionregistration.k8s.io/v1 ValidatingWebhookConfiguration API reference
- Prometheus Operator (monitoring.coreos.com/v1) CRD reference for ServiceMonitor and PrometheusRule

## Issues Found
No technical issues found.

Verified specifically:
- Aqua Security Helm repo URL `https://aquasecurity.github.io/helm-charts/` is correct.
- Helm install values `trivy.ignoreUnfixed` and `operator.scanJobTimeout` are valid keys in the trivy-operator chart.
- CRD `vulnerabilityreports.aquasecurity.github.io` is the correct CRD name installed by the operator.
- ConfigMap name `trivy-operator-trivy-config` matches the default ConfigMap watched by the operator.
- ConfigMap keys (`trivy.severity`, `trivy.ignoreUnfixed`, `trivy.timeout`, `trivy.dbRepository`, `trivy.resources.requests.cpu/memory`, `trivy.resources.limits.cpu/memory`) are all valid documented keys.
- `trivy.dbRepository: "ghcr.io/aquasecurity/trivy-db"` points to the canonical GHCR location of the Trivy DB (still valid alongside the chart's newer `mirror.gcr.io/aquasec/trivy-db` default).
- VulnerabilityReport status fields `report.summary.criticalCount` and `report.summary.highCount` are correct.
- Trivy CLI flags (`--severity`, `--exit-code`, `--format`, `--output`) are accurate.
- ValidatingWebhookConfiguration spec under `admissionregistration.k8s.io/v1` is structurally valid (apiGroups/apiVersions/operations/resources/clientConfig/failurePolicy/sideEffects/admissionReviewVersions all correct).
- Prometheus metric `trivy_image_vulnerabilities` with `severity` label (title-case values like "Critical") matches the operator's exported metrics.
- ServiceMonitor/PrometheusRule manifests use `monitoring.coreos.com/v1`, which is the correct apiVersion for the Prometheus Operator CRDs.

## Review Notes
- The "admission-webhook.yaml" example shows a `ValidatingWebhookConfiguration` pointing to a `trivy-webhook` service in `trivy-system`. This is a template — the Trivy Operator does not ship a built-in admission webhook service named `trivy-webhook`, so readers would need to deploy a separate component (or use a tool like Kyverno/OPA Gatekeeper) to actually back this endpoint. The post does not claim otherwise, but readers new to admission webhooks may need to fill in that piece themselves.
- The post sets `trivy.dbRepository` to `ghcr.io/aquasecurity/trivy-db`. The current default in the Helm chart is `aquasec/trivy-db` with `mirror.gcr.io` as the registry (to avoid Docker Hub rate limits). The GHCR location used in the post is still valid and is the original canonical location, but readers should be aware that the chart's default has shifted toward `mirror.gcr.io`.
- `operator.scanJobTimeout` default in the chart is `5m`; the post overrides it to `10m`, which is fine.
- `trivy.severity: "CRITICAL,HIGH,MEDIUM"` excludes LOW and UNKNOWN — a reasonable default for noise reduction but worth being explicit about if a reader wants full coverage.
