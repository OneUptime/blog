# Validation Summary: How to Configure STP on Bridges in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1, bridge interface schema)
- Linux kernel bridge driver (sysfs interface, STP timers, port states)
- IEEE 802.1D STP and 802.1w RSTP
- iproute2 (`ip`, `bridge`) commands
- Kubernetes DaemonSets (privileged hostNetwork pods for node-level configuration)
- KubeVirt + Multus NetworkAttachmentDefinition with bridge CNI

## Sources Consulted
- Linux kernel v6.12 source: `net/bridge/br_private.h`, `net/bridge/br_private_stp.h`, `net/bridge/br_stp_if.c`, `net/bridge/br_if.c`, `net/bridge/br_sysfs_if.c`, `net/bridge/br_sysfs_br.c` (https://github.com/torvalds/linux/tree/v6.12/net/bridge)
- iproute2 source: `bridge/bridge.c`, `bridge/link.c` (https://github.com/shemminger/iproute2)
- `bridge(8)` man page (iproute2): https://manpages.debian.org/unstable/iproute2/bridge.8.en.html
- LWN article on hairpin mode: https://lwn.net/Articles/347344/
- Talos v1.9 config reference (BridgeConfig / STP): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- IEEE 802.1D-1998 / 802.1D-2004 / 802.1w timer ranges and port-state semantics

## Issues Found

1. **Invalid `bridge stp show` subcommand.** The post used `bridge stp show br0` (and `bridge stp show`) in three places (monitor loop, "Check Bridge STP State", "Check Port States"). The iproute2 `bridge` utility has no `stp` object — only `link | fdb | mdb | mst | vlan | vni | monitor`. The author likely confused this with the deprecated `brctl showstp <bridge>`. Replaced with `ip -d link show <bridge>`, `bridge -d link show`, and sysfs reads which are the valid modern equivalents.

2. **Wrong port-priority default.** The DaemonSet comment said `default 128, range 0-63, in multiples of 16`. This conflates the 802.1D 8-bit port-priority byte (default 0x80, multiples of 16) with the Linux sysfs `priority` file (which exposes only the upper 6 bits — range 0-63, default 32). `0x8000 >> BR_PORT_BITS` where `BR_PORT_BITS = 10` gives 32, not 128, per `net/bridge/br_if.c`. Fixed the comment to `default 32, range 0-63` and adjusted the example value to 16 (a lower-than-default priority, consistent with the surrounding pattern of biasing this port toward selection).

3. **`stp_state = 2` does not enable RSTP.** Two locations claimed that writing `2` to `/sys/class/net/<br>/bridge/stp_state` "enables RSTP for faster convergence". The Linux kernel implements **only** classic 802.1D STP; value 2 means *user-space STP* — it invokes `/sbin/bridge-stp <br> start` and expects a userspace daemon such as `mstpd` to process BPDUs. Without that daemon (Talos does not ship one), the kernel falls back to its built-in STP. Replaced the `echo 2 > stp_state` call in the DaemonSet with a clarifying comment, and rewrote the "Enable RSTP" snippet under "RSTP vs STP" into a note explaining the kernel limitation and that running RSTP on Talos requires a privileged `mstpd` sidecar.

4. **`hairpin_mode` is not "edge port" / PortFast.** The post claimed `echo 1 > /sys/class/net/.../hairpin_mode` makes a port an edge port. `BR_HAIRPIN_MODE` is the VEPA reflective-relay flag (forward traffic back out the port it arrived on); it has no relation to STP edge ports. Removed the false claim and noted hairpin's actual purpose.

5. **`bridge link set ... guard on` is BPDU Guard, not edge-port designation.** The post described `guard on` as "more specifically for RSTP" to set edge ports. The flag (`BR_BPDU_GUARD`) does the opposite: it disables the port if a BPDU is received, used to *protect* edge ports from BPDU injection. Rewrote the Edge Ports section to (a) explain that kernel STP has no edge-port concept (it's an RSTP feature requiring `mstpd`), (b) show the correct `mstpctl setportadminedge` command, and (c) describe `guard on` accurately as BPDU Guard.

6. **`stp_state` value comments**. Updated the legend comments throughout (`0 = disabled, 1 = kernel STP (802.1D), 2 = user-space STP (requires daemon)`) so readers don't repeat the RSTP misunderstanding.

## Review Notes

- Bridge timer ranges in the post (priority 0-65535, forward_delay 2-30 s, hello_time 1-10 s, max_age 6-40 s) all match `net/bridge/br_private_stp.h` and the IEEE 802.1D-1998 defaults.
- Port-state enum values used in the monitor script (0=disabled, 1=listening, 2=learning, 3=forwarding, 4=blocking) match `net/bridge/br_stp.h`.
- The Talos `machine.network.interfaces[].bridge.stp.enabled` YAML is correct against the v1alpha1 schema. The Talos bridge schema exposes **only** the `enabled` STP knob (plus `interfaces` and `vlan.vlanFiltering`); detailed tuning (forward_delay, hello_time, max_age, port priority, hairpin, guard, root_block, path_cost) genuinely does require the sysfs / DaemonSet approach the post recommends — that framing is accurate.
- The KubeVirt NetworkAttachmentDefinition example uses `cniVersion: 0.3.1` (older but still supported by Multus and the bridge CNI plugin). Not changed, since it remains valid and widely used.
- The post does not pin a Talos version; the v1alpha1 bridge schema referenced has been stable across recent Talos releases (≥ v1.5).
- If the author ever wants true RSTP on Talos, the realistic path is a DaemonSet that runs `mstpd` in a privileged hostNetwork container (e.g., from the `mstpd` upstream or `network-services-traefik` style images) and then uses `mstpctl` for tuning. Out of scope for the current post but worth noting as a follow-up.
