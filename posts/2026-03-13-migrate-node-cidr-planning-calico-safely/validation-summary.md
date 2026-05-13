# Validation Summary: Migrate Node CIDR Planning in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source v3.x
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/

## Issues Found
- The post used `calicoctl get ippool -o jsonpath`, but the official `calicoctl get` output formats are `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`. Changed the command to use `go-template`.
- The post described `/26`, `/25`, and `/24` blocks as having 62, 126, and 254 usable addresses. Calico IPAM reports the full block size as available addresses, so the comments now state 64, 128, and 256 IPs per block.
- The pod-count command included the `kubectl get pods` header row in the `awk` calculation. Added `--no-headers`.
- The new pool file comment referenced `calico-ipam/new-node-cidr-pool.yaml`, while the apply command used `new-node-cidr-pool.yaml`. Updated the comment to match the command.
- The old pool was disabled by piping YAML through a Python script that depends on PyYAML being installed. Replaced it with the official `calicoctl patch ippool ...` command shown in Calico's block-size migration documentation.
- The migration workflow implied `kubectl drain` would recreate all pods, but Kubernetes drain does not delete DaemonSet-managed pods. Added a note to identify workload DaemonSets and restart them separately when needed.
- The block-size validation command searched for the word `Blocks`, which does not confirm the block CIDR size. Changed it to check for `/24` block CIDRs in `calicoctl ipam show --show-blocks`.
- The old-pool validation command assumed the old CIDR prefix was `10.244`. Added a comment telling readers to replace it with their old CIDR prefix.
- The conclusion said the migration could be done without disrupting running workloads. Since draining and pod recreation are disruptive operations, changed this to "controlled workload disruption."

## Review Notes
- The `/24` block-size recommendation is a conservative sizing example for clusters with the default kubelet `--max-pods` value of 110, but smaller blocks may be more efficient for lower pod density. Calico can allocate additional blocks to a node when needed, with route-table tradeoffs.
- The IPPool example uses `ipipMode: CrossSubnet`; readers using VXLAN or no encapsulation should match their existing Calico encapsulation mode.
