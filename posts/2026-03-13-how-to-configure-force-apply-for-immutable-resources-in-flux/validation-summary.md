# Validation Summary: How to Configure Force Apply for Immutable Resources in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes
- Kubernetes Deployments
- Kubernetes ConfigMaps and Secrets
- Kubernetes Jobs
- Server-Side Apply

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Secret documentation, including immutable Secrets and ConfigMaps: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes v1.36 mutable pod resources for suspended Jobs note: https://kubernetes.io/blog/2026/04/27/kubernetes-v1-36-mutable-pod-resources-for-suspended-jobs/

## Issues Found
- The post recommended splitting resources into separate Flux Kustomizations as the way to isolate force apply to specific resources. Flux supports the more targeted `kustomize.toolkit.fluxcd.io/force: enabled` annotation or label for specific resources, so the section was updated to show that mechanism and to recommend removing the annotation after the immutable field change is applied.
- The post stated that force apply causes downtime for affected resources. This was softened to "can cause" because the impact depends on the resource type and workload topology.
- The post stated broadly that Kubernetes Job spec fields are immutable once created. This was narrowed to immutable fields, especially the pod template for normal Jobs, because newer Kubernetes versions include limited exceptions for resource changes on suspended Jobs.

## Review Notes
The Flux `spec.force` field, Kustomization `apiVersion`, `wait`, `timeout`, `prune`, and `sourceRef` examples are consistent with the official Flux Kustomization documentation. The `flux get kustomizations -A` command is valid. Kubernetes Deployment selector immutability and immutable ConfigMap/Secret behavior are consistent with Kubernetes documentation.
