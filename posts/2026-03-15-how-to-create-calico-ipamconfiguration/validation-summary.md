# Validation Summary: How to Create the Calico IPAMConfiguration Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPAMConfiguration resources
- Calico IPPool resources
- Kubernetes custom resources
- calicoctl IPAM commands

## Sources Consulted
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam configure command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico IP address management guide: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp

## Issues Found
- The post used `calicoctl get ipamconfiguration` and `calicoctl apply -f` for `IPAMConfiguration` manifests. Current `calicoctl get` and `calicoctl apply` documentation does not list `IPAMConfiguration` as a supported resource type, while Calico documents it as a Kubernetes custom resource named `ipamconfigurations`. Replaced those examples with `kubectl get ipamconfigurations` and `kubectl apply -f` for IPAMConfiguration manifests.
- The initial configuration check used `calicoctl get ipamconfiguration -o yaml`. Replaced it with `calicoctl ipam show --show-configuration`, which is the documented calicoctl command for showing the current IPAM configuration.
- The strict-affinity explanation said it is required for cloud provider routing or BGP with full mesh disabled. That was too broad: disabling BGP node-to-node mesh requires replacement BGP peerings, but does not by itself make strict affinity universally required. Reworded the claim to say strict affinity is required for integrations that depend on pod IPs staying within local node blocks.
- The VPC routing section stated strict affinity is required for all cloud VPC routing. Reworded it to cloud VPC routing that installs per-node routes, where keeping workload IPs inside node-owned blocks is the relevant requirement.
- The /26 capacity statement said each node can host up to 256 pod IPs with four blocks. Clarified this as IPAM capacity and noted that kubelet and node capacity limits still apply.

## Review Notes
- The `IPAMConfiguration` examples use the required singleton name `default` and valid `strictAffinity` and `maxBlocksPerHost` fields.
- The `IPPool` example uses valid `cidr`, `ipipMode`, `natOutgoing`, `nodeSelector`, and `blockSize` fields. The `blockSize` field can only be set when the pool is created.
- `calicoctl ipam show --show-blocks` and `calicoctl ipam show` are documented commands for inspecting IPAM usage and block allocation.
