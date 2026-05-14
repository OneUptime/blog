# Validation Summary: How to Implement Cluster Lifecycle Management with Cluster API and Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Cluster API
- Flux CD
- Kubernetes
- kubectl
- clusterctl
- Kustomize Controller
- GitOps-based multi-cluster lifecycle management

## Sources Consulted
- Cluster API API Reference: https://cluster-api.sigs.k8s.io/reference/api/crd-api-reference
- Cluster API Version Support: https://cluster-api.sigs.k8s.io/reference/versions
- Cluster API Labels and Annotations: https://cluster-api.sigs.k8s.io/reference/api/labels-and-annotations
- Cluster API Upgrading Management and Workload Clusters: https://cluster-api.sigs.k8s.io/tasks/upgrading-clusters
- Cluster API Machine Deletion Process: https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/machine_deletions
- Cluster API clusterctl get kubeconfig: https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The CAPI examples used `cluster.x-k8s.io/v1beta1` and `controlplane.cluster.x-k8s.io/v1beta1`. Current Cluster API documentation marks `v1beta1` as deprecated since CAPI v1.11 and recommends keeping YAML in sync with the latest supported API version. Updated the examples to `v1beta2`.
- The Flux Kustomization example used `prune: false`, but the decommissioning workflow expected Flux to delete the applied CAPI resources. Changed the example to `prune: true` and added `deletionPolicy: WaitForTermination` so deleting the Kustomization can garbage-collect managed resources.
- The decommissioning command used `kubectl drain --all-namespaces`, which is not a valid `kubectl drain` invocation because `drain` operates on node names. Replaced it with a node list piped into `kubectl drain`.
- The decommissioning steps deleted cluster manifests before confirming the Cluster object had been removed. Reordered the sequence so the Flux Kustomization is removed first, CAPI deprovisioning is observed, and the Git manifests are removed after the Cluster object is gone.

## Review Notes
- The examples remain intentionally abbreviated and assume provider-specific infrastructure and bootstrap templates exist in the copied cluster directory.
- The local environment did not have `kubectl`, `clusterctl`, or `flux` installed, so CLI validation was performed against official command documentation instead of local `--help` output.
