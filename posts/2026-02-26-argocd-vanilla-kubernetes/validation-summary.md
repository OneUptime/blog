# Validation Summary: How to Use ArgoCD with Vanilla Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes Ingress
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes StorageClass
- cert-manager
- Redis HA / Sentinel

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD High Availability: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/high_availability/
- Argo CD Tested Kubernetes Versions: https://argo-cd.readthedocs.io/en/stable/operator-manual/tested-kubernetes-versions/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD stable install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD stable HA install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/

## Issues Found
- The prerequisites claimed "ArgoCD 2.x supports 1.24+" broadly. Argo CD support and tested Kubernetes versions vary by Argo CD release, so this was changed to require a Kubernetes version supported by the installed Argo CD version.
- The prerequisites implied a persistent storage provisioner is needed for durable Redis data. Argo CD stores state in Kubernetes objects and treats Redis as a rebuildable cache, so the storage guidance was corrected to apply to workloads that need persistent volumes.
- The Kubernetes version check used `kubectl version --short`, which is no longer a current kubectl flag. It was changed to `kubectl version`.
- The Argo CD install and HA install commands omitted `--server-side --force-conflicts`, which current Argo CD docs require because some CRDs exceed client-side apply annotation limits. The install commands were updated.
- The NodePort lookup selected `.spec.ports[0]`, which can return the HTTP NodePort while the text tells users to browse with HTTPS. It now selects the service port named `https`.
- The Ingress TLS secret and cert-manager Certificate used `argocd-tls`; for Argo CD SSL passthrough, the server expects the certificate secret as `argocd-server-tls`. Both snippets were corrected.
- The NetworkPolicy allowed port `8443`, which is not the current `argocd-server` pod port for the UI/API path. It now allows port `8080`, matching the service target port.
- The NetworkPolicy namespace selector used a likely non-existent `app: ingress-nginx` namespace label. It now uses the built-in `kubernetes.io/metadata.name: ingress-nginx` namespace label.
- The HA section claimed 3 application-controller, API server, and repo-server replicas. The current stable HA manifest defaults are 1 application-controller replica, 2 argocd-server replicas, 2 repo-server replicas, and 3 Redis HA server replicas, so the list was corrected.
- The HA section did not mention the documented requirement for at least three different nodes due to pod anti-affinity. That caveat was added.
- The upgrade examples pinned the old `v2.10.0` release and omitted current server-side apply flags. They now use `v3.4.2` and include `--server-side --force-conflicts`.

## Review Notes
The post is technically relevant and the examples are generally aligned with current Argo CD and Kubernetes APIs after the corrections above. The local environment did not have `kubectl` installed, so kubectl behavior was verified against official Kubernetes documentation rather than local `--help` output.
