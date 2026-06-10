# Validation Summary: How to Implement VXLAN Overlay Networks

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN)
- Linux iproute2 (`ip link`, `bridge`)
- Linux network namespaces and veth pairs
- Linux bridge (`vlan_filtering`, `stp_state`)
- Multicast routing (PIM via `pimd`)
- EVPN with BGP control plane
- FRRouting (FRR) - BGP and EVPN configuration
- MLAG / 802.3ad LACP bonding
- ethtool VXLAN hardware offload (`tx-udp_tnl-segmentation`, `tx-udp_tnl-csum-segmentation`)
- Path MTU Discovery and jumbo frames
- tcpdump / tshark / `ss` for diagnostics
- Docker Swarm overlay networking
- Kubernetes Flannel CNI with VXLAN backend
- strongSwan IPsec
- iptables firewall rules
- Prometheus node_exporter textfile collector
- Linux sysctl tunables (`net.core.rmem_max`, `net.ipv4.neigh.default.gc_thresh*`, etc.)

## Sources Consulted
- RFC 7348 - Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348 (header layout, UDP port 4789, 24-bit VNI)
- IANA Service Name and Transport Protocol Port Number Registry (UDP 4789 = vxlan)
- Linux kernel `ip-link(8)` manpage - VXLAN type options (`id`, `local`, `remote`, `group`, `dstport`, `learning`, `nolearning`, `udp6zerocsumrx`, `udp6zerocsumtx`)
- FRRouting documentation - BGP EVPN configuration (https://docs.frrouting.org/en/latest/bgp.html#evpn)
- Linux bridge documentation - `bridge(8)`, `bridge-fdb(8)`
- Flannel project documentation - VXLAN backend options (https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- Docker overlay network driver documentation
- ethtool documentation - VXLAN/UDP tunnel offload features
- strongSwan documentation - `ipsec.conf` transport-mode tunnel for UDP services

## Issues Found

1. **FRRouting EVPN VNI configuration scope (incorrect):** The `vni 100` configuration block (with `rd`, `route-target import`, `route-target export`) was placed at the global configuration scope, terminated by `exit`. In FRR, per-VNI EVPN configuration must reside inside `router bgp ASN` → `address-family l2vpn evpn`, and the block terminates with `exit-vni`. I moved the `vni` block inside `address-family l2vpn evpn` and changed `exit` to `exit-vni`.

2. **iptables LOG/DROP rule ordering bug:** In the VXLAN access-control example, the `DROP` rule for `udp dport 4789` was appended before the `LOG` rule. Because `DROP` is a terminating target, the subsequent `LOG` rule could never match, so unauthorized attempts were never logged. I reordered the rules so the `LOG` rule precedes the final `DROP`, and added a clarifying inline comment noting that LOG is non-terminating.

3. **Misleading sysctl comment:** The block setting `net.bridge.bridge-nf-call-iptables = 0` was labeled "Increase FDB table size", which is incorrect. That sysctl disables netfilter (iptables) hook processing for frames traversing a Linux bridge - it has nothing to do with FDB sizing. I rewrote the comment to accurately describe what the setting does.

## Review Notes

- Core VXLAN technical claims (RFC 7348-aligned 8-byte header, 50-byte total encapsulation overhead, UDP port 4789, 24-bit VNI yielding ~16M networks, I-flag semantics) are correct.
- MTU arithmetic is consistent: underlay - 50 = VXLAN MTU (9000 → 8950, 1500 → 1450). Correct because Linux MTU is the L3 payload size and the encapsulation adds 20 (outer IP) + 8 (UDP) + 8 (VXLAN) + 14 (inner Ethernet that becomes payload) = 50 bytes.
- The example output for `ip -d link show vxlan100` shows `dev eth0` even though the create command did not specify `dev`. In practice the kernel may auto-resolve the egress device from the source IP, but the line is illustrative rather than exact; left as-is since it is reasonable.
- `neighbor 192.168.1.1 update-source lo` uses the loopback interface name, which is valid FRR syntax; typical production deployments use a per-VTEP loopback IP. Left as-is.
- Flannel's `kube-flannel.yml` URL points to `master` branch; recent releases recommend pinning to a release tag, but the URL still resolves. Not a hard error.
- The `ethtool -K eth0 rx-udp_tunnel-port-offload on` feature toggle exists in modern kernels/drivers (NICs supporting UDP tunnel port offload), but availability is hardware/driver dependent. The "Check if NIC supports VXLAN offload" line above appropriately gates this. Left as-is.
- The blog appropriately advises EVPN over multicast for production, jumbo frames to avoid fragmentation, and IPsec/MACsec for sensitive traffic, all of which match current best practice.
