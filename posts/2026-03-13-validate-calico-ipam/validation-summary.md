# Validation Summary: How to Validate Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- Calico IP pools
- calicoctl
- Kubernetes CRDs
- Tigera Operator Installation API

## Sources Consulted
- Calico Open Source documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Enterprise documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Enterprise documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Enterprise documentation: BlockAffinity resource, https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico Open Source documentation: Use a specific IP address with a pod, https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip

## Issues Found
- The post used `calicoctl ipam show --show-configuration` as the command for checking IP pool utilization. The documented purpose of that flag is to show global IPAM configuration such as `StrictAffinity` and `AutoAllocateBlocks`, while `calicoctl ipam show` reports pool utilization. Changed the utilization command to `calicoctl ipam show`.
- The post used `kubectl get ipamhandles -A` for viewing node block assignments. IPAM handles track allocation handles, not block-to-node affinity. Changed the example to query `blockaffinities.crd.projectcalico.org` and show the node, CIDR, and state fields.
- The post repeated `calicoctl ipam check --show-all-ips` for orphaned allocation checks. The documented flag for leaked or incorrectly allocated IPs is `--show-problem-ips`. Updated the orphaned allocation example accordingly.
- The conclusion said IPAM health checks catch pool exhaustion. `calicoctl ipam check` validates IPAM consistency, while utilization output is what helps detect exhaustion. Updated the wording to distinguish consistency checks from utilization monitoring.

## Review Notes
The operator `Installation` IP pool example uses valid current fields and enum values: `cidr`, `blockSize`, `natOutgoing: Enabled`, and `encapsulation: VXLAN`. The `blockSize` field can only be set when creating an IP pool, so future revisions could call that out if the post is expanded. Current Calico Open Source documentation lists `ipam show`, `ipam release`, and `ipam configure`; the `ipam check` command is documented in current Calico Enterprise references, so operators should confirm their installed `calicoctl` supports it.
