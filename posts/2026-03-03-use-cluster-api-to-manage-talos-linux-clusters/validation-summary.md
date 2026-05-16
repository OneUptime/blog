# Validation Summary: How to Use Cluster API to Manage Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Cluster API (CAPI)
- clusterctl
- Cluster API Provider Talos bootstrap provider (CABPT)
- Cluster API Provider Talos control plane provider (CACPPT)
- Cluster API Provider AWS (CAPA)
- Talos Linux
- Kubernetes
- kind
- kubectl
- AWS EC2 infrastructure resources

## Sources Consulted
- Cluster API clusterctl init documentation: https://cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API clusterctl get kubeconfig documentation: https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API version support and v1beta2 contract documentation: https://cluster-api.sigs.k8s.io/reference/versions.html
- Cluster API releases: https://github.com/kubernetes-sigs/cluster-api/releases
- Cluster API Provider Talos control plane provider documentation: https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- Cluster API Provider Talos bootstrap provider documentation: https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Cluster API Provider AWS CRD reference: https://cluster-api-aws.sigs.k8s.io/crd/
- Kubernetes releases page: https://kubernetes.io/releases
- Talos Linux releases: https://github.com/siderolabs/talos/releases

## Issues Found
- The post installed `clusterctl` v1.7.0, which is stale for a 2026 guide. Updated the download URL to v1.13.1, the current Cluster API release verified from the official GitHub release asset.
- The provider verification command checked `capt-system`, but current Talos providers install into separate `cabpt-system` and `cacppt-system` namespaces. Updated the commands to check both namespaces.
- The Cluster API core resource examples used `cluster.x-k8s.io/v1beta1`, which is deprecated under the current CAPI contract. Updated `Cluster` and `MachineDeployment` examples to `cluster.x-k8s.io/v1beta2`.
- The Kubernetes examples used v1.30.0 and upgraded to v1.31.0, both outdated for May 2026. Updated the base example to v1.35.0 and the upgrade target to v1.36.1, which is the current Kubernetes release series.
- The Talos machine configuration examples used Talos v1.7.0, which is outdated. Updated `talosVersion` to v1.13.0, matching the current Talos release series.

## Review Notes
The YAML snippets parse successfully after the edits. The AWS examples remain illustrative: a production CAPA deployment still needs provider credentials, IAM setup, cloud-controller-manager/addon planning, and valid region-specific Talos AMIs.
