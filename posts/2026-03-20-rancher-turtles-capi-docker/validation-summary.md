# Validation Summary: How to Use CAPI with Docker Provider for Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Cluster API (CAPI)
- Cluster API Docker Provider (CAPD)
- RKE2
- Docker
- kubectl
- clusterctl

## Sources Consulted
- SUSE Rancher Prime Cluster API, "Create & Import Your First Cluster": https://documentation.suse.com/cloudnative/cluster-api/latest/en/tutorials/first-cluster.html
- SUSE Rancher Prime Cluster API, "Rancher Cluster Registration": https://documentation.suse.com/cloudnative/cluster-api/v0.26/en/user/rancher-cluster-registration.html
- SUSE Rancher Prime Cluster API, "Rancher Turtles Troubleshooting": https://documentation.suse.com/cloudnative/cluster-api/latest/en/troubleshooting/troubleshooting.html
- Rancher Turtles official Docker RKE2 ClusterClass example: https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/clusterclasses/docker/rke2/clusterclass-docker-rke2.yaml
- Rancher Turtles official Docker load balancer ConfigMap example: https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/applications/lb/docker/configmap.yaml
- Rancher Turtles official Docker RKE2 cluster example: https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/clusters/docker/rke2/cluster.yaml
- Cluster API Book, "clusterctl get kubeconfig": https://main.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API Book, "clusterctl for Developers": https://main.cluster-api.sigs.k8s.io/clusterctl/developers
- Cluster API Book, "Developer Guide": https://main.cluster-api.sigs.k8s.io/developer/getting-started
- Cluster API Book, "Operating a managed Cluster": https://release-1-3.cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/operate-cluster

## Issues Found
- The prerequisites were misleading for a Docker-based test setup. The post originally referenced cloud credentials, which are not required for CAPD, and did not call out the Docker and provider dependencies actually needed. I replaced those prerequisites with Docker plus the core, CAPD, and RKE2 providers.
- The controller namespaces in the verification and troubleshooting commands were outdated or incorrect. I updated them to the current Rancher Turtles namespaces documented by SUSE, including `cattle-turtles-system` and `cattle-capi-system`, and added the CAPD and RKE2 controller namespaces used in this workflow.
- The YAML example used incorrect and outdated API shapes. It referenced `cluster.x-k8s.io/v1beta1`, a non-existent `InfraCluster` kind, and `RKE2ControlPlane` with `controlplane.cluster.x-k8s.io/v1alpha1`. I replaced it with a current `v1beta2` Cluster topology example that matches the maintained Rancher Turtles Docker RKE2 manifests.
- The apply flow was not runnable as written. A single `cluster-config.yaml` file was not sufficient because the Docker RKE2 workflow also requires the ClusterClass/templates and the Docker load balancer ConfigMap. I updated the commands to apply the official upstream example manifests in the correct order.
- The Rancher import verification command targeted the wrong resource type. I changed it to inspect `clusters.management.cattle.io` using the owner labels documented by Rancher Turtles for auto-imported clusters.
- The scaling example was wrong for a ClusterClass-managed cluster. Directly scaling a `MachineDeployment` is not the documented approach for managed topology clusters, so I replaced it with a `kubectl patch cluster ... /spec/topology/workers/machineDeployments/0/replicas` example.
- The kubeconfig example lacked the workload namespace and implied one universal retrieval method. I added `--namespace capi-clusters` for `clusterctl get kubeconfig` and noted the official Docker Desktop `kind get kubeconfig` alternative.
- The overview did not state an important CAPD constraint. I clarified that CAPD is intended for local development and testing rather than production use.

## Review Notes
- The post now follows the current official Rancher Turtles Docker RKE2 example as of 2026-04-23, which uses Cluster API `v1beta2`, a namespaced `ClusterClass`, and managed topology.
- The official tutorial links to raw GitHub files on the `main` branch. Those URLs are correct today, but their exact contents may change over time as the upstream examples evolve.
- Using a dedicated namespace such as `capi-clusters` is recommended by the Rancher Turtles troubleshooting guide and is easier to manage than using `default`.
