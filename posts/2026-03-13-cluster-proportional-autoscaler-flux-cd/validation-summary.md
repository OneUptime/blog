# Validation Summary: Managing Cluster Proportional Autoscaler with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cluster Proportional Autoscaler
- Flux CD
- Helm
- Kubernetes RBAC
- CoreDNS
- metrics-server

## Sources Consulted
- Cluster Proportional Autoscaler official documentation: https://kubernetes-sigs.github.io/cluster-proportional-autoscaler/
- Cluster Proportional Autoscaler Helm chart values and templates: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler/tree/master/charts/cluster-proportional-autoscaler
- Cluster Proportional Autoscaler official RBAC example: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler/blob/master/examples/RBAC/RBAC-configs.yaml
- Cluster Proportional Autoscaler latest release metadata: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler/releases/tag/v1.10.3
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The HelmRelease referenced chart version `1.9.x`, but the published Helm repository contains chart versions `1.0.0`, `1.0.1`, and `1.1.0`. Changed the chart constraint to `1.1.x` and set the CPA container image tag explicitly to `v1.10.3`, the latest upstream CPA release found during review.
- The HelmRelease was in `kube-system` while the HelmRepository was in `flux-system`, but `sourceRef.namespace` was omitted. Added `namespace: flux-system` so Flux resolves the HelmRepository correctly.
- The CPA linear config used `preventSinglePointOfFailure`, but the upstream field is `preventSinglePointFailure`. Corrected the field in Helm values, ConfigMap JSON, and the best-practices text.
- The Helm values used `options.nodesSelector`, which is not a chart value. Replaced it with `options.nodeLabels: {}`, matching the chart's `--nodelabels` support.
- The scaling-rule comment incorrectly said `nodes/coresPerReplica`. Corrected it to `cores/coresPerReplica`.
- The direct Kubernetes manifest used a ServiceAccount but did not define the ServiceAccount or the RBAC needed to list/watch nodes, read ConfigMaps, and update scale subresources. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources.
- The direct manifests used the older `v1.9.0` CPA image. Updated them to `v1.10.3`.
- The metrics-server Deployment example omitted `spec.template.metadata.labels`, so the Deployment selector would not match the pod template. Added matching pod-template labels.
- The post mentioned kube-proxy as a CPA scaling example, but CPA targets Deployment, ReplicaSet, or ReplicationController resources, while kube-proxy is normally a DaemonSet. Reworded the example to Deployment-based addons.
- The best-practices text said `preventSinglePointOfFailure` adds a replica when the cluster has only one node. Corrected this to the documented behavior: `preventSinglePointFailure` ensures at least two replicas when there is more than one node.
- The Step 4 heading said "with Dependency" but the Flux Kustomization example did not define `dependsOn`. Renamed the heading to "Deploy via Flux Kustomization."

## Review Notes
The local environment did not have `kubectl`, `helm`, `kubeconform`, `kubeval`, or a YAML parser available, so validation was performed by reviewing the manifests against the official Flux documentation, Kubernetes Deployment requirements, and upstream Cluster Proportional Autoscaler chart templates and examples.
