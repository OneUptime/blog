# Validation Summary: How to Plan Ceph Version Upgrade Path

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Pacific 16.x, Quincy 17.x, Reef 18.x, Squid 19.x)
- Rook (v1.15.0)
- Kubernetes (kubectl)
- Helm

## Sources Consulted
- Ceph Releases Index: https://docs.ceph.com/en/latest/releases/
- Ceph Squid Release Notes (upgrade section "Upgrading from Quincy or Reef"): https://docs.ceph.com/en/latest/releases/squid/
- Ceph CLI Man Page (`ceph osd blocked-by`): https://docs.ceph.com/en/latest/man/8/ceph/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Operator Helm Chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook GitHub Releases (v1.15.0): https://github.com/rook/rook/releases
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Ceph v18.2.0 Reef release announcement: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Quay.io Ceph container repository: https://quay.io/repository/ceph/ceph

## Issues Found

1. **Incorrect claim about skipping major releases**: The post stated "Ceph does not support skipping major releases during upgrades" and listed a required sequence of Pacific -> Quincy -> Reef -> Squid. This is incorrect. Ceph supports upgrading from up to two major releases back (N-2 to N). The Squid release notes explicitly document "Upgrading from Quincy or Reef," meaning Quincy (17.x) can upgrade directly to Squid (19.x), skipping Reef. Fixed the overview, upgrade sequences, and summary to reflect the correct N-2 upgrade policy. The shortest path from Pacific to Squid is now shown as Pacific -> Reef -> Squid (two hops instead of three).

2. **Misleading "Slow Ops" label for `ceph osd blocked-by`**: The script labeled the `ceph osd blocked-by` command output as "Slow Ops." This command actually shows which OSDs are blocking peering for other OSDs, not slow operations. Changed the label to "Blocked OSDs" to accurately describe the command output.

## Review Notes
- All other commands (`ceph version`, `ceph status`, `ceph osd stat`, `ceph pg stat`) are correct and valid.
- The `disruptionManagement` CRD fields (`managePodBudgets`, `osdMaintenanceTimeout`, `pgHealthCheckTimeout`) are all confirmed valid in the Rook CephCluster spec.
- Rook v1.15.0 exists and supports Ceph Reef (v18) and Squid (v19) as referenced.
- The Helm chart reference `rook-release/rook-ceph` and `--set image.tag=v1.15.0` are correct.
- The container image `quay.io/ceph/ceph:v18.2.0` is a valid, real image tag for Ceph Reef.
- For a more comprehensive slow ops check, readers could additionally run `ceph health detail` which surfaces slow operation warnings. This was not added to avoid scope creep.
