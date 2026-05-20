# Validation Summary: How to Use Kustomize Overlays with ArgoCD for Multiple Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Kubernetes Deployment, ConfigMap, HorizontalPodAutoscaler, and PodDisruptionBudget resources

## Sources Consulted
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/

## Issues Found
- The introduction said production gets "strict resource quotas," but the examples configure container resource requests and limits rather than Kubernetes `ResourceQuota` objects. I changed the wording to "stricter resource limits" to match the manifests shown.
- The Kustomize examples used `commonLabels`. Current Kubernetes Kustomize documentation shows the newer `labels` transformer with explicit `includeSelectors` behavior, so I updated the base, dev, and production kustomizations to use `labels` with `includeSelectors: true`.

## Review Notes
The Kustomize and kubectl binaries were not installed in the local workspace, so local rendering could not be executed. The snippets were reviewed against official Kubernetes and Argo CD documentation instead. The post references `service.yaml`, `ingress.yaml`, and environment-specific ingress patches in the directory structure but does not include their contents; those omitted examples are plausible but were not directly render-validated.
