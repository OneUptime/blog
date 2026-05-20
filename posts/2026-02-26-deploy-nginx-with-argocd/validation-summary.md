# Validation Summary: How to Deploy a Simple Nginx App with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Nginx
- YAML
- Git

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_create/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The sync flow diagram said Argo CD polls for changes "every 3 min". Official Argo CD documentation describes the default reconciliation timeout as 120 seconds plus up to 60 seconds of jitter, for a maximum of 3 minutes. Updated the wording to "up to every 3 min by default".
- The health probe guidance said ArgoCD uses health status to determine if a deployment succeeded, which blurred Kubernetes probe behavior with Argo CD resource health checks. Updated it to clarify that Kubernetes uses liveness/readiness probes and Argo CD reports health from Kubernetes resource health.

## Review Notes
- The Kubernetes manifests use current API versions and valid fields for Namespace, Deployment, Service, and ConfigMap resources.
- The Argo CD Application manifest fields, automated sync options, finalizer, and `CreateNamespace=true` sync option match official Argo CD documentation.
- The `argocd app create`, `kubectl port-forward`, and `kubectl scale` commands are consistent with documented syntax.
- The referenced OneUptime blog links returned HTTP 200 during review.
