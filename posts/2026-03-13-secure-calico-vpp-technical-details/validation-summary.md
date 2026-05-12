# Validation Summary: Secure Calico VPP Technical Details

## Status
validated

## Post Type
Technical security hardening guide

## Technologies Covered
- Calico VPP (vpp-dataplane)
- VPP (FD.io Vector Packet Processor)
- DPDK (Data Plane Development Kit)
- IOMMU / vfio-pci
- IPsec / IKEv2
- WireGuard
- Kubernetes (`kubectl`, ConfigMap, NetworkPolicy)
- OPA / Kyverno (policy engines)
- `vppctl` CLI

## Sources Consulted
- VPP ACL plugin CLI reference: https://s3-docs.fd.io/vpp/22.02/cli-reference/clis/clicmd_src_plugins_acl.html
- VPP startup.conf reference (`socksvr` / `api-segment`): https://my-vpp-docs.readthedocs.io/en/latest/gettingstarted/users/configuring/startup.html
- VPP FD.io source `startup.conf`: https://github.com/FDio/vpp/blob/master/src/vpp/conf/startup.conf
- Calico VPP IPsec documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/ipsec
- Calico VPP getting started: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- vpp-dataplane agent config (`CALICOVPP_IPSEC_IKEV2_PSK`): https://github.com/projectcalico/vpp-dataplane/blob/master/calico-vpp-agent/config/config.go
- Calico VPP troubleshooting (VPP dataplane): https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp

## Issues Found
1. **Invalid `vppctl` ACL command.** The post referenced `vppctl show acl-plugin statistics`, which is not a valid VPP debug CLI command. According to the FD.io VPP ACL CLI reference, the valid `show acl-plugin` subcommands are `acl`, `interface`, `lookup context`, `lookup user`, `macip acl`, `macip interface`, `memory`, `sessions`, and `tables`. I replaced the call with `vppctl show acl-plugin tables` (for ACL hash-table capacity) and added a follow-up `vppctl show acl-plugin memory` (for memory consumption), which more accurately match the intent of "check ACL table capacity vs. usage".
2. **Misplaced `socket-name` in VPP startup configuration.** The `socket-name` parameter for the binary API Unix domain socket belongs to the `socksvr` stanza, not `api-segment`, in current VPP releases (the `api-segment` stanza configures the shared-memory API and accepts `uid`, `gid`, `prefix`, etc., but the Unix socket lives under `socksvr`). I split the example so `socket-name /run/vpp/api.sock` is under a new `socksvr { ... }` block, keeping `uid`, `gid`, and `prefix` under `api-segment`. This now matches the upstream `src/vpp/conf/startup.conf` example.

## Review Notes
- `CALICOVPP_FEATURE_GATES` keys `ipsecEnabled` and `wireguardEnabled` are both valid per Calico VPP documentation and the project's ConfigMap examples.
- `CALICOVPP_IPSEC_IKEV2_PSK` is a real env var consumed by `calico-vpp-agent`, although the recommended production pattern is to inject the PSK via a Kubernetes `Secret` (e.g., `calicovpp-ipsec-secret`) rather than placing the literal value in a ConfigMap. The post's inline example is acceptable as illustration but readers should be aware of the Secret-based pattern.
- `dpdk-devbind.py --status-dev net` is a valid invocation (argparse accepts both `--status-dev=net` and `--status-dev net`).
- `vppctl show api clients` is a valid VPP debug CLI command exposed by the VLIB API infrastructure for inspecting connected API clients.
- The Mermaid diagram correctly describes ACL hash-table behavior (hash lookup → linear-search fallback under collision pressure); no changes needed.
- The recommendation to use `vfio-pci` over `uio_pci_generic` for IOMMU protection against DMA attacks is consistent with DPDK security guidance.
