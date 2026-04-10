# Validation Summary: How to Check Minimum Kubernetes Version for Rook Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Kubernetes (kubectl CLI, API versions, feature gates)
- Bash scripting
- Python 3 (for version parsing)

## Sources Consulted
- Kubernetes `kubectl version` documentation and changelog for deprecation of `--short` flag (deprecated in v1.28, removed in v1.29)
- Rook prerequisites documentation at `https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/`
- Kubernetes feature gate lifecycle documentation (CSIMigration GA in 1.23, VolumeSnapshotDataSource GA in 1.20)
- Kubernetes version skew policy documentation
- kubectl custom-columns output format documentation

## Issues Found
1. **`kubectl version --short` is deprecated and removed**: The post used `kubectl version --short` to check the Kubernetes version. The `--short` flag was deprecated in kubectl v1.28 and removed in v1.29. Since the post discusses Kubernetes 1.25-1.27+ and users may have a newer kubectl client version, this could produce warnings or errors. Changed to `kubectl version` (which now outputs the short format by default in modern kubectl) and added a note explaining the deprecation. Also fixed the same reference in the Summary section.

## Review Notes
- The feature gates section mentions `CSIMigration` (GA in 1.23, gate removed in 1.27) and `VolumeSnapshotDataSource` (GA in 1.20, gate removed in 1.22). For the Kubernetes versions relevant to Rook 1.13-1.15 (K8s 1.25+), these feature gates no longer exist and cannot be disabled. The section is not technically wrong (it correctly states they are GA/enabled by default) but the advice to check them is unnecessary for the K8s versions in scope. Left as-is since it doesn't cause harm and serves as educational context.
- The Rook version requirements table (v1.13 -> K8s 1.25, v1.14 -> K8s 1.26, v1.15 -> K8s 1.27) appears accurate based on Rook release documentation, and the post appropriately disclaims that the table may be outdated.
- The automation script's version comparison logic is correct and handles edge cases like the trailing `+` in minor version strings from some Kubernetes distributions.
- All kubectl commands (`get nodes`, `api-versions`, `get crd`, `exec`) use correct syntax and flags.
- The prerequisites URL path structure (`Getting-Started/Prerequisites/prerequisites/`) matches the Rook docs mkdocs site layout.
