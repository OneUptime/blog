# Validation Summary: How to Troubleshoot Calico IPAM Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source IPAM
- Kubernetes
- calicoctl
- Calico IPPool resources
- Calico BlockAffinity resources

## Sources Consulted
- Calico Open Source 3.32 documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source 3.32 documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 documentation: calicoctl ipam release - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source 3.32 documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source 3.32 documentation: BlockAffinity resource - https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico Open Source 3.32 documentation: Migrate from one IP pool to another - https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source 3.32 documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source 3.32 documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The new IPPool example used a concrete arbitrary CIDR (`10.240.0.0/16`) without warning that Calico pools should be disjoint and should stay within the Kubernetes pod CIDR. Changed the example to use `<unused-pod-cidr>` and added a short note to use a disjoint CIDR inside the pod CIDR and match the existing encapsulation mode.
- The orphaned block command parsed `calicoctl ipam show --show-blocks` with `awk '{print $2}'`, but the command emits a table where that field does not reliably contain the block CIDR. Replaced it with a `calicoctl get blockaffinity` command using the documented BlockAffinity resource fields (`spec.node` and `spec.cidr`).
- The post referred to releasing orphaned block affinity manually. Calico documents BlockAffinity resources as managed by Calico IPAM, so the note was changed to say Calico normally reclaims blocks automatically after node deletion.

## Review Notes
The `calicoctl ipam check`, `calicoctl ipam show --show-blocks`, and `calicoctl ipam release --ip=<IP>` command forms are current in the Calico Open Source 3.32 documentation. The IPPool fields `cidr`, `ipipMode`, and `natOutgoing` are valid, but operators should adjust encapsulation (`ipipMode` or `vxlanMode`) to match their cluster design.
