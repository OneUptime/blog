# Validation Summary: How to Automate Security Scanning in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Compliance Scans
- NeuVector
- Trivy
- GitHub Actions
- Falco
- Prometheus Operator
- Kubernetes audit logging

## Sources Consulted
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload docs: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Rancher compliance scan configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher compliance scan scheduling docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher compliance report docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/view-reports
- Rancher compliance overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- NeuVector REST API and automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector build-phase scanning docs: https://open-docs.neuvector.com/scanning/build/
- NeuVector ConfigMap automation docs: https://open-docs.neuvector.com/deploying/production/configmap/
- NeuVector policy modes docs: https://open-docs.neuvector.com/policy/modes/
- NeuVector official OpenAPI spec: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- Falco Kubernetes deployment docs: https://falco.org/docs/setup/kubernetes/
- Falco Kubernetes audit plugin docs: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco Helm chart README: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/README.md
- Falco Helm values: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/values.yaml
- Kubernetes auditing docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- NeuVector Helm monitor chart README: https://raw.githubusercontent.com/neuvector/neuvector-helm/master/charts/monitor/README.md
- NeuVector Helm dashboard metrics: https://raw.githubusercontent.com/neuvector/neuvector-helm/master/charts/monitor/dashboards/nv_dashboard.json

## Issues Found
- The Trivy GitHub Actions example used `aquasecurity/trivy-action@master`, `github/codeql-action/upload-sarif@v2`, and omitted the permissions required for SARIF uploads. I updated it to a current tagged Trivy action, `upload-sarif@v4`, and added `security-events: write`.
- The NeuVector CI script used the wrong auth path, the wrong scan endpoint, the wrong auth header, and shell quoting that prevented password interpolation. I replaced it with a NeuVector REST API example that uses `/v1/auth`, `/v1/scan/repository`, `X-Auth-Token`, proper JSON construction with `jq`, and logout cleanup.
- The Rancher CIS scan example used older `cis.cattle.io/v1` resources and `ScheduledClusterScan`. Current Rancher documentation uses `rancher-compliance` and `compliance.cattle.io/v1` `ClusterScan` resources with `scheduledScanConfig`, so I updated the manifest accordingly.
- The Rancher report export example used outdated resources and tried to download a PDF from a Rancher UI API path. Current Rancher compliance reports are exposed as `ClusterScanReport` resources and are downloadable in CSV from the UI; the verbose report is available from `.spec.reportJSON`. I replaced the script with a `kubectl`-based export that matches the documented resources.
- The NeuVector runtime-enforcement script attempted to patch groups after a time threshold and used default credentials. NeuVector already documents automatic Discover-to-Monitor and Monitor-to-Protect promotion via init ConfigMap settings, so I replaced the unsupported script with the documented `Mode_Auto_D2M` and `Mode_Auto_M2P` configuration.
- The Falco example used an obsolete DaemonSet pattern and legacy command-line arguments for Kubernetes audit processing. Current Falco uses the `k8saudit` plugin and Helm values-based deployment, so I replaced that section with the supported chart configuration pattern.
- The dashboard alert rules referenced undocumented metric names. I replaced them with NeuVector exporter metrics that are present in the official NeuVector monitoring chart and clarified that Rancher compliance scan alerting should use Rancher’s built-in scheduled-scan alerting.

## Review Notes
- The Rancher compliance example is version-sensitive. Rancher’s newer releases use the `rancher-compliance` app and `compliance.cattle.io/v1`; older `rancher-cis-benchmark` examples are still relevant only for older Rancher versions.
- Falco audit-log collection requires kube-apiserver audit webhook configuration in addition to the Falco chart values. The post now reflects the supported Falco side of that setup, but cluster operators still need to configure the Kubernetes audit backend separately.
- The NeuVector ConfigMap snippet uses the namespace where NeuVector is installed. Upstream docs often show `neuvector`, while Rancher deployments commonly use a Rancher-managed namespace.
