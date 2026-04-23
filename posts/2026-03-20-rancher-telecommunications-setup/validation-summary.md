# Validation Summary: How to Set Up Rancher for Telecommunications - Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Fleet
- RKE2
- K3s
- Kubernetes
- Multus CNI
- SR-IOV Network Operator
- SR-IOV CNI
- DPDK
- Prometheus / Rancher Monitoring

## Sources Consulted
- Kubernetes HugePages documentation: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- Linux HugeTLB documentation: https://docs.kernel.org/admin-guide/mm/hugetlbpage.html
- RKE2 configuration documentation: https://docs.rke2.io/install/configuration
- RKE2 Multus and SR-IOV documentation: https://docs.rke2.io/networking/multus_sriov
- RKE2 network options reference: https://docs.rke2.io/networking/basic_network_options
- SR-IOV Network Operator upstream repository and install/examples: https://github.com/k8snetworkplumbingwg/sriov-network-operator
- SR-IOV Network Operator source/CRD implementation: https://github.com/openshift/sriov-network-operator
- Kubernetes CPU Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Topology Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Fleet GitRepo reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet downstream targeting reference: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- K3s installation/configuration documentation: https://docs.k3s.io/installation/configuration
- K3s packaged components / Traefik disable documentation: https://docs.k3s.io/installation/packaged-components
- K3s FAQ: https://docs.k3s.io/faq
- Rancher monitoring documentation: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting
- Rancher charts index: https://charts.rancher.io/index.yaml
- Helm install reference: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The hugepages example mixed `vm.nr_hugepages` with 1Gi hugepages. I removed the `sysctl` step and kept boot-time hugepage configuration, which is the documented approach for `hugepages-1Gi`.
- The RKE2 Multus configuration used a scalar `cni: multus,calico` example, while current RKE2 documentation shows Multus configured as the first item in a YAML list. I changed the snippet to list form.
- The post used `whereabouts` IPAM without enabling the RKE2 Whereabouts dependency. I added the required `HelmChartConfig` snippet for `rke2-multus`.
- The SR-IOV Network Operator install command pointed at a GitHub Pages Helm repo URL that currently returns `404`. I replaced it with the current upstream OCI chart install command.
- The SR-IOV resource prefix in the `NetworkAttachmentDefinition` and pod resource requests used `intel.com/...`, but the operator defaults to the `openshift.io/` resource prefix unless explicitly overridden. I corrected those resource names.
- The `apps/v1` Deployment example was invalid because it omitted the required `.spec.selector` and matching pod template labels. I added both required fields.
- The topology spread example claimed multi-AZ behavior but used `kubernetes.io/hostname`, which spreads by node, not by availability zone. I changed the topology key to `topology.kubernetes.io/zone`.
- The Rancher Monitoring Helm example omitted the Rancher charts repository setup and the separate `rancher-monitoring-crd` chart install required for CLI-driven installation. I added those steps.
- The K3s install example used `sh -` instead of `sh -s -`, which breaks argument passing, and used the older `--no-deploy=traefik` flag. I corrected the command to `sh -s -` and `--disable=traefik`.

## Review Notes
- The GRUB example is still Linux-distribution-specific and assumes an Intel-based system because it uses `update-grub` and `intel_iommu=on`. Equivalent commands/flags differ on some distros and on AMD hardware.
- The SR-IOV operator may also require labeling the `sriov-network-operator` namespace as privileged on clusters enforcing Pod Security Admission.
- For reproducible production installs, the Rancher Monitoring examples would be stronger if they pinned matching versions for `rancher-monitoring-crd` and `rancher-monitoring` from the Rancher charts index.
