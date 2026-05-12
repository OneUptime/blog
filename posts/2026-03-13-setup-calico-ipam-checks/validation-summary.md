# Validation Summary: How to Set Up Calico IPAM Checks Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (CNI / IPAM)
- Kubernetes
- calicoctl v3.x
- Bash scripting

## Sources Consulted
- [calicoctl ipam show reference](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show)
- [calicoctl ipam check reference](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check)
- [Calico resources overview](https://docs.tigera.io/calico/latest/reference/resources/overview)
- [Calico IPAM get started docs](https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses)
- [Calico IPAMConfig resource](https://docs.tigera.io/calico/latest/reference/resources/ipamconfig)

## Issues Found
1. **Wrong CRD name in Prerequisites.** The post listed `IPAMAllocation` as a CRD that needs read permissions. Calico does not have an `IPAMAllocation` CRD. The correct IPAM CRDs in the `crd.projectcalico.org` group are `IPAMBlock`, `IPAMHandle`, and `IPAMConfig`. Changed `IPAMAllocation` to `IPAMHandle`, which is the CRD that pairs with `IPAMBlock` for tracking allocations.
2. **Wrong subcommand for `--show-all-ips` flag in Step 3.** The post used `calicoctl ipam show --show-all-ips | head -50` to "show which pod has which IP". The `--show-all-ips` flag is only accepted by `calicoctl ipam check`, not `calicoctl ipam show` (whose valid flags are `--ip`, `--show-blocks`, `--show-borrowed`, and `--show-configuration`). Changed the command to `calicoctl ipam check --show-all-ips | head -50`, which is the documented command that prints every checked IP along with its allocation/pod info.

## Review Notes
- The Prerequisites mention the `calico-system` namespace, which is correct for operator-based (Tigera Operator) installs. Manifest-based installs use `kube-system` instead; readers on legacy installs may need to substitute the namespace.
- The example output for `calicoctl ipam show` is simplified; the actual command emits additional columns (e.g., `IPS TOTAL`, `IPS FREE`) depending on the calicoctl version. This is illustrative and acceptable.
- The 85% utilization threshold in the mermaid diagram is a reasonable operational heuristic, not a Calico-defined value — readers should treat it as guidance.
- `calicoctl ipam check` returns a non-zero exit code on inconsistency, so the `$?` check in `weekly-ipam-check.sh` works as intended.
