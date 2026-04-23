# Validation Summary: How to Use CAPI with Azure Provider via Rancher Turtles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- Cluster API Provider Azure (CAPZ)
- Cluster API Provider RKE2 (CAPRKE2)
- ClusterClass
- Cluster API Add-on Provider Fleet (CAAPF)
- Azure
- `kubectl`
- `clusterctl`

## Sources Consulted
- Rancher Turtles ClusterClass guide: https://turtles.docs.rancher.com/turtles/stable/en/user/clusterclass.html
- Rancher Turtles Rancher cluster registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles cluster resource mapping: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles Azure RKE2 ClusterClass example: https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/clusterclasses/azure/rke2/clusterclass-rke2-example.yaml
- Rancher Turtles Azure cloud controller manager HelmOp example: https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/ccm/azure/helm-chart.yaml
- Rancher Turtles Calico HelmOp example: https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/cni/calico/helm-chart.yaml
- CAPZ supported identities: https://capz.sigs.k8s.io/topics/identities
- CAPZ ClusterClass documentation: https://capz.sigs.k8s.io/topics/clusterclass
- Cluster API `clusterctl generate cluster` reference: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster.html
- Cluster API `clusterctl get kubeconfig` reference: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API ClusterClass documentation and `classRef` migration notes: https://cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/write-clusterclass
- Cluster API managed-topology scaling guidance: https://release-1-2.cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/operate-cluster

## Issues Found
- The post used outdated Rancher Turtles verification commands. I updated the Turtles namespace check to `cattle-turtles-system` for current Rancher-integrated deployments and replaced `kubectl get providers -A` with `kubectl get capiproviders -A`, which matches the documented `CAPIProvider` workflow.
- The original Azure manifest was not a runnable Rancher Turtles/CAPZ configuration. It used a placeholder `InfraCluster` kind, referenced an outdated `RKE2ControlPlane` API version, and omitted the required Azure identity and ClusterClass-driven topology. I replaced it with the current Rancher Turtles Azure RKE2 flow based on the official Turtles `ClusterClass` example, `AzureClusterIdentity`, and a `cluster.x-k8s.io/v1beta2` topology-managed `Cluster`.
- The post implied a generic CAPI cluster was enough for Azure. The current documented Azure RKE2 flow also needs the Azure cloud controller manager and a CNI. I added the official Rancher Turtles CAAPF-managed HelmOp examples for Azure CCM and Calico.
- The Rancher import-status command targeted `clusters.provisioning.cattle.io` in `fleet-default`, which reflects older import behavior. I updated it to `kubectl get clusters.management.cattle.io`, matching current Rancher Turtles registration behavior.
- The scaling example was incorrect for a ClusterClass-managed cluster. Current Cluster API guidance says managed-topology MachineDeployment scaling should be performed through the parent `Cluster` topology, so I replaced the direct `kubectl scale machinedeployment ...` command with a JSON patch against `/spec/topology/workers/machineDeployments/0/replicas`.
- The `clusterctl get kubeconfig` example omitted the namespace even though the CAPI cluster is namespaced. I added `--namespace default`.
- The troubleshooting section pointed at outdated or overly generic controllers. I updated it to the current Turtles controller namespace and the CAPZ controller namespace/label.

## Review Notes
- The official Rancher Turtles Azure RKE2 example depends on CAAPF for automatic installation of the Azure cloud controller manager and Calico. On newer Rancher releases, CAAPF is no longer installed by default and must be installed separately if you want that automation.
- The cluster manifest still contains placeholders such as `<AZURE_SUBSCRIPTION_ID>` and `<RKE2_VERSION>`; those must be replaced with real values, and the chosen RKE2/Kubernetes version must be supported by the current Rancher Turtles/CAPRKE2/CAPZ combination.
