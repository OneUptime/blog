# Validation Summary: How to Pass Environment Variables to ArgoCD Components

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments and StatefulSets
- Kubernetes ConfigMaps and Secrets
- kubectl
- Helm
- Kustomize

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD source for component environment variables and install manifests: https://github.com/argoproj/argo-cd
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kustomize API type reference for deprecated `patchesStrategicMerge`: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The direct server environment variables used generic `ARGOCD_LOG_LEVEL` and `ARGOCD_LOG_FORMAT` names. Updated them to the server-supported `ARGOCD_SERVER_LOG_LEVEL` and `ARGOCD_SERVER_LOGFORMAT`.
- The direct application controller processor variables used `ARGOCD_CONTROLLER_STATUS_PROCESSORS` and `ARGOCD_CONTROLLER_OPERATION_PROCESSORS`. Updated them to `ARGOCD_APPLICATION_CONTROLLER_STATUS_PROCESSORS` and `ARGOCD_APPLICATION_CONTROLLER_OPERATION_PROCESSORS`.
- `ARGOCD_EXEC_TIMEOUT` was shown as `180`, but Argo CD parses this as a Go duration. Updated it to `180s`.
- The notifications controller log-level variable was shown as `ARGOCD_NOTIFICATIONS_LOG_LEVEL`. Updated it to `ARGOCD_NOTIFICATIONS_CONTROLLER_LOGLEVEL`.
- The Helm chart example used `extraEnv` for server, controller, repo server, Dex, and Redis. The current official chart uses `env` for those components; notifications still uses `extraEnv`. Updated the example accordingly.
- The Kustomize strategic merge example used the deprecated `patchesStrategicMerge` field. Updated it to the current `patches` field with patch paths.
- The complete production example defined custom plugin environment variables in a ConfigMap but did not load that ConfigMap into the repo server. Added the matching `envFrom` repo-server patch.

## Review Notes
The `argocd-cmd-params-cm` keys used in the post match the current Argo CD reference. The `kubectl exec`, `kubectl rollout restart`, and `kubectl rollout status` command forms are valid for the Kubernetes resources shown. The Kustomize resource URL pins Argo CD v2.10.0, so users should update that version intentionally when adopting newer Argo CD releases.
