# Validation Summary: How to Check ArgoCD Component Logs Effectively

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- stern
- jq
- Redis
- Dex
- GitOps logging and troubleshooting

## Sources Consulted
- Argo CD Architectural Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD Component Architecture: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/components/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Git Webhook Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- stern README: https://github.com/stern/stern

## Issues Found
- The post used `deploy/argocd-application-controller` in several `kubectl logs` examples. Argo CD runs `argocd-application-controller` as a StatefulSet in the standard and HA manifests, so those examples were changed to `statefulset/argocd-application-controller`.
- The JSON logging restart command attempted to restart `argocd-application-controller` as a Deployment. I split the restart into Deployment restarts for `argocd-server` and `argocd-repo-server`, and a StatefulSet restart for `argocd-application-controller`.
- The Redis responsibility was described as "Caching, state management." Argo CD documentation describes Redis as a disposable cache layer, so this was changed to avoid implying that Redis stores durable Argo CD state.

## Review Notes
- The `kubectl logs` flags used in the post, including `--tail`, `--previous`, `-f`, `-l`, and `--max-log-requests`, match the Kubernetes reference documentation.
- The Argo CD command parameter keys for JSON logging, including `server.log.format`, `controller.log.format`, and `reposerver.log.format`, match the official `argocd-cmd-params-cm` reference.
- `kubectl` was not installed in the local environment, so command behavior was verified against official Kubernetes documentation rather than local `--help` output.
