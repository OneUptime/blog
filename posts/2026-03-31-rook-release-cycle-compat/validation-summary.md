# Validation Summary: How to Understand Rook-Ceph Release Cycle and Version Compatibility

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes
- Helm
- kubectl CLI

## Sources Consulted
- Rook v1.15 Quickstart Guide — https://rook.io/docs/rook/v1.15/Getting-Started/quickstart/ (confirmed K8s 1.26–1.31)
- Rook v1.14 Quickstart Guide — https://rook.io/docs/rook/v1.14/Getting-Started/quickstart/ (confirmed K8s 1.25–1.30)
- Rook v1.13 Quickstart Guide — https://rook.io/docs/rook/v1.13/Getting-Started/quickstart/ (confirmed K8s 1.23–1.29)
- Rook v1.12 Quickstart Guide — https://rook.io/docs/rook/v1.12/Getting-Started/quickstart/ (confirmed K8s 1.22–1.28)
- Rook v1.15 CephCluster CRD docs — https://rook.io/docs/rook/v1.15/CRDs/Cluster/ceph-cluster-crd/ (confirmed supported Ceph versions: Quincy and Reef; Squid requires allowUnsupported)
- Rook v1.14 CephCluster CRD docs — https://rook.io/docs/rook/v1.14/CRDs/Cluster/ceph-cluster-crd/ (confirmed supported Ceph versions: Quincy and Reef)
- Rook v1.13 CephCluster CRD docs — https://rook.io/docs/rook/v1.13/CRDs/Cluster/ceph-cluster-crd/ (confirmed supported Ceph versions: Quincy and Reef)
- Rook v1.15 Upgrade Guide — https://rook.io/docs/rook/v1.15/Upgrade/rook-upgrade/ (confirmed min K8s 1.26, sequential upgrade requirement)
- Rook Release Cycle docs — https://rook.io/docs/rook/latest/Getting-Started/release-cycle/
- Rook GitHub Releases — https://github.com/rook/rook/releases (confirmed latest is v1.19.3)

## Issues Found

### 1. Incorrect Ceph version support for Rook v1.15
- **What was wrong:** The post claimed Rook v1.15 supports Ceph v18 (Reef) and v19 (Squid). According to the official Rook v1.15 CephCluster CRD documentation, the supported versions are Quincy (v17) and Reef (v18). Squid (v19) requires setting `allowUnsupported: true` and is not officially supported.
- **What was changed:** Updated the Ceph Version Support table to list v17 (Quincy) and v18 (Reef) for Rook v1.15. Updated the mermaid flowchart diagram to remove the Squid (v19) node and show v1.15 linking to Reef (v18) and Quincy (v17). Also added the missing v1.13 -> Reef (v18) link that was absent from the diagram.

### 2. Incorrect Kubernetes compatibility matrix (all four rows had errors)
- **What was wrong:** Every row in the Kubernetes compatibility table had the maximum K8s version inflated by +1, and v1.13/v1.12 also had minimum versions inflated by +1.
  - v1.15: blog said 1.26–1.32, actual is 1.26–1.31
  - v1.14: blog said 1.25–1.31, actual is 1.25–1.30
  - v1.13: blog said 1.24–1.30, actual is 1.23–1.29
  - v1.12: blog said 1.23–1.29, actual is 1.22–1.28
- **What was changed:** Corrected all four rows to match the official Rook documentation for each version.

### 3. Deprecated `kubectl version --short` flag
- **What was wrong:** The post used `kubectl version --short`, which was deprecated in Kubernetes 1.28 and removed in later versions. Since the post discusses K8s 1.26+, readers on newer clusters would see a deprecation warning or error.
- **What was changed:** Removed the `--short` flag, changing the command to `kubectl version`.

## Review Notes
- The post labels Rook v1.15 as "current," but the actual latest stable Rook release is v1.19.3 (as of March 2025). The version examples in the post are significantly outdated. While the general concepts about the release cycle remain valid, readers should consult the current Rook documentation for up-to-date version matrices.
- The `allowUnsupported` field explanation and YAML example are correct per the official CRD documentation.
- The upgrade path rules (no skipping major versions, upgrade Rook before Ceph) are confirmed by official documentation.
- The claim that the v1 CRD API has been stable since Rook 1.3 is approximately correct.
- The release lifecycle description (last two major versions maintained) aligns with official docs stating "the most recent two minor Rook releases are actively maintained."
- The Helm chart commands are syntactically correct.
