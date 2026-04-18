# Validation Summary: How to Upgrade Portainer CE on Kubernetes - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE (Community Edition)
- Kubernetes
- Helm 3
- kubectl
- Docker Hub image `portainer/portainer-ce`

## Sources Consulted
- Portainer Helm chart docs: https://github.com/portainer/k8s
- Portainer install docs: https://docs.portainer.io/start/install-ce/server/kubernetes/baremetal
- Helm CLI reference: https://helm.sh/docs/helm/helm_upgrade/, https://helm.sh/docs/helm/helm_repo_update/, https://helm.sh/docs/helm/helm_rollback/, https://helm.sh/docs/helm/helm_search_repo/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands (for `set image`, `rollout status`, `rollout undo`, `rollout history`, `cp`, `exec`)
- Docker Hub: https://hub.docker.com/r/portainer/portainer-ce

## Issues Found
- The comment in the backup snippet said "Export the current Portainer configuration via API as a backup", but the command actually uses `tar` via `kubectl exec` — not any API call. Updated the comment to "Archive the Portainer /data directory inside the pod as a backup" so it accurately reflects the command's behavior.

## Review Notes
- `helm repo update <repo>` (updating a single named repository) is supported in Helm 3.7+. If readers are on an older Helm 3 release, they can run `helm repo update` with no argument to refresh all repos.
- The intro mentions "snapshot the Portainer PersistentVolumeClaim"; strictly speaking, the example archives `/data` inside the pod rather than taking a volume snapshot (e.g., via VolumeSnapshot CRDs). For a true PVC snapshot, readers would need the CSI snapshotter. The file-archive approach shown is still a valid and commonly used backup method, so this was left as-is.
- The chart version `1.0.57` used in the pinned-upgrade example is illustrative; readers should pick an actual version from `helm search repo portainer/portainer --versions`. The author correctly signals this by showing the version-listing command first.
- Using `:latest` tags with `kubectl set image` is shown for simplicity; pinning to an explicit CE tag (e.g., `portainer/portainer-ce:2.x.y`) is preferable for reproducibility. This is a recommendation, not an error.
- `helm rollback portainer -n portainer` without a revision rolls back to the immediately previous revision — correct.
- The default Helm chart labels Portainer pods with `app.kubernetes.io/name=portainer`, so the selector used with `kubectl get pods` is accurate for Helm-based installs.
