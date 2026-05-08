# Validation Summary: How to Validate Resolution of BGP Peer Not Established in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Linux routing
- kubectl
- calicoctl

## Sources Consulted
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting commands for BGP peer and route validation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IP pool documentation for IPAM blocks and BGP export behavior: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl create job` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The BusyBox validation pods used `kubectl run ... -- sleep 120` without `--command`. Kubernetes documents that arguments after `--` are container args by default, and `--command` is required to override the container command. Updated both pod creation commands to use `--command -- sleep 120`.
- The cross-node ping test did not guarantee that the source and destination pods were scheduled on different nodes. Added a label to the source pod and required pod anti-affinity to the destination pod so the test is genuinely cross-node when the cluster has more than one schedulable node.
- The non-established peer check only matched `Idle`, `Active`, and `Connect`. Calico BGP status can also report other non-established states such as `OpenSent`, `OpenConfirm`, `Close`, `Down`, and `Passive`. Broadened the grep pattern to include those states.
- The route validation wording implied that a single `ip route` check validates all nodes, but `ip route` shows the local node's routing table. Clarified that the route check should be run on each Calico node and changed the example to inspect routes installed with protocol `bird`.

## Review Notes
- Calico IPAM often advertises allocation blocks, such as `/26` for IPv4 by default, rather than a Kubernetes node `.spec.podCIDR` in every installation. The post is accurate for clusters where node pod CIDRs are populated and reflected in BGP routes, but future improvements could mention Calico IPAM block validation with `calicoctl ipam show --show-blocks`.
