# Validation Summary: Troubleshooting Calico IPAM Split Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Enterprise IPAM
- calicoctl
- Kubernetes
- kubectl
- IPPool resources
- jq

## Sources Consulted
- Calico Enterprise calicoctl ipam check documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Enterprise calicoctl ipam split documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/split
- Calico Enterprise calicoctl ipam show documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source create multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The prerequisites said generic Calico v3.x, but `calicoctl ipam check` and `calicoctl ipam split` are documented in Calico Enterprise documentation and are not listed in the current Calico Open Source `calicoctl ipam` command set. Updated the prerequisite to specify Calico Enterprise with `calicoctl` support for those subcommands.
- The IPAM inconsistency section described allocation records referencing a disabled original pool. Calico documentation states disabled pools are not used for new pod assignments but are still recognized, so this scenario is more accurate for a deleted original pool. Updated the wording accordingly.
- The pod IP search comment claimed the command found pods in the original CIDR but not in either sub-pool, while the command only greps for a CIDR prefix. Updated the comment to say the output should be compared against the sub-pool CIDRs.
- The stuck-pod diagnostic mixed `topology.kubernetes.io/zone` with the `zone` label used elsewhere in the post. Updated it to read `.metadata.labels.zone`.
- The command `calicoctl ipam show --show-blocks | grep "$NODE_ZONE"` would not reliably work because `ipam show --show-blocks` reports pool and block CIDRs, not zone labels. Replaced it with an IPPool selector lookup followed by full block utilization output.
- The command `calicoctl get ippool -o wide | grep disabled` was case-sensitive and unlikely to match the `DISABLED` column. Replaced it with `calicoctl get ippool -o wide` so the reader can inspect the `DISABLED` column directly.

## Review Notes
The Calico IPPool YAML fields used in the fallback pool are valid for current Calico v3.x, including `cidr`, `ipipMode`, `vxlanMode`, `blockSize`, `natOutgoing`, and `disabled`. The post assumes a simple `zone` label convention; clusters using the standard `topology.kubernetes.io/zone` label should either update IPPool selectors or adjust the commands consistently.
