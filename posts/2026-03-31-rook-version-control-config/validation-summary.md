# Validation Summary: How to Version Control Rook-Ceph Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook
- Ceph
- Kubernetes
- Argo CD
- Git
- kubectl
- kubectl-neat

## Sources Consulted
- Rook CephCluster CRD: https://rook.io/docs/rook/v1.14/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph upgrade guide: https://rook.io/docs/rook/v1.14/Upgrade/ceph-upgrade/
- Rook upgrade guide: https://rook.io/docs/rook/v1.14/Upgrade/rook-upgrade/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- `kubectl-neat` project README: https://github.com/itaysk/kubectl-neat
- Local Git CLI help: `git tag -h`, `git checkout -h`

## Issues Found
- The post said “Track the running version in the cluster” while showing a comment in `cluster.yaml`. That comment only exists in Git, and the Rook version is controlled by the operator image rather than `CephCluster.spec.cephVersion.image`. I changed the wording to track intended versions in Git and clarified that the operator image belongs in `operator.yaml`.
- The production Ceph examples used `v18.2.4`. Rook’s upgrade documentation recommends full Ceph version-and-build tags for production clusters. I updated the Git tag, manifest comment, and `cephVersion.image` example to `v18.2.4-20240724`.
- The live export section used `kubectl neat` without stating that it is an external plugin. I added the prerequisite so the command is not presented as a built-in `kubectl` feature.
- The Argo CD section and summary overstated the guarantee provided by `selfHeal: true` with `prune: false`. I narrowed the wording to drift reconciliation for managed resources instead of claiming the cluster will always exactly match Git.

## Review Notes
- The `kubectl` and Git command examples are syntactically correct as written.
- The `argocd app diff rook-ceph --hard-refresh` command is valid in current Argo CD CLI documentation.
- The snapshot commands assume the CephCluster resource is named `rook-ceph` in the `rook-ceph` namespace, which matches common defaults but is environment-specific.
- The description mentions CRD versioning, but the post only touches that topic indirectly through repository layout and version pinning.
