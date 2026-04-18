# Validation Summary: How to Troubleshoot MTU Issues in Kubernetes Overlay Networks

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes (kubectl, kubectl debug, DaemonSets, ConfigMaps)
- CNI plugins: Flannel, Calico, Weave
- Overlay encapsulations: VXLAN, IPIP, WireGuard
- iptables (mangle table, TCPMSS target)
- tcpdump (BPF filters)
- nstat / /proc/net/snmp

## Sources Consulted
- Flannel documentation and source (backend/vxlan config struct with `MTU` field): https://github.com/flannel-io/flannel
- Calico MTU configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration reference (vxlanMTU, ipipMTU, wireguardMTU fields): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Installation resource reference (calicoNetwork.mtu): https://docs.tigera.io/calico/latest/reference/installation/api
- Weave Net documentation (default MTU 1376 for fastdp/VXLAN)
- WireGuard protocol overhead analysis (20 IPv4 + 8 UDP + 16 header + 16 Poly1305 tag = 60 bytes)
- RFC 7348 (VXLAN) for 50-byte overhead (14 inner-Eth + 8 VXLAN + 8 UDP + 20 outer-IP)
- Kubernetes registry migration notice (k8s.gcr.io → registry.k8s.io, April 2023): https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- BusyBox ping source/applet options (confirming `-M` is not supported)
- iputils ping(8) for `-M do` (prohibit fragmentation)
- iptables-extensions(8) for TCPMSS target and `--clamp-mss-to-pmtu`

## Issues Found
1. **WireGuard MTU overhead was incorrect.** Post listed WireGuard as `1420 (1500 - 80)`. Pure WireGuard-over-IPv4 adds 60 bytes (20 IPv4 + 8 UDP + 16 WG header + 16 Poly1305 tag), giving 1440. The 80-byte figure matches Calico's IPIP + WireGuard combination, not WireGuard alone. Changed to `1440 (1500 - 60)`.
2. **Ping command used `busybox`, which does not support `-M do`.** BusyBox's ping applet only implements `-c/-s/-t/-w/-W/-I/-A/-p/-q`; `-M` is an iputils-only option. The command as written would fail with an unrecognized option on a standard busybox image. Changed the image to `nicolaka/netshoot`, which ships full iputils ping and is the conventional choice for in-cluster network debugging.
3. **Deprecated image registry.** The MSS-clamping DaemonSet referenced `k8s.gcr.io/pause:3.5`. The `k8s.gcr.io` registry was frozen in April 2023 and replaced by `registry.k8s.io`; pause 3.5 is also from the 1.22 era. Updated to `registry.k8s.io/pause:3.9`.

## Review Notes
- Flannel `net-conf.json` snippet places `MTU` inside the `Backend` object. This is valid for the VXLAN backend (the backend config struct accepts `MTU`), though many operators prefer to let Flannel auto-detect MTU. Leaving as-is — the example is technically correct.
- The MSS-clamping DaemonSet uses an `initContainer` to insert the iptables rule and a long-lived `pause` container to keep the pod running. This applies the rule once per pod start; if the host's iptables state is flushed (e.g., by kube-proxy restart, firewalld reload, or another component re-syncing rules) the rule will be lost until the pod is recreated. A production-grade version should use a long-running container that reconciles the rule, but for a troubleshooting/safety-net snippet the current form is acceptable.
- The `tcpdump 'tcp[tcpflags] & tcp-syn != 0'` filter captures all SYNs (including SYN+ACK), not specifically retransmissions. The accompanying comment ("Many SYNs without data = TCP stall due to MTU") is a reasonable heuristic for spotting connection-establishment stalls but is not a direct retransmission detector; true retransmission analysis requires sequence-number inspection (e.g., via Wireshark). Left unchanged as the heuristic is still useful.
- VXLAN UDP port 4789 is the IANA-assigned standard per RFC 7348; some older deployments (including Flannel on some Linux kernels) use 8472 instead. Worth noting for readers whose `tcpdump 'udp port 4789'` filter returns nothing.
- The BPF filter `ip[6:2] & 0x3fff != 0` correctly captures fragmented datagrams (both MF=1 and non-zero fragment offset), matching the comment.
