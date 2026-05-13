# Validation Summary: How to Migrate Existing Workloads to Calico on Windows Nodes with Rancher

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows nodes
- Calico
- CNI networking
- NetworkPolicy
- calicoctl
- kubectl

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Container Network Interface Providers FAQ: https://ranchermanager.docs.rancher.com/faq/container-network-interface-providers
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Windows and BGP: https://docs.rke2.io/networking/windows_bgp
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico Windows operator installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPAM configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig

## Issues Found
- The post incorrectly stated that Rancher-managed RKE2 clusters can migrate in place by changing the CNI through the Rancher edit cluster workflow. Rancher's RKE2 cluster configuration documentation says the network provider cannot be changed after launch. I changed the migration path to creating a replacement Rancher-managed RKE2 cluster with Calico selected and moving workloads to it.
- The prerequisites implied an in-place migration from a non-Calico CNI. I updated them to identify the current cluster as the source cluster and require capacity for a replacement Calico-backed RKE2 cluster.
- Step 2 described editing the existing cluster network provider. I changed it to creating a new RKE2 cluster in Rancher with Calico selected as the container network provider.
- Step 3 described monitoring a cluster update. I changed it to monitoring cluster provisioning.
- Step 4 used an invalid IPPool patch field, `spec.encapsulation`, for a Calico IPPool. Calico's IPPool API uses `ipipMode` and `vxlanMode`, and Calico for Windows requires IP-in-IP to be disabled and VXLAN enabled. I changed the command to patch `ipipMode` to `Never` and `vxlanMode` to `Always`.
- Step 4 omitted the documented Calico for Windows requirement to enable strict IPAM affinity when using Calico IPAM. I added the `kubectl patch ipamconfigurations default --type merge --patch='{"spec":{"strictAffinity":true}}'` command.
- Step 5 described restarting Windows workloads after an in-place CNI change. I changed it to deploying workloads to the new Calico-backed cluster and using drain/uncordon only when workloads need to be rescheduled on a Windows node after Calico settings are applied.
- The conclusion repeated the unsupported in-place migration flow. I updated it to reflect the replacement-cluster workflow.
- The tags used `Window` instead of `Windows`. I corrected the tag to match the Windows-node topic.

## Review Notes
The remaining commands are plausible for the corrected workflow, but production migrations should usually restore workloads from source-of-truth manifests, Helm releases, GitOps configuration, or backup tooling rather than directly applying `kubectl get all -A -o yaml` output. That operational caveat was not expanded because the task asked for technical corrections without restructuring the post.
