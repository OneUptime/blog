# Validation Summary: Validate BlockAffinity Behavior in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Calico IPAM
- BlockAffinity
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico Open Source documentation: `calicoctl ipam show` command, including `--show-blocks` and `--show-borrowed`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: `calicoctl ipam release` command and `--from-report`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source documentation: IPAM blocks and default block sizes: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source documentation: IP pool `blockSize` defaults and behavior: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: decommissioning a node with `calicoctl delete node`: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico Open Source documentation: `calicoctl get` output formats: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Enterprise BlockAffinity resource reference, used for the BlockAffinity resource shape and supported get/list behavior: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Project Calico source code, used to confirm current `calicoctl ipam check` and `--show-borrowed` command support: https://github.com/projectcalico/calico

## Issues Found
- The post used `calicoctl ipam show --show-borrowed-ips`, but the current Calico CLI flag is `--show-borrowed`. Updated the command so it matches the documented and implemented flag.
- The post recommended `calicoctl ipam release-leaked-ips --allow-version-mismatch`, but current `calicoctl` does not provide a `release-leaked-ips` subcommand. Replaced it with the supported `calicoctl ipam check -o /tmp/ipam-report.json --show-problem-ips` and `calicoctl ipam release --from-report=/tmp/ipam-report.json` workflow.
- The post recommended deleting a specific BlockAffinity with `calicoctl delete blockaffinity <block-affinity-name>`. BlockAffinity resources are managed by Calico IPAM and the BlockAffinity reference lists delete as unsupported. Replaced that guidance with `calicoctl delete node <node-name>` for retired Calico Node cleanup.
- The best-practice bullet about enabling Calico garbage collection for block affinities was not tied to a documented operator setting. Reworded it to recommend Calico node cleanup procedures when removing nodes.

## Review Notes
BlockAffinity is an internal IPAM-managed resource. Inspecting it is useful for diagnostics, but cleanup should use supported IPAM and node decommissioning workflows rather than direct BlockAffinity mutation.
