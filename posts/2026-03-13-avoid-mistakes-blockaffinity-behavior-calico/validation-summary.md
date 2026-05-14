# Validation Summary: Avoid Mistakes with Calico Block Affinity Behavior

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico block affinity resources
- Calico IPPool resources
- `calicoctl`
- Kubernetes node lifecycle and `kubectl`

## Sources Consulted
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico block affinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- `calicoctl delete` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete

## Issues Found
- The post described `calicoctl ipam show --show-blocks` output as if it included node ownership, handles, and borrowed counts. The current command reports IP pool and block utilization; borrowed IP detail is exposed through `calicoctl ipam show --show-borrowed`. I updated the example output and borrowed-IP command.
- The node deletion section claimed blocks are not released by default and gave an invalid orphan-detection pipeline based on parsing a non-existent node column from `ipam show --show-blocks`. I revised it to describe the Calico node controller cleanup behavior, compare Calico and Kubernetes node resources, and decommission stale Calico node resources where needed.
- The post used invalid `calicoctl ipam release --ip=... --block` and `calicoctl ipam check --remove-extra-nodes` commands. I replaced them with the documented `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json` workflow.
- The IPPool YAML specified both `ipipMode` and `vxlanMode`. Calico IPPool resources do not allow both fields at the same time, so I removed `ipipMode: Never` from the VXLAN example.
- The post suggested finding borrowed IPs with `calicoctl ipam show --show-blocks | grep -v "0$"`, which is not reliable and does not match the documented output. I replaced it with `calicoctl ipam show --show-borrowed`.
- The post suggested manually deleting block affinity resources with `calicoctl delete blockaffinity node=...`. Block affinity resources are managed by Calico IPAM, and the documented cleanup path is node decommissioning plus IPAM consistency checking. I replaced the command with `calicoctl delete node ...` and the IPAM report release workflow.
- The block size formula was incorrect because `blockSize` is a CIDR prefix length, not the number of host bits. I changed the IPv4 guidance to `blockSize = 32 - ceil(log2(max_pods + buffer))`.
- The node-specific block inspection command grepped a node name from `ipam show --show-blocks`, but that output does not contain node names. I changed it to inspect block affinity YAML for the node.

## Review Notes
The post is now accurate for current Calico Open Source v3.x documentation as of Calico 3.32. Block affinity is a low-level Calico IPAM resource; future revisions could avoid encouraging direct block affinity inspection unless troubleshooting requires it.
