# Validation Summary: Migrate Workloads to Calico on Rancher

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- Calico CNI
- Calico network policy
- `kubectl`
- `calicoctl`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Helm integration: https://docs.rke2.io/add-ons/helm
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico automatic labels: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl` Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Kubernetes `kubectl create namespace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace

## Issues Found
- The post described "replacing" Canal or Flannel, but the guide's actual migration path is to create a new Calico cluster and move workloads. Updated the description to avoid implying an in-place CNI replacement.
- The post implied Calico eBPF support generally applies to Rancher/RKE2 Calico clusters. RKE2 supports Calico eBPF only on supported RKE2 releases and with the required kube-proxy configuration, so the eBPF claims were narrowed to supported RKE2 versions.
- The prerequisites mentioned RKE1 even though the manifests and chart customization use RKE2-specific Rancher provisioning fields. Updated the prerequisite to RKE2.
- The `calicoctl` prerequisite used a fixed minimum version. Calico documentation recommends matching the `calicoctl` version to the cluster version, so the prerequisite was corrected.
- The Step 1 comment said the example used the Rancher CLI, but it uses `kubectl` against Rancher's provisioning API. Updated the comment.
- The Step 2 Rancher customization used a standalone `HelmChartConfig`. Rancher documentation recommends using `spec.rkeConfig.chartValues` for system chart customization in Rancher-managed RKE2 clusters, so the example was changed to RKE2 chart values in the Rancher `Cluster` resource.
- The workload export command used `kubectl get all`, which includes controller-created objects such as pods and replica sets and does not match the text's claim that cluster-specific objects are excluded. Updated the command to export workload controllers, services, config maps, secrets, ingress, and PVCs directly.
- The CRD export command exported every CRD in the source cluster. Updated it to show exporting application CRDs by name.
- The namespace export command dumped live namespace objects, which can include cluster-specific metadata. Replaced it with clean namespace manifest generation using `kubectl create namespace --dry-run=client -o yaml`.
- The `calicoctl apply` command did not specify the target context. Added `--context=calico-cluster` for multi-cluster safety.

## Review Notes
The Rancher `Cluster` resource examples are still simplified and may need environment-specific fields such as Kubernetes version, node pools, cloud credentials, or registration workflow details in a real Rancher deployment. The Calico policy examples are syntactically valid, but teams should test default-deny policies carefully because Calico policy ordering can immediately block application ingress that is not explicitly allowed.
