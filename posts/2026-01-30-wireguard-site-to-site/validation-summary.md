# Validation Summary: How to Create WireGuard Site-to-Site VPN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard VPN protocol (wg, wg-quick)
- Curve25519, ChaCha20-Poly1305 (WireGuard cryptography)
- Linux networking (iproute2, sysctl, IP forwarding)
- iptables and nftables (firewall/NAT)
- systemd (wg-quick@.service)
- AWS CLI (EC2 security groups)
- gcloud CLI (GCP firewall rules)
- Ansible (playbook + Jinja2 templating)
- Standard Linux diagnostic tools (ping, nc, tcpdump, traceroute)

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/
- WireGuard quickstart: https://www.wireguard.com/quickstart/
- WireGuard protocol whitepaper: https://www.wireguard.com/papers/wireguard.pdf
- wg(8) and wg-quick(8) man pages
- Linux kernel dynamic debug documentation: https://www.kernel.org/doc/html/latest/admin-guide/dynamic-debug-howto.html
- AWS CLI reference for `authorize-security-group-ingress`
- gcloud CLI reference for `compute firewall-rules create`
- Ansible module documentation for `sysctl`, `systemd`, `template`, `copy`, `shell`

## Issues Found
No technical issues found.

Verified items:
- WireGuard codebase size (~4,000 LOC) — matches the figure cited by the project itself.
- Cryptographic primitives (Curve25519 for key exchange, ChaCha20 for symmetric encryption, implicitly Poly1305 for auth) — accurate.
- 1-RTT handshake claim — correct; WireGuard uses a Noise_IK-based handshake completing in one round trip.
- Default WireGuard MTU of 1420 — correct: wg-quick subtracts 80 bytes (worst-case IPv6+UDP+WireGuard+Poly1305 overhead) from a 1500-byte underlying MTU.
- MTU probe `ping -M do -s 1392` — correct math: 1392 ICMP payload + 8 (ICMP) + 20 (IPv4) = 1420.
- INI config syntax for `[Interface]` and `[Peer]` sections (PrivateKey, Address, ListenPort, PostUp/PostDown, PublicKey, Endpoint, AllowedIPs, PersistentKeepalive) — all valid.
- `wg genkey | tee … | wg pubkey > …` pipeline — produces matched keypair correctly.
- `wg set wg0 peer … endpoint … allowed-ips … persistent-keepalive …` flags — match the wg(8) interface.
- Debug control path `/sys/kernel/debug/dynamic_debug/control` and `module wireguard +p` syntax — correct.
- AWS CLI `aws ec2 authorize-security-group-ingress` flags and gcloud `compute firewall-rules create` flags — both match current CLI references.
- Ansible playbook tasks (package, sysctl, shell with `creates:`, copy, template, systemd) — all use correct module argument names.

## Review Notes
- The "Lines of Code" comparison table uses approximate figures widely cited in WireGuard marketing materials (IPsec ~400K combining kernel + StrongSwan/Libreswan, OpenVPN ~100K). These are order-of-magnitude estimates rather than exact counts, which is appropriate for the context.
- OpenVPN is described as userspace-only. This was historically true; the ovpn-dco kernel data-plane offload is being upstreamed and is increasingly available. The characterization remains broadly accurate for most current deployments but may warrant a footnote in a future revision.
- On RHEL 9+ and modern Rocky/Alma, `wireguard-tools` is available in BaseOS and EPEL is not strictly required; the conservative `epel-release` install does no harm and is still needed for older releases.
- The Ansible `Generate public key` task runs `cat /etc/wireguard/privatekey | wg pubkey` unconditionally on every play. Idempotent in effect but slightly inefficient — could be gated with a `creates:` or `when:` in the future. Not a correctness issue.
- The example public keys in the post are clearly labeled as placeholders. They are the correct length (44 base64 chars) for 32-byte Curve25519 keys but not actually valid keys, which is the expected and safe approach for documentation.
