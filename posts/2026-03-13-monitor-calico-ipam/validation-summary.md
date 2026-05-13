# Validation Summary: How to Monitor Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPAM
- Calico IP pools
- Kubernetes custom resources
- calicoctl
- Tigera Operator Installation resource

## Sources Consulted
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico block affinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The description referred to monitoring "metrics", but the post uses `calicoctl` and `kubectl` commands rather than metrics. I changed the wording to "commands" to match the implementation shown.
- The "Check IP pool utilization" example used `calicoctl ipam show --show-configuration`, which shows global IPAM configuration such as `StrictAffinity` and `AutoAllocateBlocks`, not pool utilization. I changed it to `calicoctl ipam show`, which the official documentation uses for IP pool usage.
- The "View node block assignments" example used `kubectl get ipamhandles -A`. IPAM handles identify allocation handles, while Calico block affinities represent the node-to-IPAM-block relationship. I changed the command to `kubectl get blockaffinities.crd.projectcalico.org`.
- The "List all allocated IPs" wording overstated what `calicoctl ipam check --show-all-ips` reports. I changed it to "List all checked IPs", matching the command help.
- The orphaned-allocation example repeated `--show-all-ips`. I changed it to `--show-problem-ips`, the documented flag for showing leaked or improperly allocated IPs.

## Review Notes
The operator `Installation` snippet is valid for configuring default IP pools at installation time, including `blockSize`, `encapsulation: VXLAN`, and `natOutgoing: Enabled`. Calico documentation notes that `blockSize` is set when an IP pool is created and cannot be edited directly afterward without a migration workflow.
