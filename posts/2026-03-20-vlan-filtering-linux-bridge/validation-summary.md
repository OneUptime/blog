# Validation Summary: How to Configure VLAN Filtering on a Linux Bridge

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel bridging (VLAN-aware bridges)
- 802.1Q VLAN filtering
- iproute2 (`ip` and `bridge` commands)
- KVM/tap virtual interfaces (context)

## Sources Consulted
- bridge(8) man page: https://man7.org/linux/man-pages/man8/bridge.8.html
- iproute2 source `bridge/vlan.c`: https://raw.githubusercontent.com/shemminger/iproute2/main/bridge/vlan.c
- ip-link(8) man page for `type bridge` / `type vlan` options

## Issues Found
- **`tagged` keyword in `bridge vlan add`**: The post used `bridge vlan add dev eth0 vid 10 tagged`, but `tagged` is not a valid keyword in iproute2's `bridge vlan` subcommand. The accepted keywords are `pvid`, `untagged`, `self`, `master`, and `tunnel_info` (verified against both the bridge(8) man page and iproute2's `bridge/vlan.c` argument parser). Running the original command would fail with an argument-parsing error. Fixed by removing `tagged` from the trunk-port examples (in the "Configure Trunk Port" section and the "Full Multi-VLAN Bridge Example" script) and adding a comment clarifying that tagged is the default egress behavior when neither `untagged` nor `pvid` is set. Also removed backticks around `tagged` in the conclusion so readers aren't misled into treating it as a literal CLI token.

## Review Notes
- `ip link add br0 type bridge vlan_filtering 1`, `ip link set br0 type bridge vlan_filtering 1`, and `ip link set eth0 master br0` are all correct for current iproute2.
- `bridge vlan add dev tap0 vid 10 pvid untagged` is correct for an access port; `pvid` marks the VLAN as the ingress Port VLAN ID for untagged frames and `untagged` strips the tag on egress.
- `bridge vlan add dev br0 vid 10 self` correctly targets the bridge device itself (as opposed to a subordinate port), which is required for a `br0.10` VLAN subinterface to receive VLAN-10 traffic into the host.
- The sample `bridge vlan show` output format is approximately correct for iproute2's text output, though exact formatting (spacing, presence of `Egress` label) varies by iproute2 version; users on newer versions may see a slightly different layout or can use `bridge -j vlan show` for JSON.
- The post does not call out that interfaces added with `ip link` are not persistent across reboots; readers deploying this in production should combine it with systemd-networkd, NetworkManager, or a script at boot. Out of scope for this post.
