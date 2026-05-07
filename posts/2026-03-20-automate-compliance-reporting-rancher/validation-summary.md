# Validation Summary: How to Automate Compliance Reporting in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Compliance Scans
- Kubernetes
- `kubectl`
- Python
- Trivy Operator
- Grafana
- Slack incoming webhooks
- Amazon S3

## Sources Consulted
- Rancher Compliance Scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher compliance configuration reference: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher compliance report retrieval: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/compliance-scan-guides/view-reports
- Rancher compliance operator CRD/types source: https://github.com/rancher/compliance-operator/blob/main/pkg/apis/compliance.cattle.io/v1/types.go
- Rancher compliance operator `ClusterScan` CRD: https://github.com/rancher/compliance-operator/blob/main/crds/clusterscan.yaml
- Rancher compliance operator `ClusterScanReport` CRD: https://github.com/rancher/compliance-operator/blob/main/crds/clusterscanreport.yaml
- Rancher compliance operator metrics source: https://github.com/rancher/compliance-operator/blob/main/pkg/securityscan/controller.go
- Kubernetes `kubectl cluster-info dump` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/kubectl_cluster-info_dump/
- Kubernetes encryption at rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit event schema: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1
- Kubernetes RBAC authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authentication model: https://kubernetes.io/docs/concepts/security/controlling-access/
- Trivy Operator CRD overview: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/
- Trivy Operator metrics: https://aquasecurity.github.io/trivy-operator/v0.22.0/tutorials/integrations/metrics/
- Trivy Operator Helm install namespace example: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Slack incoming webhooks: https://api.slack.com/messaging/webhooks

## Issues Found
- Step 1 used the outdated Rancher CIS API group (`cis.cattle.io/v1`), an outdated hard-coded profile name, the wrong namespace, and a non-current `ClusterScanSummary` resource. I replaced it with the current Rancher `compliance.cattle.io/v1` `ClusterScan` format and native `scheduledScanConfig`, which is the supported way to schedule recurring scans.
- Step 2 reported `users_without_mfa`, which cannot be derived from Kubernetes RBAC data because Kubernetes does not expose user objects or MFA state through the API. I removed that field, renamed `privileged_namespaces` to `privileged_pods`, added `check=True`, and implemented collection of service accounts bound to ClusterRoles through both `ClusterRoleBinding` and `RoleBinding`.
- Step 4 was not valid Python because it omitted `import json`. It also labeled all pod exec activity as `privileged_exec` even though the code did not verify pod privilege. I fixed the import, renamed the finding to `pod_exec`, switched exec detection to the audit event `subresource`, added `patch` to RBAC change detection, and implemented the previously empty `failed_auth` and `admin_activity` findings.
- Step 5 used `kubectl cluster-info dump` as though it produced a single JSON file, which does not match the command reference. I changed it to use `--output-directory`. The original secret-encryption check was also invalid because encryption-at-rest status is determined from kube-apiserver configuration, not by querying `/api/v1/namespaces/kube-system`. I replaced it with collection of kube-apiserver pod specs plus a note describing the documented verification point. I also updated the obsolete `clusterscansummaries` resource to `clusterscanreports.compliance.cattle.io`.
- Step 6 referenced Rancher compliance metrics that do not exist (`cis_benchmark_pass_count` and `cis_benchmark_total_count`) and used the wrong Trivy severity label casing (`CRITICAL`). I replaced the PromQL with the metric names exported by Rancher’s compliance operator and Trivy Operator.
- The conclusion said vulnerability summaries run daily, but the CronJob in Step 3 runs weekly. I corrected the conclusion to match the configured schedule.
- Step 3 posted JSON to Slack without setting `Content-Type: application/json`, which is required by Slack’s incoming webhook documentation. I added the correct header.

## Review Notes
- The post now aligns with Rancher’s current compliance operator naming and CRDs, but the custom images, service accounts, AWS credentials, and report-generation scripts are still environment-specific placeholders and will require implementation-specific RBAC and secret management.
- The kube-apiserver encryption evidence step is only applicable to self-managed control planes that expose kube-apiserver pod configuration. Hosted control planes may require provider-specific evidence collection instead.
