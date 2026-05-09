# Validation Summary: Troubleshoot BlockAffinity Behavior in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico BlockAffinity resources
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- calicoctl ipam configure reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The stale node comparison command used `grep -v` with a generated regular expression and could produce unreliable matches. I changed it to a `comm` comparison between sorted Calico node names and Kubernetes node names.
- The cross-block borrowing diagnostic used `calicoctl ipam show --show-blocks`, which shows block utilization but does not directly list borrowed IPs. I changed it to `calicoctl ipam show --show-borrowed`, which is the documented command for borrowed IP details.
- The IPPool block size update used `calicoctl patch ... --type merge` to change `spec.blockSize`. Calico documents that `blockSize` can only be set when the pool is created and cannot be edited directly after installation. I replaced the patch example with delete-and-recreate guidance after draining or moving workloads.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Changing or deleting IP pools is disruptive; the post now notes the need to drain or move workloads, but a future expansion could link to the full ordered Calico block-size migration workflow.
