# Validation Summary: How to Configure Helm Release History Limits and Revision Cleanup Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Kubernetes Secrets
- Kubernetes CronJobs
- Kubernetes RBAC
- Bash
- jq

## Sources Consulted
- Helm command reference: https://helm.sh/docs/helm/helm/
- Helm env command reference: https://helm.sh/docs/helm/helm_env/
- Helm history command reference: https://helm.sh/docs/helm/helm_history/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm storage backends documentation: https://helm.sh/docs/v3/topics/advanced/#storage-backends
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Docker Hub alpine/k8s image listing: https://hub.docker.com/r/alpine/k8s

## Issues Found
- The post described Helm release storage as always being a Secret or ConfigMap. Helm 3 uses Secrets by default, with other backends configured through `HELM_DRIVER`; the wording was updated to reflect the default and configurable storage backends.
- The storage impact examples used `.data | length`, which counts data keys rather than encoded data size. The `jq` expressions were updated to sum the lengths of the stored data values and handle empty results.
- The post showed `helm install myapp ./mychart --history-max 5`, but current Helm install documentation does not list `--history-max`. The install example was removed, leaving the valid upgrade and `HELM_MAX_HISTORY` examples.
- The post suggested setting `maxHistory` in `~/.config/helm/repositories.yaml`. Helm documents `HELM_MAX_HISTORY` as the relevant environment variable, and `repositories.yaml` is the repository config file, not a max history configuration file. The invalid config-file example was replaced with a `helm env` check for `HELM_MAX_HISTORY`.
- The cleanup scripts selected revisions to delete by calling `helm history --max "$TO_DELETE"`, which is not a reliable way to select the oldest revisions. The scripts now parse the matching default Helm Secret names, sort by revision, and delete all but the latest retained revisions.
- The CronJob used `alpine/helm:latest` while the script requires `helm`, `kubectl`, and `jq`. The image was changed to `alpine/k8s:1.35.2`, a Kubernetes toolbox image that includes the needed tools.
- The backup section implied that `helm history -o json` exports all revision contents and supports full revision restoration. The text and comments were narrowed to current-state backup and revision history metadata, which matches what the commands actually save.

## Review Notes
The cleanup examples delete Helm release Secrets directly and are correct for Helm's default secret storage driver. Clusters configured with `HELM_DRIVER=configmap` or `HELM_DRIVER=sql` would need backend-specific cleanup handling.
