# Validation Summary: How to Upgrade CAPI Clusters via Rancher Turtles

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher Manager
- Cluster API (CAPI)
- ClusterClass
- Cluster API Provider RKE2 (CAPRKE2)
- Kubernetes
- `kubectl`
- `clusterctl`

## Sources Consulted
- Rancher Turtles Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles Troubleshooting: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Turtles Cluster Resource Relationships: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Cluster API Book, Upgrading management and workload clusters: https://cluster-api.sigs.k8s.io/tasks/upgrading-clusters
- Cluster API Book, Operating a managed Cluster: https://cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/operate-cluster.html
- Cluster API Book, Version Support: https://cluster-api.sigs.k8s.io/reference/versions
- Cluster API Book, clusterctl Commands: https://cluster-api.sigs.k8s.io/clusterctl/commands/commands
- CAPRKE2 Getting Started: https://caprke2.docs.rancher.com/01_user/01_getting-started.html
- CAPRKE2 API Versions: https://caprke2.docs.rancher.com/05_reference/01_api_versions.html
- CAPRKE2 Docker example template: https://github.com/rancher/cluster-api-provider-rke2/blob/main/examples/templates/docker/cluster-template.yaml
- Rancher Turtles Docker RKE2 cluster example: https://github.com/rancher/turtles/blob/main/examples/clusters/docker/rke2/cluster.yaml

## Issues Found
- The post did not actually describe a cluster upgrade workflow. It mostly covered cluster creation, scaling, and generic inspection. I replaced the main implementation steps with the documented upgrade paths: patch `Cluster.spec.topology.version` for ClusterClass-managed clusters, or patch `RKE2ControlPlane.spec.version` and worker `MachineDeployment.spec.template.spec.version` for non-topology RKE2 clusters.
- The controller namespaces were incorrect for current Rancher-integrated Turtles deployments. I corrected `rancher-turtles-system` to `cattle-turtles-system`, `capi-system` to `cattle-capi-system`, and added the relevant CAPRKE2 controller namespaces used during troubleshooting.
- The provider inspection command was inaccurate for Rancher Turtles. I replaced `kubectl get providers -A` with `kubectl get capiproviders.turtles-capi.cattle.io -A`, which matches the documented `CAPIProvider` resource used by Turtles.
- The example manifest was not a valid current upgrade example. It used a placeholder `InfraCluster` kind and `controlplane.cluster.x-k8s.io/v1alpha1` for `RKE2ControlPlane`, which is not the current API shape. I removed that snippet and replaced it with version patch commands based on current `v1beta2` CAPI and CAPRKE2 examples.
- The Rancher import status check targeted `clusters.provisioning.cattle.io` in `fleet-default`, which is legacy behavior and not the default current Turtles import path. I corrected it to query `clusters.management.cattle.io` using the documented owner labels.
- The common operations and troubleshooting sections were not aligned to an upgrade guide. I removed the unrelated scale command, kept kubeconfig retrieval, and updated the troubleshooting commands to inspect the controllers that participate in current Turtles and CAPRKE2 rollouts.

## Review Notes
- The corrected examples use current `v1beta2`-style CAPI and CAPRKE2 resources. Upstream Cluster API marks `v1beta1` as deprecated, although some Rancher Turtles documentation still includes `v1beta1` examples for compatibility during the transition.
- Cluster API recommends upgrading Kubernetes minor versions sequentially and updating provider-specific machine templates or images when the infrastructure provider pins images to Kubernetes versions. The post now reflects both caveats.
