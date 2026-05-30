# Validation Summary: Set Up Kustomize Overlays for Managing AKS Deployments Across Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Deployments, Services, ConfigMaps, Ingress, and HorizontalPodAutoscaler
- Kustomize bases, overlays, patches, image transforms, ConfigMap generators, and Secret generators
- kubectl Kustomize integration
- CI/CD image tag updates

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Managing Secrets using Kustomize - https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kustomize/
- Kubernetes API reference: HorizontalPodAutoscaler - https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/
- Kubernetes documentation: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes API reference: Ingress networking.k8s.io/v1 - https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes SIGs Kustomize repository and kubectl integration notes - https://github.com/kubernetes-sigs/kustomize
- Kustomize v5.8.1 local build validation using the official release binary - https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize/v5.8.1

## Issues Found
- The directory tree listed `base/hpa.yaml` and `production/hpa-patch.yaml`, but the article later defines `overlays/production/hpa.yaml`. Updated the tree to match the actual example files.
- The base `kustomization.yaml` used `commonLabels`, which Kustomize v5.8.1 reports as deprecated. Replaced it with the current `labels` syntax and `includeSelectors: true` to preserve the old behavior of labeling selectors as well as resources.
- The production overlay referenced `ingress.yaml` but did not include the corresponding manifest. Added the missing production Ingress snippet so the overlay can be built as written.
- The staging Ingress and production HPA manually referenced prefixed resource names. Changed those references to the base resource name so Kustomize's name reference transformer can apply `namePrefix` consistently.
- The ConfigMap/Secret generator section implied that any generated name change automatically triggers a rollout. Clarified that this happens when a workload references the generated ConfigMap or Secret and Kustomize updates that rendered reference.

## Review Notes
The reconstructed `k8s/base`, `k8s/overlays/dev`, `k8s/overlays/staging`, and `k8s/overlays/production` examples all rendered successfully with Kustomize v5.8.1. The standalone JSON patch example was also validated with Kustomize v5.8.1. `kubectl` was not installed in the workspace, so kubectl command validation was based on official Kubernetes documentation rather than local CLI execution.
