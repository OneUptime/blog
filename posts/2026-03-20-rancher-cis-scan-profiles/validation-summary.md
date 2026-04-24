# Validation Summary: How to Configure CIS Scan Profiles in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Compliance
- Kubernetes
- CIS Benchmarks
- `kubectl`
- Rancher `ClusterScanProfile` and `ClusterScan` custom resources

## Sources Consulted
- Rancher Compliance overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher Compliance configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher Compliance run-a-scan guide: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Rancher Compliance RBAC guide: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/compliance-scans/rbac-for-compliance-scans
- SUSE support KB, migration from Rancher CIS Benchmark to Rancher Compliance: https://www.suse.com/support/kb/doc?id=000021939
- Rancher compliance-operator `ClusterScanProfile` CRD (release/v1.4): https://github.com/rancher/compliance-operator/blob/release/v1.4/crds/clusterscanprofile.yaml
- Rancher compliance-operator `ClusterScan` CRD (release/v1.4): https://github.com/rancher/compliance-operator/blob/release/v1.4/crds/clusterscan.yaml
- Rancher compliance-operator API types (release/v1.4): https://github.com/rancher/compliance-operator/blob/release/v1.4/pkg/apis/compliance.cattle.io/v1/types.go
- Rancher compliance-operator default profile config map (release/v1.4): https://github.com/rancher/compliance-operator/blob/release/v1.4/chart/templates/configmap.yaml
- Rancher compliance-operator built-in RKE2 scan profile template (release/v1.4): https://github.com/rancher/compliance-operator/blob/release/v1.4/chart/templates/scanprofile-rke2-cis-1.10.yaml
- Rancher security-scan RKE2 CIS 1.10 `master.yaml`: https://github.com/rancher/security-scan/blob/main/package/cfg/rke2-cis-1.10/master.yaml
- Rancher security-scan RKE2 CIS 1.10 `controlplane.yaml`: https://github.com/rancher/security-scan/blob/main/package/cfg/rke2-cis-1.10/controlplane.yaml
- Rancher security-scan RKE2 CIS 1.10 `etcd.yaml`: https://github.com/rancher/security-scan/blob/main/package/cfg/rke2-cis-1.10/etcd.yaml
- Rancher security-scan RKE2 CIS 1.10 `node.yaml`: https://github.com/rancher/security-scan/blob/main/package/cfg/rke2-cis-1.10/node.yaml
- Rancher security-scan RKE2 CIS 1.10 `policies.yaml`: https://github.com/rancher/security-scan/blob/main/package/cfg/rke2-cis-1.10/policies.yaml

## Issues Found
- The post used the retired Rancher CIS Benchmark app and `cis.cattle.io/v1` API as if they were current. Updated the post to the current Rancher v2.12+ Compliance flow using `rancher-compliance` and `compliance.cattle.io/v1`.
- The examples treated `ClusterScanProfile` and `ClusterScan` as namespaced resources by using `-A`, `-n cattle-cis-system`, and `metadata.namespace`. The official CRDs define both resources with `scope: Cluster`, so those flags and namespace fields were removed.
- The built-in profile names were outdated. Replaced the old `rke*-cis-1.6` / `-hardened` names with current built-in `ClusterScanProfile` names from the official operator chart.
- The post implied that `benchmarkVersion` selected an existing profile. Corrected the wording so it reflects the actual schema: `benchmarkVersion` selects a benchmark configuration, while `scanProfileName` selects the profile.
- Several skip-list comments described the wrong controls. For example, the original PCI DSS section labeled `5.1.1` and `5.1.2` as container image checks, but the official benchmark config defines them as RBAC and secret-access checks. Updated the examples and control descriptions to match the official RKE2 CIS 1.10 benchmark files.

## Review Notes
- Rancher v2.11 and earlier still use the older `rancher-cis-benchmark` app and `cis.cattle.io` API group. The corrected post now matches Rancher v2.12+.
- Rancher documentation and current operator/chart sources are not perfectly aligned on every example profile/version string. For exact CRD names and resource scope, the operator release branch and benchmark config files were treated as the source of truth.
