# Validation Summary: How to Restore a Rook Cluster After Namespace Deletion

## Status
validated

## Post Type
Guide / Disaster Recovery Tutorial

## Technologies Covered
- Rook (v1.14.0)
- Ceph
- Kubernetes (namespaces, CRDs, RBAC, PVs/PVCs)
- Helm
- OPA/Gatekeeper (mentioned for prevention)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest-release/
- Rook GitHub repository structure verification (confirmed `deploy/examples/` path valid for v1.8.0+): https://github.com/rook/rook
- Rook Helm chart index at https://charts.rook.io/release/index.yaml (confirmed chart versions use `v` prefix)
- Artifact Hub Rook chart listing: https://artifacthub.io/packages/helm/rook/rook-ceph
- Rook GitHub issues #3465 and #6089 (confirmed `/var/lib/rook/rook-ceph/rook-ceph.config` file path and contents)
- Kubernetes documentation on namespace deletion, CRD scoping, and RBAC: https://kubernetes.io/docs/

## Issues Found

1. **Helm chart version missing `v` prefix**: The `helm install` command used `--version 1.14.0`, but Rook Helm chart versions are published with the `v` prefix (e.g., `v1.14.0`). Changed to `--version v1.14.0`.

2. **Incorrect claim about CRDs surviving namespace deletion**: The post said "CRDs themselves may survive if they are cluster-scoped," implying CRDs could be namespace-scoped. CRDs (CustomResourceDefinitions) are always cluster-scoped and always survive namespace deletion. Changed to "CRDs (CustomResourceDefinitions) are cluster-scoped and will survive."

3. **Uncertain phrasing about StorageClasses**: The post said "StorageClasses (cluster-scoped) may survive." Since StorageClasses are cluster-scoped, they will always survive namespace deletion. Changed to "StorageClasses are cluster-scoped and will survive."

4. **Prevention section: misleading command and incorrect ResourceQuota claim**: The section titled "Prevention with RBAC" contained a command (`kubectl create clusterrolebinding ... --clusterrole=cluster-admin`) that grants cluster-admin to the Rook operator service account, which does not protect the namespace from deletion — it does the opposite by broadening permissions. The mention of "ResourceQuota policies" for preventing namespace deletion was also incorrect; ResourceQuotas limit resource consumption within a namespace, not namespace-level operations. Replaced the section with accurate guidance: restrict RBAC so only specific administrators have namespace delete permissions, and use admission webhooks or OPA/Gatekeeper for stronger protection.

## Review Notes
- The overall recovery workflow (assess, handle stuck namespace, reinstall operator, restore ConfigMaps/Secrets, reapply CRs, verify) is accurate and follows established Rook disaster recovery practices.
- The raw GitHub URLs for Rook v1.14.0 manifests (`deploy/examples/` path) were verified as valid.
- The file path `/var/lib/rook/rook-ceph/rook-ceph.config` containing `mon_host` was confirmed via community reports and GitHub issues.
- The `kubectl replace --raw /api/v1/namespaces/rook-ceph/finalize` technique for unsticking a terminating namespace is a well-known and correct workaround.
- The post assumes backups of Kubernetes configuration objects (Secrets, ConfigMaps, CRDs) exist. This is reasonable for a recovery guide but readers should note that without these backups, recovery is significantly harder.
