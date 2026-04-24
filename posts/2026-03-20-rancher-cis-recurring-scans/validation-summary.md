# Validation Summary: How to Schedule Recurring CIS Scans in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Rancher Compliance / compliance scans
- Kubernetes
- `kubectl`
- Cron scheduling
- Rancher Monitoring / Prometheus alerting
- GitHub Actions
- CIS Benchmarks

## Sources Consulted
- Rancher docs: Run a Scan Periodically on a Schedule: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher docs: Run a Scan: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Rancher docs: View Reports: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/view-reports
- Rancher docs: Enable Alerting for Rancher Compliance: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/enable-alerting-for-rancher-compliance
- Rancher docs: Configuration reference for Compliance Scans: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher docs: Roles-based Access Control for Compliance Scans: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/compliance-scans/rbac-for-compliance-scans
- Rancher source: `ClusterScan` CRD (`compliance.cattle.io/v1`): https://github.com/rancher/compliance-operator/blob/release/v1.4/crds/clusterscan.yaml
- Rancher source: `ClusterScanReport` CRD: https://github.com/rancher/compliance-operator/blob/release/v1.4/crds/clusterscanreport.yaml
- Rancher source: default built-in scan profiles (`cis-1.12-profile`): https://github.com/rancher/compliance-operator/blob/release/v1.4/chart/templates/configmap.yaml
- Rancher source: generated alert rule template for scheduled scan alerting: https://github.com/rancher/compliance-operator/blob/release/v1.4/pkg/securityscan/alert/templates/prometheusrule.template
- Rancher source: compliance report schema used by `reportJSON`: https://github.com/rancher/security-scan/blob/main/pkg/kb-summarizer/report/report.go
- Rancher API reference/source for downstream cluster API paths: https://github.com/rancher/rancher/wiki/Rancher-API-Extensions
- GitHub Docs: Workflow syntax for GitHub Actions: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post used the older Rancher CIS Benchmark product/UI naming (`CIS Benchmark`, `cis.cattle.io/v1`) instead of the current Rancher Compliance naming and API group. I updated the UI steps, prerequisites, and manifests to match current Rancher docs and CRDs.
- The `ClusterScan` examples incorrectly set `metadata.namespace: default`, but the current `ClusterScan` and `ClusterScanReport` CRDs are cluster-scoped. I removed the namespace and corrected the `kubectl` examples so they no longer use namespaced assumptions or `-A`.
- The profile names in the examples were outdated (`rke2-cis-1.6-profile-hardened`). I updated them to a current built-in profile (`cis-1.12-profile`) from the maintained `release/v1.4` chart.
- The status field names in the monitoring commands were wrong (`nextScanAt`, `lastRunAt`). I corrected them to the current fields exposed by the CRD: `NextScanAt` and `lastRunTimestamp`.
- The "multiple schedules" example described a namespace-targeted scan, but `ClusterScan` is cluster-wide. I corrected the wording and added the current Rancher limitation that only one compliance scan runs at a time per cluster, with overlapping scans queued as `Pending`.
- The alerting example created a custom `PrometheusRule` with unsupported metric names. Current Rancher Compliance alerting is configured on scheduled scans via `scheduledScanConfig.scanAlertRule` after enabling alerts in the chart. I replaced the example with the built-in alert flow.
- The report comparison script assumed the old resource/API naming and parsed report data in a brittle way. I updated it to fetch the full `ClusterScanReport` object, parse `spec.reportJSON` correctly, and treat `fail`, `mixed`, and `warn` as non-passing states based on the current report schema.
- The GitHub Actions example used an outdated API group and an incomplete Rancher endpoint. I corrected it to use Rancher's downstream-cluster Kubernetes API proxy at `/k8s/clusters/<cluster-id>/apis/compliance.cattle.io/v1/clusterscans` and switched from a fixed `metadata.name` to `generateName` so repeated runs do not fail with `AlreadyExists`.

## Review Notes
- Rancher docs currently describe the current product as `Compliance`, even though the post title and theme are still specifically about CIS benchmark scans. The title remains technically reasonable because CIS is the benchmark family being scheduled.
- There is a docs-versus-source discrepancy around alert route matching labels: Rancher docs mention `job: rancher-compliance-scan`, while the `release/v1.4` operator template currently labels generated scan alerts with `job: rancher-compliance`. The post was adjusted to avoid hard-coding that matcher until Rancher's documentation and source converge.
- I verified the examples against official docs and Rancher source, but I did not execute the Kubernetes or Rancher commands in a live cluster during review.
