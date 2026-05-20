# Validation Summary: How to Install ArgoCD on Minikube for Local Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Minikube
- kubectl
- GitOps
- YAML Kubernetes manifests

## Sources Consulted
- Argo CD stable overview and quick start: https://argo-cd.readthedocs.io/en/stable/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Minikube start command documentation: https://minikube.sigs.k8s.io/docs/commands/start/
- Minikube application access documentation: https://minikube.sigs.k8s.io/docs/handbook/accessing/
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl set resources` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/

## Issues Found
- The Argo CD install command used plain `kubectl apply`. Current Argo CD stable quick start documents `--server-side --force-conflicts` as required for the standard install manifest due to CRD size limits, so the command was updated accordingly.
- The Minikube start command pinned Kubernetes `v1.28.0`, which is outdated for a current local-development guide and unnecessary for the tutorial. The version pin was removed so Minikube uses its current default stable Kubernetes version.
- The resource optimization section claimed Argo CD's default resource requests may be too generous and used JSON Patch `replace` operations against resource request paths that are not present in the current stable install manifest. The text and commands were changed to use `kubectl set resources` to explicitly set small CPU requests for the relevant containers.

## Review Notes
- The remaining Argo CD CLI commands, Application manifest fields, port-forwarding command, initial password retrieval command, Minikube tunnel and NodePort access examples, and guestbook service name are consistent with official documentation and upstream examples.
- The exact components and image versions installed by the Argo CD `stable` manifest will change over time, so expected pod names remain illustrative rather than version-specific.
