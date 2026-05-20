# Validation Summary: How to Recover from Corrupted ArgoCD State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Redis
- jq

## Sources Consulted
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_app_sync/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD stable Application CRD manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/crds/application-crd.yaml
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The stuck-operation fallback described `--type merge` as strategic merge and used `--subresource status`. Kubernetes documents that strategic merge patch is not supported for custom resources, and the current Argo CD Application CRD does not expose a status subresource. Changed the comment to JSON merge and removed `--subresource status`.
- Redis cache flush examples used unauthenticated `redis-cli flushall`. The current Argo CD install manifest starts Redis with `--requirepass $(REDIS_PASSWORD)`, so the command would fail on current installs. Updated the examples to pass the in-container `REDIS_PASSWORD` to `redis-cli`.
- Several application-controller commands treated `argocd-application-controller` as a Deployment. The current Argo CD install manifest deploys it as a StatefulSet. Updated log, restart, and rollout status commands to use `statefulset/argocd-application-controller`.
- The resource tracking check piped `kubectl -o jsonpath='{.metadata.labels}'` into `python3 -m json.tool`, but kubectl jsonpath output for a map is not JSON. Changed it to read the resource as JSON and pipe `.metadata.labels` through `jq`.

## Review Notes
- The Redis and application-controller commands are accurate for the current upstream Argo CD stable install manifest. Older or heavily customized installations may use different workload names or Redis authentication settings.
- The Argo CD CLI examples for hard refresh, app listing, force sync, pruning, and admin export match the documented command references.
