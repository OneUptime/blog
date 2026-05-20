# Validation Summary: How to Debug ArgoCD Application Sync Failures Step by Step

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- Kustomize
- jq
- Prometheus metrics

## Sources Consulted
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD v1.7 to v1.8 upgrade notes for application-controller StatefulSet change: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/1.7-1.8/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/metrics/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The manifest command comment said `argocd app manifests --source live|git` generated manifests locally. The command prints Argo CD-generated manifests from the selected source, while local manifest generation uses the separate `--local` option, so the comment was corrected.
- The resource-conflict example piped `kubectl get ... -o jsonpath='{.metadata.annotations}'` into `jq`, but Kubernetes jsonpath map output is not guaranteed to be JSON. The command now uses `-o json | jq '.metadata.annotations'`.
- The hook lookup used `kubectl get pods -l argocd.argoproj.io/hook`, but Argo CD hook phases are configured with the `argocd.argoproj.io/hook` annotation, not a label. The example now searches Jobs and Pods by annotation with `jq` and shows logging from the hook Job.
- The hook timeout bullet claimed a specific two-hour default without a current official documentation basis in the consulted sources. It was changed to the accurate generic statement that hooks can time out before completing.
- The application controller log and exec commands used `deploy/argocd-application-controller`. Argo CD converted `argocd-application-controller` to a StatefulSet in v1.8, so current default-install examples now use `statefulset/argocd-application-controller`.

## Review Notes
The remaining Argo CD CLI commands and sync option examples match the current command references and user-guide documentation. The Prometheus metric `argocd_app_sync_total` is documented as the application sync history counter; exact alert expressions may vary by Argo CD version and monitoring setup.
