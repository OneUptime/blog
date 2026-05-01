# Validation Summary: How to Enable STP on a Linux Bridge

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Linux bridge configuration with `iproute2`
- Spanning Tree Protocol (STP) on Linux bridges
- Legacy `brctl` / `bridge-utils` inspection
- Netplan bridge configuration
- Open vSwitch RSTP support

## Sources Consulted
- [Linux kernel documentation: Ethernet Bridging](https://www.kernel.org/doc/html/next/networking/bridge.html)
- [Netplan documentation: YAML configuration](https://netplan.readthedocs.io/en/latest/netplan-yaml/)
- [Open vSwitch documentation: `ovs-vswitchd.conf.db(5)`](http://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html)
- [Open vSwitch documentation: Common Configuration Issues](https://docs.openvswitch.org/en/latest/faq/issues/)
- [ip-link(8) manual page](https://man7.org/linux/man-pages/man8/ip-link.8.html)
- [bridge(8) manual page](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [brctl(8) manual page](https://man7.org/linux/man-pages/man8/brctl.8.html)
- Local CLI help: `man 8 ip-link`, `man 8 bridge`

## Issues Found
1. The verification section used the deprecated bridge sysfs interface and `bridge link show` as if it reported bridge-level STP enablement. I replaced that with `ip -d link show dev br0`, which is the current `iproute2` path and exposes `stp_state`.
2. The timer configuration examples wrote directly to `/sys/class/net/br0/bridge/*`. Current kernel documentation marks the bridge sysfs interface as deprecated, so I replaced those examples with `ip link set dev br0 type bridge ...` commands and clarified that `forward_delay` is the time spent in each of the Listening and Learning states.
3. The STP timing explanation implied every port always progresses to forwarding and described Blocking as a transient “until elected” state. I narrowed that wording to ports that actually forward and made the Blocking description topology-dependent.
4. The Netplan snippet omitted the required top-level `network:` mapping and `version: 2`, so it was not a valid standalone Netplan configuration. I added both fields.
5. The RSTP section and conclusion overstated a few points: the original wording was imprecise about Linux bridge versus Open vSwitch RSTP support, it used an unsourced precise RSTP convergence number, and it called `forward_delay=4` a “minimum recommended” value. I corrected the RSTP wording and changed the timer guidance to the documented valid `forward_delay` range of 2 to 30 seconds.
6. The “When NOT to Use STP” section said a KVM hypervisor with VMs has “no loops, just overhead,” which is not generally true. I narrowed that guidance to simple VM bridge setups with no redundant Layer 2 paths.

## Review Notes
- `brctl` is still functional but upstream marks it as obsolete. The post now labels it as legacy while keeping the example accurate.
- Netplan documents `parameters.stp` as a valid bridge key; keeping `stp: true` is correct, though it is explicit rather than minimal.
- Local checks: `validation.json` was validated with `jq`; `man 8 ip-link` and `man 8 bridge` were used to confirm bridge command syntax and parameter ranges. Live runtime validation on a test bridge was not possible in this workspace because `ip link add ... type bridge` returned `RTNETLINK answers: Operation not permitted`.
