# Validation Summary: How to Handle skipUpgradeChecks and continueUpgradeAfterChecks in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.x)
- Kubernetes (kubectl CLI)
- CephCluster CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook upgrade guide: https://rook.io/docs/rook/latest/Upgrade/rook-ceph-upgrade/
- Ceph CLI reference for `ceph pg deep-scrub`: https://docs.ceph.com/en/reef/man/8/ceph/
- Rook source code for upgrade controller health check behavior

## Issues Found
- **Inconsistent description of default wait behavior**: Line 20 stated the operator "waits up to a configured timeout before reporting the upgrade as stuck," implying a finite timeout. However, the actual Rook behavior is that the operator waits indefinitely for health to return (polling at the configured health check interval) unless `skipUpgradeChecks` or `continueUpgradeAfterChecksEvenIfNotHealthy` is set. This contradicted the correct statement on line 68 ("wait indefinitely"). Fixed to say the operator "waits indefinitely for the cluster to become healthy before proceeding to the next daemon."

## Review Notes
- All CRD field names (`skipUpgradeChecks`, `continueUpgradeAfterChecksEvenIfNotHealthy`) are accurate and current in the Rook CephCluster spec.
- The `spec.healthCheck.daemonHealth` configuration shown is valid but controls health polling intervals, not upgrade-specific timeouts. The post's clarifying sentence acknowledges this distinction, which is adequate.
- The Ceph image tag `quay.io/ceph/ceph:v18.2.3` is a valid Reef release. Future readers should check for newer patch releases.
- All kubectl commands are syntactically correct and use appropriate flags.
