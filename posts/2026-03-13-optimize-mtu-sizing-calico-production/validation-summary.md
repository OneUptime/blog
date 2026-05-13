# Validation Summary: How to Optimize MTU Sizing for Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes
- VXLAN encapsulation
- IP-in-IP encapsulation
- BGP routing
- iperf3
- Linux networking (ip link, nmcli)
- kubectl

## Sources Consulted
- Calico MTU configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Installation resource reference (operator-based installs)
- RFC 7348 (VXLAN) for encapsulation overhead values
- RFC 2003 (IP Encapsulation within IP) for IPIP overhead

## Issues Found

1. **Incorrect `calicoctl patch felixconfiguration` command.** The post used `--patch '{"spec":{"mtu":9000,"vxlanMTU":8950}}'`, but the FelixConfiguration resource does not have a top-level `mtu` field. Only `ipipMTU`, `vxlanMTU`, and `vxlanMTUV6` are valid MTU fields on FelixConfiguration. Pod (workload) MTU is configured via the `Installation` CR (`spec.calicoNetwork.mtu`) for operator-based installs or via the `calico-config` ConfigMap `veth_mtu` key for manifest-based installs. Replaced with the operator-based `kubectl patch installation default --type=merge -p '{"spec":{"calicoNetwork":{"mtu":9000}}}'` command, which is the modern recommended approach.

2. **Misleading CrossSubnet IPIP MTU description.** The table row read `CrossSubnet IP-in-IP | 1480 within subnet`. This is backwards: in CrossSubnet IPIP mode, encapsulation happens when traffic *crosses* subnets (not within them). The pod MTU is set to 1480 to handle the worst-case (encapsulated) path regardless. Changed the cell to just `1480` to remove the misleading qualifier.

## Review Notes

- Encapsulation overhead figures (VXLAN 50 bytes IPv4, IPIP 20 bytes, native BGP 0 bytes) match the official Calico documentation and the underlying RFCs.
- Resulting pod MTUs for VXLAN (1450), IPIP (1480), and None (1500) on a 1500-byte host are correct.
- The `xychart-beta` throughput numbers are illustrative; actual numbers depend on NIC, CPU, offloads (TSO/GRO), and workload patterns. They are plausible for typical 10 GbE testing and not misleading.
- The `kubectl debug node/... -it --image=busybox -- ip link show eth0` pattern uses `-it` inside a script loop, which can be fragile in non-interactive shells; it is functionally correct but could be improved with `--profile=netadmin` or by dropping `-t`. Left unchanged — not technically wrong.
- The "Calico v3.20+ for automatic MTU detection" claim is accurate; auto-detection was introduced in v3.20.
- For manifest-based Calico installs (without the operator), users should instead patch the `calico-config` ConfigMap (`veth_mtu`) and restart the `calico-node` DaemonSet — the post now only shows the operator path, which is fine for a focused guide.
