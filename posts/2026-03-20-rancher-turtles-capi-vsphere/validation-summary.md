# Validation Summary: How to Use CAPI with vSphere Provider via Rancher Turtles

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- ClusterClass
- Cluster API Provider vSphere (CAPV)
- Cluster API Provider RKE2 (CAPRKE2)
- Cluster API Add-on Provider Fleet (CAAPF)
- VMware vSphere
- Kubernetes
- `kubectl`
- `clusterctl`
- Fleet

## Sources Consulted
- Rancher Turtles Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles CAPIProvider reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Rancher Turtles certified providers: https://turtles.docs.rancher.com/turtles/stable/en/overview/certified.html
- Rancher Turtles ClusterClass guide: https://turtles.docs.rancher.com/turtles/stable/en/user/clusterclass.html
- Rancher Turtles cluster registration guide: https://turtles.docs.rancher.com/turtles/stable/en/user/rancher-cluster-registration.html
- Rancher Turtles troubleshooting guide: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Cluster API overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview
- Cluster API concepts: https://main.cluster-api.sigs.k8s.io/user/concepts.html
- Cluster API managed topology operations: https://cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/operate-cluster.html
- Cluster API `clusterctl get kubeconfig` reference: https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API `clusterctl generate yaml` reference: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-yaml
- Cluster API Provider vSphere repository and templates: https://github.com/kubernetes-sigs/cluster-api-provider-vsphere
- Cluster API Provider RKE2 repository and VMware template examples: https://github.com/rancher/cluster-api-provider-rke2

## Issues Found
- The original prerequisites were too generic for a working vSphere setup. I updated them to include CAPV, CAPRKE2, CAAPF, a `VSphereClusterIdentity`, a vSphere VM template, and the required vSphere inventory details.
- The original namespace `rancher-turtles-system` is outdated for current Rancher-managed Turtles installs. I corrected it to `cattle-turtles-system` and updated core CAPI references to `cattle-capi-system`.
- The original `kubectl get providers -A` check did not match the current Rancher Turtles resource model. I replaced it with `kubectl get capiproviders -A` and added checks for `VSphereClusterIdentity` and `ClusterClass` resources.
- The original cluster manifest used placeholder and outdated APIs: `cluster.x-k8s.io/v1beta1`, `InfraCluster`, and `RKE2ControlPlane` on `v1alpha1`. I replaced it with a current `Cluster` using `cluster.x-k8s.io/v1beta2`, `spec.topology`, the official `vsphere-rke2-example` ClusterClass, and the required vSphere variables.
- The original post omitted the Fleet Bundles needed to deliver vSphere cloud credentials and CSI configuration to the downstream cluster. I added those resources so the example matches the official vSphere Rancher Turtles workflow.
- The original Rancher import verification checked `clusters.provisioning.cattle.io` in `fleet-default`, which is not the current default import path. I changed it to check `clusters.management.cattle.io`, which Turtles now creates for auto-imported clusters.
- The original worker scaling example used `kubectl scale machinedeployment ...`, which is incorrect for a ClusterClass-managed topology workflow. I replaced it with a `kubectl patch cluster ... /spec/topology/workers/machineDeployments/0/replicas` example from the Cluster API managed-topology docs.
- The original troubleshooting section only checked Turtles and a legacy CAPI namespace. I updated it to the current Rancher Turtles, core CAPI, CAPV, and CAPRKE2 controller namespaces.

## Review Notes
- The corrected post now reflects the current ClusterClass-based vSphere RKE2 workflow instead of the older direct-reference style CAPI manifests.
- The example uses the official Rancher Turtles `v0.26.0` ClusterClass and application manifests so the names and variables align with the current docs.
- The `cluster-api.cattle.io/rancher-auto-import` label remains the supported way to import CAPI clusters into Rancher.
- The cluster manifest pins `v1.35.0+rke2r1` because that is the version used in the official Rancher Turtles vSphere RKE2 example at the time of review.
