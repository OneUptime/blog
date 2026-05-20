# Validation Summary: How to Handle ArgoCD Recovery After etcd Corruption

## Status
validated

## Post Type
Technical recovery guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- etcd
- etcdctl and etcdutl
- kubectl
- AWS CLI

## Sources Consulted
- etcd disaster recovery documentation: https://etcd.io/docs/v3.7/op-guide/recovery/
- Kubernetes kubeadm implementation details for static Pod manifests: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Argo CD getting started installation documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD admin import command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_admin_import/
- Argo CD admin export command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_admin_export/
- OneUptime linked restore guide: https://oneuptime.com/blog/post/2026-02-26-argocd-restore-from-backup/view

## Issues Found
- The post said the Argo CD application controller logs would show direct etcd connection errors. Argo CD talks to Kubernetes through the API server, so this was changed to Kubernetes API storage errors.
- The diagnostic comments treated `mvcc: database space exceeded` and compacted-revision errors as definitive corruption. These can indicate storage health, quota, or API/storage access problems, so the language was made more precise.
- The etcd restore command used `etcdctl snapshot restore`. Current etcd documentation uses `etcdutl snapshot restore`, so the command was updated and given current Kubernetes restore flags for revision bumping and compaction marking.
- The restored data directory ownership used a hard-coded `etcd:etcd` user/group that may not exist on kubeadm static Pod nodes. It now copies ownership from the previous data directory.
- The Argo CD rollout restart commands omitted resource names or `--all`, which would not restart all resources as intended. They now use `--all`.
- The reset example used `systemctl stop/start etcd` even though the post's procedure assumes kubeadm static Pod manifests. It now stops and starts etcd by moving the static Pod manifests.
- The Argo CD install command pinned an old v2.13 manifest. It now uses the official stable manifest URL with server-side apply flags shown in current Argo CD installation docs.
- The `argocd admin import` command omitted the required `SOURCE` argument. It now passes `-` to read from stdin.
- The backup script generated the snapshot filename with repeated `date` calls, which could reference different files if the minute changed during execution. It now stores the filename once in `SNAPSHOT_FILE`.
- The snapshot status command used `etcdctl snapshot status`; current etcd docs use `etcdutl snapshot status`, so the command was updated.

## Review Notes
The recovery examples assume a kubeadm-style stacked etcd running as a static Pod on a single control-plane node. Multi-control-plane etcd restores require restoring each member from the same snapshot with matching membership settings.
