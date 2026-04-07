# Validation Summary: How to Create a Ceph Upgrade Runbook

## Status
validated

## Post Type
Guide / Runbook

## Technologies Covered
- Rook (v1.14.0)
- Ceph (Reef v18.2.x)
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Rook official upgrade documentation: https://rook.io/docs/rook/latest-release/Upgrade/rook-ceph-upgrade/
- Ceph Reef release notes and upgrade documentation: https://docs.ceph.com/en/reef/releases/
- Rook GitHub repository for manifest URL patterns: https://github.com/rook/rook
- Ceph container image registry: https://quay.io/repository/ceph/ceph

## Issues Found

### 1. CRD and Operator upgrade order was reversed (Critical)
- **What was wrong:** The post had "Upgrade the Rook Operator" as Step 1 and "Verify CRD Updates" as Step 2. Per Rook's official upgrade documentation, CRDs must be applied *before* upgrading the operator. The new operator version may reference CRD fields that do not yet exist, causing errors on startup.
- **What was changed:** Swapped Steps 1 and 2 so CRDs are updated first, then the operator is upgraded. Updated step titles and descriptions to reflect the correct ordering. Also corrected the summary paragraph to list the steps in the right sequence.

### 2. Rollback procedure missing downgrade caveat
- **What was wrong:** The rollback section stated that reverting the Ceph image would roll back daemons, without noting that Ceph version downgrades are not always safe. Internal data structures (e.g., OSD on-disk format, monitor store) may be upgraded during the new version's startup and cannot be safely reverted.
- **What was changed:** Added a warning that Ceph downgrades may not be safe if internal data formats were upgraded, and recommending testing rollback in non-production environments first.

## Review Notes
- All kubectl and ceph CLI commands are syntactically correct and use standard flags.
- The Helm repo name `rook-release` and chart name `rook-ceph` are correct per Rook's official Helm installation docs.
- The Ceph container image `quay.io/ceph/ceph:v18.2.4` is a valid Reef release tag.
- The CephCluster spec YAML structure is correct for Rook's CRD schema.
- The post uses Rook v1.14.0 as the example version, which is a valid release. Users should substitute their target version.
- The `.status.ceph` jsonpath query on the CephCluster resource is a valid way to inspect Ceph status from Kubernetes.
