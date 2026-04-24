# Validation Summary: How to Generate Compliance Reports in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Rancher Compliance Scans (`rancher-compliance`)
- Kubernetes
- `kubectl`
- Rancher `ClusterScan` and `ClusterScanReport` custom resources
- Python 3
- JSON
- HTML reporting

## Sources Consulted
- Rancher Compliance Scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher View Reports guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/view-reports
- Rancher Run a Scan guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Rancher Run a Scan Periodically on a Schedule guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher Compliance RBAC reference: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/compliance-scans/rbac-for-compliance-scans
- Rancher compliance-operator `ClusterScan` CRD: https://github.com/rancher/compliance-operator/blob/main/crds/clusterscan.yaml
- Rancher compliance-operator `ClusterScanReport` CRD: https://github.com/rancher/compliance-operator/blob/main/crds/clusterscanreport.yaml
- Rancher compliance-operator scan handling logic: https://github.com/rancher/compliance-operator/blob/main/pkg/securityscan/scanHandler.go
- Rancher compliance-operator report creation logic: https://github.com/rancher/compliance-operator/blob/main/pkg/securityscan/jobHandler.go
- Rancher security-scan external report schema: https://github.com/rancher/security-scan/blob/main/pkg/kb-summarizer/report/report.go
- Rancher security-scan summarizer state handling: https://github.com/rancher/security-scan/blob/main/pkg/kb-summarizer/summarizer/summarizer.go

## Issues Found
- The post was written against Rancher’s legacy CIS Benchmark flow (`rancher-cis-benchmark`, `CIS Benchmark` UI, and `cis.cattle.io` resources). I updated it to Rancher’s current Compliance Scans workflow, including the `rancher-compliance` app, the `Compliance -> Scan` UI path, and `clusterscanreports.compliance.cattle.io` commands.
- The introduction implied the Rancher UI exports reports in multiple formats. Current Rancher documentation says the UI download is CSV. I corrected the wording and kept the custom JSON/HTML generation in the CLI and Python sections.
- The prerequisites were too vague about access requirements. I updated them to reflect that users need permissions to view and download `ClusterScanReport` resources, which aligns with Rancher’s documented RBAC model.
- The `kubectl` examples used the legacy `clusterscanreport` resource name. I replaced them with the current fully qualified `clusterscanreports.compliance.cattle.io` resource.
- The summary Python script derived counts by iterating check states and ignored valid report states such as `notApplicable` and `mixed`. I corrected it to use the report’s top-level counters, include `notApplicable`, and surface `mixed` checks as items requiring review.
- The HTML report generator only handled `pass`, `fail`, `skip`, and `warn`, so it could miscount results or fail on other valid report states. I updated it to handle Rancher’s current report schema, include `notApplicable`, include `mixed` checks in the review table, and escape HTML output safely.
- The automation section used a custom Kubernetes `CronJob` in an incorrect namespace and described it as generating Rancher reports. Rancher’s supported mechanism is a scheduled `ClusterScan` using `spec.scheduledScanConfig.cronSchedule` and `retentionCount`. I replaced the unsupported example with the documented Rancher-native approach.

## Review Notes
- Rancher’s current Compliance Scans feature uses the `compliance.cattle.io` API group. Older Rancher 2.10 and 2.11 documentation used the legacy CIS Benchmark app and the `cis.cattle.io` API group.
- The UI download is CSV. The JSON used by the Python scripts comes from the `ClusterScanReport.spec.reportJSON` field retrieved via `kubectl`.
- Rancher also stores verbose actual-value data in `actual_value_map_data`, which the official View Reports guide shows how to decode when deeper evidence is needed for audits.
