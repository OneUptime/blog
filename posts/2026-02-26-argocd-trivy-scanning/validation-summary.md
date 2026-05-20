# Validation Summary: How to Integrate Trivy Scanning with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications, sync hooks, sync waves, and notifications
- Kubernetes Jobs, ServiceAccounts, RBAC, ConfigMaps, volumes, and init containers
- Aqua Trivy CLI image and config scanning
- Aqua Trivy Helm chart
- Aqua Trivy Operator and VulnerabilityReport custom resources
- Helm chart values for GitOps deployment

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications Slack templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Aqua Trivy CLI image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Aqua Trivy repository/config scanning documentation: https://trivy.dev/v0.62/docs/references/configuration/cli/trivy_repository/
- Aqua Trivy Operator Trivy scanner documentation: https://aquasecurity.github.io/trivy-operator/v0.27.1/docs/vulnerability-scanning/trivy/
- Aqua Helm chart repository index: https://aquasecurity.github.io/helm-charts/index.yaml
- Aqua Trivy chart `values.yaml` for chart version 0.7.0: https://github.com/aquasecurity/helm-charts/releases/download/trivy-0.7.0/trivy-0.7.0.tgz
- Aqua Trivy Operator chart `values.yaml` for chart version 0.21.0: https://github.com/aquasecurity/helm-charts/releases/download/trivy-operator-0.21.0/trivy-operator-0.21.0.tgz

## Issues Found
- The Trivy server Helm values used non-existent chart keys (`trivy.mode`, `server.replicas`, `server.resources`, `cacheDir`, and `dbUpdateInterval`) for the referenced `trivy` chart. Updated the snippet to use the chart's actual root-level `replicaCount`, `resources`, `persistence`, `service`, and `trivy.skipDBUpdate` keys.
- The PreSync image scan gate depended on `jq` inside the Trivy container image. Replaced the JSON parsing path with Trivy's supported `--exit-code 1` behavior for critical findings.
- The Trivy Operator Helm values placed `vulnerabilityReportsPlugin` at the root. Moved it under `trivyOperator`, which is the correct chart key, and kept `scannerReportTTL` under `operator`.
- The VulnerabilityReport checking job depended on `jq` in the `bitnami/kubectl` image. Reworked the counting and workload listing to use `kubectl -o jsonpath` and shell arithmetic.
- The VulnerabilityReport RBAC example referenced `serviceAccountName: vuln-report-reader` but did not define the ServiceAccount. Added the missing ServiceAccount manifest.
- The config scanning job attempted to run `apk add` inside the Trivy image. Replaced that with an `alpine/git` init container that clones the repository into an `emptyDir` shared with the Trivy scan container.
- The `.trivyignore` mounting example defined only a volume and did not mount it into the container or pass it to Trivy. Added the `volumeMounts` example and a `--ignorefile /etc/trivy/.trivyignore` command.

## Review Notes
- The examples still use `:latest` image tags for brevity. In production GitOps workflows, pin Trivy, kubectl, and git helper images to immutable versions or digests.
- The Argo CD notification snippet defines the Slack template. A real deployment also needs a matching trigger/subscription or default trigger configuration and the Slack service secret.
