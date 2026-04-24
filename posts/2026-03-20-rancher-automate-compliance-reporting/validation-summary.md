# Validation Summary: How to Automate Compliance Reporting in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Compliance (`rancher-compliance`)
- Rancher Compliance Operator (`compliance.cattle.io/v1`)
- NeuVector
- Kubernetes audit logging
- Kubernetes CronJob
- Grafana
- Prometheus
- Python
- Bash
- AWS S3

## Sources Consulted
- Rancher Compliance Scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher Compliance configuration reference: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher guide for scheduled scans: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher Compliance Operator API types: https://github.com/rancher/compliance-operator/blob/main/pkg/apis/compliance.cattle.io/v1/types.go
- Rancher Compliance chart README: https://github.com/rancher/charts/tree/main/charts/rancher-compliance
- NeuVector REST API and automation guide: https://open-docs.neuvector.com/automation/automation/
- NeuVector scanning and compliance overview: https://open-docs.neuvector.com/scanning/scanning/
- NeuVector reporting and notifications: https://open-docs.neuvector.com/reporting/reporting/
- NeuVector REST API schema: https://github.com/neuvector/neuvector/blob/master/controller/api/apis.yaml
- NeuVector Prometheus exporter metrics: https://github.com/neuvector/prometheus-exporter
- Kubernetes auditing guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit event schema reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/

## Issues Found
- The post used the deprecated Rancher CIS API group and an invalid `ScheduledClusterScan` kind. I updated the example to the current `compliance.cattle.io/v1` `ClusterScan` resource with `scheduledScanConfig`, and replaced the old profile example with a current built-in RKE2 profile.
- The Python aggregation script treated `ClusterScan` as namespaced, used `-A` against a cluster-scoped resource, and used the namespace as the cluster identifier. I changed it to read cluster-scoped `clusterscans`, use the scan resource name, and keep the example aligned with how Rancher stores scan resources.
- The Python script calculated the overall pass rate differently from the per-scan pass rate, which could overstate results when warnings or skipped checks existed. I fixed the overall pass-rate calculation to use the total test count.
- The `get_failed_controls` helper referenced a non-existent `status.lastRunScanStats` field. I updated it to parse `ClusterScanReport.spec.reportJSON`, which is how Rancher stores the rendered compliance report.
- The NeuVector shell example used the wrong authentication path, the wrong auth header, and undocumented compliance endpoints. I replaced it with documented `POST /v1/auth`, `X-Auth-Token`, `POST /v1/scan/platform/platform`, `GET /v1/scan/status`, and `GET /v1/scan/platform/platform` usage.
- The audit log analyzer could fail on missing or malformed timestamps and used a less portable default path. I added timestamp validation, made the comparison timezone-aware, and aligned the default path with Kubernetes' documented audit log example.
- The CronJob example included unused Rancher API environment variables and used a wildcard file path for single-file upload/email steps. I removed the unused variables, made the report filename explicit, and added fail-fast shell behavior.
- The Grafana example referenced metric names that are not documented built-in Rancher or NeuVector metrics. I changed it to clearly use a custom compliance metric from the reporting pipeline plus an official NeuVector exporter metric.

## Review Notes
- Rancher's current documentation uses the `rancher-compliance` app and the `compliance.cattle.io/v1` API group. Older `rancher-cis-benchmark` and `cis.cattle.io/v1` examples are version-specific and should not be presented as current default behavior in a 2026 guide.
- NeuVector documents PCI, HIPAA, GDPR, and similar compliance templates in the UI. The corrected API example focuses on documented scan automation endpoints rather than undocumented UI export flows.
- The Kubernetes audit log path is configurable through `kube-apiserver --audit-log-path`, so operators may need to adjust the sample path for their environment.
