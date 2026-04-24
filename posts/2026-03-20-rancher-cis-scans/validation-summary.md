# Validation Summary: How to Run CIS Scans on Clusters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher CIS Benchmark app
- Kubernetes
- CIS Kubernetes Benchmark
- `kubectl`
- Rancher `ClusterScan`, `ClusterScanProfile`, and `ClusterScanReport` CRDs

## Sources Consulted
- Rancher v2.11: Install Rancher CIS Benchmark - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/install-rancher-cis-benchmark
- Rancher v2.11: Run a Scan - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/run-a-scan
- Rancher v2.11: Run a Scan Periodically on a Schedule - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher v2.11: View Reports - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/view-reports
- Rancher v2.10: Roles-based Access Control for CIS Scans - https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/cis-scans/rbac-for-cis-scans
- Rancher v2.12: Install Rancher Compliance - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/compliance-scan-guides/install-rancher-compliance
- `rancher/cis-operator` release/v1.4 CRDs and chart templates - https://github.com/rancher/cis-operator/tree/release/v1.4
- `clusterscan.yaml` CRD - https://raw.githubusercontent.com/rancher/cis-operator/release/v1.4/crds/clusterscan.yaml
- `clusterscanreport.yaml` CRD - https://raw.githubusercontent.com/rancher/cis-operator/release/v1.4/crds/clusterscanreport.yaml
- Default profile mapping in chart templates - https://raw.githubusercontent.com/rancher/cis-operator/release/v1.4/chart/templates/configmap.yaml
- Report generation and report ownership in `jobHandler.go` - https://raw.githubusercontent.com/rancher/cis-operator/release/v1.4/pkg/securityscan/jobHandler.go
- Report JSON schema and states in `rancher/security-scan` - https://raw.githubusercontent.com/rancher/security-scan/release/v0.5/pkg/kb-summarizer/report/report.go

## Issues Found
- The post treated CIS scans as a general Rancher feature for `v2.4 or later`, but Rancher `v2.12+` uses the separate Compliance app. I corrected the scope to Rancher `v2.11 and earlier` and clarified the Compliance app transition.
- The intro and description described CIS scanning as a built-in Rancher UI/CLI feature. I corrected this to the Rancher CIS Benchmark app plus the related Kubernetes CRDs.
- The prerequisites were too narrow on cluster types and inaccurate on permissions. I updated them to Rancher-managed Kubernetes clusters and corrected permissions to Cluster Owner or Global Administrator, or equivalent `cis-admin` access.
- The CRD verification snippet omitted `clusterscanbenchmarks.cis.cattle.io`. I added the missing CRD.
- The UI steps used the wrong navigation and outdated profile names such as `rke2-cis-1.6`. I updated the navigation to `CIS Benchmark > Scan` and replaced the stale profile list with guidance to use `Default` or an existing `ClusterScanProfile` appropriate to the cluster type and Kubernetes version.
- The `kubectl` example used a stale profile name. I changed it to first list available `ClusterScanProfile` resources and then use a clearly marked placeholder profile name.
- The results section incorrectly labeled `.status.lastRunScanProfileName` as the scan report and used `-A` with cluster-scoped resources. I corrected the command descriptions and removed the unnecessary all-namespaces flags.
- The result-state explanation was incomplete/inaccurate. I corrected the semantics for `Skip`, `Warn`, and `Not Applicable`, and added `Mixed`, which is a valid report state in the report schema.
- The scheduled scan example also used a stale profile name. I replaced it with the same explicit placeholder approach as the on-demand scan example.

## Review Notes
- The corrected post is technically sound for Rancher `v2.11` and earlier, which still use the legacy `rancher-cis-benchmark` app.
- Rancher `v2.12+` readers should use the Compliance app and the `Compliance > Scan` UI flow instead of the legacy CIS Benchmark flow.
- RKE1 is legacy/EOL in newer Rancher guidance, so future updates should consider whether the post should eventually be retitled or split by Rancher major feature generation.
