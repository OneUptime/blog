# Validation Summary: Optimize Calico VPP Uplink Configuration

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Calico VPP dataplane (`CALICOVPP_INTERFACES`, `CALICOVPP_INITIAL_CONFIG`)
- VPP (Vector Packet Processing) startup.conf dpdk plugin
- DPDK (Data Plane Development Kit) and the `vfio-pci` driver
- Receive Side Scaling (RSS) and Intel Flow Director (rte_flow)
- Kubernetes (`kubectl exec` against the calico-vpp-node DaemonSet)
- `ethtool` for NIC offload inspection

## Sources Consulted
- Calico VPP dataplane config struct (`UplinkInterfaceSpec`, `CalicoVppInitialConfigConfigType`) — https://github.com/projectcalico/vpp-dataplane/blob/master/config/config.go
- Calico VPP uplink configuration reference — https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- VPP dpdk plugin init parsing (`devargs`, `rss` sub-block) — https://github.com/FDio/vpp/blob/master/src/plugins/dpdk/device/init.c
- VPP dpdk RSS hash function tokens (`foreach_dpdk_rss_hf`) — https://github.com/FDio/vpp/blob/master/src/plugins/dpdk/device/dpdk.h
- VPP dpdk CLI commands (`show dpdk buffer`, etc.) — https://github.com/FDio/vpp/blob/master/src/plugins/dpdk/device/cli.c
- VPP `set interface mtu` parsing — https://github.com/FDio/vpp/blob/master/src/vnet/interface_cli.c and https://fdio-vpp.readthedocs.io/en/latest/reference/cmdreference/interface/setinterface.html
- VPP `flow` CLI for rte_flow / Flow Director — https://github.com/FDio/vpp/blob/master/src/vnet/flow/flow_cli.c
- DPDK i40e PMD devargs reference — https://doc.dpdk.org/guides/nics/i40e.html

## Issues Found

1. **CALICOVPP_INTERFACES JSON field names were wrong.** The post used Go-style names (`numRxQueues`, `numTxQueues`, `rxQueueSize`, `txQueueSize`, `newDriverName`) but the actual JSON struct tags in `vpp-dataplane/config/config.go` are `rx`, `tx`, `rxqsz`, `txqsz`, and `newDriver`. Fixed Optimization 1's config snippet to use the correct keys. A user copy-pasting the original would silently get default queue/ring sizes.

2. **`vppctl show dpdk statistics` is not a real CLI command.** The dpdk plugin exposes `show dpdk buffer`, `show dpdk physmem`, `show dpdk version`, and a few others — there is no `statistics` sub-command. Per-queue RX/TX packet counters are visible via `show hardware-interfaces`. Updated the verification step in Optimization 2 to call `vppctl show hardware-interfaces`.

3. **`CALICOVPP_INITIAL_CONFIG.uplinkMtu` does not exist.** The `CalicoVppInitialConfigConfigType` struct has no MTU field. MTU is configured per-interface via the `mtu` field on an `UplinkInterfaceSpec`. Rewrote Optimization 5's YAML to set `"mtu": 9000` inside `uplinkInterfaces` under `CALICOVPP_INTERFACES`.

4. **`devargs "flow_type_rss_offloads=0xffffffff"` is not a valid Intel PMD devarg.** DPDK's i40e/ice/ixgbe PMDs do not accept `flow_type_rss_offloads` as a runtime devarg — RSS offload flags are set programmatically via `rte_eth_conf.rss_conf.rss_hf`, not via the devargs string. In VPP, deterministic queue steering via Flow Director is configured through the rte_flow API, exposed as the `flow add ... redirect-to-queue` CLI command. Replaced Optimization 6's startup.conf snippet with a `vppctl flow add` example.

## Review Notes

- **VPP `rss { ipv4-tcp ipv4-udp ... }` syntax IS valid** despite not appearing in the (admittedly incomplete) startup.conf reference page. The `dpdk` plugin's `init.c` parses an `rss` sub-block and passes it to `unformat_rss_fn`, which accepts ~27 tokens including `ipv4-tcp`, `ipv4-udp`, `ipv4`, `ipv6-tcp`, `ipv6-udp`, `ipv6`, `ipv4-frag`, `l2-payload`, `vxlan`, `gtpu`, etc. No change needed in Optimization 2.
- **`vppctl set interface mtu 9000 GigabitEthernet0/0/0` IS valid for hardware interfaces.** The first branch of `mtu_cmd`'s `unformat` chain matches `<int> <hw-interface>` without a type keyword; the `packet|ip4|ip6|mpls` keywords are only required for software interfaces. No change needed in Optimization 5.
- The 5-tuple RSS hash claim is accurate for TCP/UDP; for non-TCP/UDP traffic the default DPDK hash falls back to 2-tuple (src/dst IP). The post's framing is fine for the common case.
- Optimization 3's `rxMode` values (`polling`, `interrupt`, `adaptive`) match the documented Calico VPP uplink options. Note that `adaptive` and `interrupt` are not supported by every driver — DPDK's PMD is primarily polling.
- The post does not pin specific Calico VPP / VPP versions, so the field-name and CLI corrections track current `master`. The corrected JSON keys (`rx`, `tx`, `rxqsz`, `txqsz`, `newDriver`) have been stable in the dataplane config for a long time.
