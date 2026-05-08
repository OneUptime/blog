# Validation Summary: How to Use the Calico IPAMConfiguration Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAMConfiguration resources
- Calico IPPool resources
- calicoctl IPAM commands
- AWS VPC/native routing and overlay networking concepts

## Sources Consulted
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico IP address management guide: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico AWS public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/aws

## Issues Found
- The monitoring script parsed strings (`IPs in use` and `total capacity`) that do not appear in current `calicoctl ipam show` output. Updated the script to parse the documented table columns for `IP Pool`, `IPS TOTAL`, and `IPS IN USE`.
- The large-cluster section stated that /24 blocks and `maxBlocksPerHost: 3` let each node support up to 768 pods. Qualified this as IPAM capacity for pod IPs, because actual pods per node are also constrained by kubelet limits and node capacity.
- The leaked-IP troubleshooting command used `calicoctl ipam show --show-blocks | grep -v "allocated"`, which does not reliably identify leaked IPs. Replaced it with `calicoctl ipam check --show-problem-ips`, the documented command for reporting leaked or incorrectly allocated IPs.

## Review Notes
- The `IPAMConfiguration` examples use the required singleton name `default` and valid `strictAffinity` and `maxBlocksPerHost` fields.
- The IPPool examples use valid `cidr`, `blockSize`, `ipipMode`, `vxlanMode`, `natOutgoing`, and `nodeSelector` fields. The documented IPv4 block-size range is 20 through 32, and the examples fall within that range.
- Calico documentation notes that `blockSize` can only be set when the pool is created, so these examples are appropriate for new pools or migrations rather than in-place updates of existing pools.
