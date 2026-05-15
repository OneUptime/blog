# Validation Summary: How to Deploy Kubernetes Job Queue with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kueue
- Flux CD
- HelmRelease
- OCIRepository
- Kustomize
- Kubernetes Jobs

## Sources Consulted
- Kueue installation documentation: https://kueue.sigs.k8s.io/docs/getting-started/installation/
- Kueue ResourceFlavor documentation: https://kueue.sigs.k8s.io/docs/concepts/resource_flavor/
- Kueue ClusterQueue documentation: https://kueue.sigs.k8s.io/docs/concepts/cluster_queue/
- Kueue LocalQueue documentation: https://kueue.sigs.k8s.io/docs/concepts/local_queue/
- Kueue Kubernetes Job documentation: https://kueue.sigs.k8s.io/docs/tasks/run/jobs/
- Kueue WorkloadPriorityClass documentation: https://kueue.sigs.k8s.io/docs/concepts/workload_priority_class/
- Kueue v0.17.2 released manifests and CRD schemas: https://github.com/kubernetes-sigs/kueue/releases/download/v0.17.2/manifests.yaml
- Kueue v0.17.2 Helm chart values: https://github.com/kubernetes-sigs/kueue/releases/download/v0.17.2/kueue-0.17.2.tgz
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux reconcile helmrelease command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/

## Issues Found
- The production `ClusterQueue` split `cpu` and `memory` into one resource group and `nvidia.com/gpu` into a separate resource group. Kueue documentation states that node-associated resources should be listed in the same resource group when they must be assigned to the same ResourceFlavor during admission. I updated the production queue to include `cpu`, `memory`, and `nvidia.com/gpu` in one resource group and added explicit zero GPU quota to non-GPU flavors so the v1beta2 schema rule that every flavor lists every covered resource is satisfied.

## Review Notes
- The Kueue `v1beta2` API versions, `cohortName`, `WorkloadPriorityClass`, `LocalQueue`, `ResourceFlavor`, and queue label usage match Kueue 0.17 documentation and CRD schemas.
- The Flux `OCIRepository`, `HelmRelease.chartRef`, Kustomization `dependsOn`, and health check examples match current Flux documentation.
- The Helm values path `controllerManager.manager.resources` and `controllerManager.replicas` matches the Kueue 0.17.2 chart.
- YAML snippets were parsed locally after the edit; all YAML blocks parse successfully.
