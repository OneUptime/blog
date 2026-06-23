# Validation Summary: How to Set Up WireGuard for Secure Cluster-to-Cluster Communication

## Status
validated

## Post Type
Tutorial / Guide (step-by-step setup walkthrough)

## Technologies Covered
- WireGuard (VPN) and `wg` / `wg-quick` tooling
- Linux networking (iptables, nftables, firewalld, `ip route`, sysctl IP forwarding)
- Kubernetes (DaemonSet, Secret, NetworkPolicy, node labels)
- BIRD2 (BGP routing daemon)
- Keepalived (VRRP high availability)
- Netplan (persistent routes)
- Prometheus (`mindflavor/prometheus-wireguard-exporter`)
- Package managers: apt, dnf/EPEL, apk

## Sources Consulted
- WireGuard official site & quickstart — https://www.wireguard.com/quickstart/ and https://www.wireguard.com/
- `wg(8)` / `wg-quick(8)` man pages — https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8 and wg-quick.8
- WireGuard in mainline Linux kernel 5.6 — https://www.wireguard.com/install/
- WireGuard protocol / cryptography (Curve25519, ChaCha20, Poly1305, BLAKE2s) — https://www.wireguard.com/protocol/
- RFC 5737 (IPv4 documentation address blocks 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
- RFC 1918 (private address space 10.0.0.0/8) — basis for the invalid-octet finding
- linuxserver/wireguard image docs — https://docs.linuxserver.io/images/docker-wireguard/ (config path `/config/wg_confs`)
- prometheus-wireguard-exporter — https://github.com/MindFlavor/prometheus_wireguard_exporter (default port 9586)
- BIRD 2 user guide — https://bird.network.cz/?get_doc&v=20&f=bird.html
- nftables wiki (NAT/masquerade, hook priorities) — https://wiki.nftables.org/

## Issues Found
- **Invalid IPv4 addresses for Cluster C (`10.300.x.x` / `10.301.x.x`).** IPv4 octets must be 0–255, so `10.300.0.0/16`, `10.301.0.0/16`, `10.300.0.1`, and `10.300.1.x` are not valid addresses. These would be rejected by `ip route add`, `wg-quick` (AllowedIPs parsing), and the Kubernetes NetworkPolicy `ipBlock` validation — the configs as written would simply fail. Fixed by renumbering Cluster C's networks to valid ranges (`10.30.0.0/16` pod CIDR, `10.31.0.0/16` service CIDR, gateway `10.30.0.1`, nodes `10.30.1.x`), preserving the per-cluster distinctness pattern (A=10.100/10.101, B=10.200/10.201, C=10.30/10.31). Occurrences corrected: architecture diagram node/gateway labels, the network planning table, Cluster A and Cluster B peer `AllowedIPs`, the Step 4 expected `wg show` output, the Step 5 static routes and Netplan block, the Step 7 NetworkPolicy ingress/egress `ipBlock`s, the Complete Configuration peer block, and the `wg-status.sh` routing-table grep regex (`10\.(100|200|300)` → `10\.(100|200|30)`).

## Review Notes
- The technical explanations are accurate: WireGuard merged into the Linux kernel in 5.6, uses Curve25519 / ChaCha20 / Poly1305 (plus BLAKE2s and HKDF internally), and is ~4,000 lines of code — all correct.
- All `wg`/`wg-quick` subcommands and flags used (`genkey`, `pubkey`, `genpsk`, `show`, `showconf`, `show wg0 dump`, `show wg0 latest-handshakes`) are valid.
- Documentation/example public IPs (`203.0.113.10`, `198.51.100.20`, `192.0.2.30`) correctly use RFC 5737 ranges.
- Default MTU 1420, default port 51820, and `PersistentKeepalive = 25` are the conventional/recommended values.
- Minor style notes (not errors, left unchanged to respect author tone): `sudo cat private.key | wg pubkey` is a "useless use of cat"; the canonical one-liner pipes `wg genkey | tee private.key | wg pubkey | tee public.key`. The `MASQUERADE` rules on the gateway will SNAT cross-cluster pod traffic to the gateway IP, which hides original pod source IPs — acceptable for the routed gateway pattern shown but worth noting if end-to-end pod IP visibility is required. In the DaemonSet, `privileged: true` already supersedes the added `NET_ADMIN`/`SYS_MODULE` capabilities (redundant but harmless).
- Routing service CIDRs across clusters only works if those ClusterIP ranges are actually reachable/routed (typically they are not without extra config); the post's pod-CIDR routing is the primary working path. This is a design caveat, not a correctness error.
