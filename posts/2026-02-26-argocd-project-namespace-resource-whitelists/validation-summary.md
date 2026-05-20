# Validation Summary: How to Configure Project Namespace Resource Whitelists in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects
- Kubernetes resource APIs
- kubectl
- Argo CD CLI
- Prometheus Operator CRDs
- Istio CRDs
- cert-manager CRDs
- KEDA CRDs

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Istio API reference: https://istio.io/latest/docs/reference/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- KEDA documentation: https://keda.sh/docs/

## Issues Found
- The AppProject examples focused only on resource restrictions, but standalone projects also require `sourceRepos` and `destinations` for applications to deploy. Added a note clarifying that complete AppProject manifests must configure those fields.
- The custom resources section implied that operator custom resources are always namespace-scoped and always need to be whitelisted. Updated the wording to say many operator custom resources are namespace-scoped, and that namespace-scoped CRs need explicit entries when `namespaceResourceWhitelist` is used.

## Review Notes
The Argo CD `namespaceResourceWhitelist` and `namespaceResourceBlacklist` field names, default namespaced-resource behavior, wildcard usage, and blacklist precedence are consistent with the current Argo CD project documentation. The Kubernetes API groups used for Deployment, StatefulSet, DaemonSet, Job, CronJob, Ingress, HorizontalPodAutoscaler, PodDisruptionBudget, RBAC resources, ResourceQuota, LimitRange, and NetworkPolicy are technically correct. The `kubectl api-resources`, `argocd proj get -o json`, and `argocd app get -o json` command examples are valid.
