# Validation Summary: Using calicoctl ipam split with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise
- calicoctl
- Calico IPAM
- Kubernetes
- Bash
- Python

## Sources Consulted
- Calico Enterprise documentation: `calicoctl ipam split` command reference, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/split
- Calico Enterprise documentation: `calicoctl ipam show` command reference, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show
- Calico Enterprise documentation: `calicoctl ipam check` command reference, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Open Source documentation: current `calicoctl ipam` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: IPAM concepts, IP pools, and IPAM blocks, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- The post described `calicoctl ipam split` as a general Calico command. Current official Calico Open Source documentation does not list `ipam split`; the command is documented in Calico Enterprise. Updated the introduction and prerequisites to scope the post to Calico Enterprise.
- The post repeatedly described the operation as splitting IP blocks. Official documentation says `ipam split` splits an IP pool into smaller IP pools. Updated the description, headings, and examples to use pool terminology.
- The examples omitted the required `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` workflow. Added those commands around split examples and mentioned them in the pre-split validation output.
- The "When to Split Blocks" section included claims that implied pool splitting directly rebalances per-node IPAM blocks. Calico IPAM blocks are separate per-node chunks created and destroyed automatically. Reworded the bullets to focus on pool segmentation and topology planning.
- The Python planning snippet used escaped quotes inside an f-string expression, which is invalid Python syntax. Replaced it with a separate `name` variable before printing the suggested command.
- The Bash power-of-two validation did not reject values below 2. Updated it to reject invalid split counts before accepting the operation.

## Review Notes
The post is technically valid after the corrections. Future improvements could include a stronger warning that datastore locking blocks IPAM changes while the split is in progress, and that split operations should be planned during a maintenance window for busy clusters.
