# Validation Summary: How to Set Up a VPN Gateway for IPv4 Traffic on a Cloud VM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard VPN
- Linux (Ubuntu 20.04+)
- iptables (NAT / MASQUERADE)
- sysctl / IP forwarding (`net.ipv4.ip_forward`)
- systemd (`wg-quick@wg0`)
- AWS EC2 security group CLI (`aws ec2 authorize-security-group-ingress`)

## Sources Consulted
- Official WireGuard site and whitepaper (https://www.wireguard.com/, https://www.wireguard.com/papers/wireguard.pdf)
- WireGuard cryptography page (https://www.wireguard.com/protocol/)
- Linux kernel changelog for 5.6 (confirming WireGuard merge, March 2020)
- `wg(8)` and `wg-quick(8)` manpages (AllowedIPs, PersistentKeepalive, addconf semantics)
- Ubuntu package archive for `wireguard` on 20.04+
- AWS CLI reference for `ec2 authorize-security-group-ingress`
- iptables manpage (FORWARD / POSTROUTING / MASQUERADE)

## Issues Found
- **"Stateless - easy to audit and reason about"**: WireGuard is not stateless — it maintains cryptographic session state (handshake timers, session keys, peer state, cryptokey routing table). The accurate selling point highlighted in WireGuard's own documentation is its small, auditable codebase (~4,000 lines vs. hundreds of thousands for OpenVPN/IPsec). Changed to "Small codebase (~4,000 lines) - easy to audit and reason about" to preserve the author's point about auditability while removing the incorrect claim.

## Review Notes
- Linux 5.6 kernel-native claim is correct (merged Jan 28, 2020; released March 29, 2020).
- Listed primitives (Curve25519, ChaCha20, BLAKE2) are slightly imprecise — WireGuard specifically uses ChaCha20Poly1305 (AEAD) and BLAKE2s, plus SipHash24 and HKDF. This is shorthand common in introductory material and was left as written.
- Default UDP port 51820, `PersistentKeepalive = 25`, and the `wg-quick@wg0` systemd unit syntax are all correct.
- The `iptables ... MASQUERADE` PostUp/PostDown rules are correct, but assume the primary outbound interface is `eth0`. On some modern cloud images the interface may be named differently (e.g., `ens5` on AWS Nitro, `enp0s3`, or via predictable network interface names). Readers should verify with `ip route get 1.1.1.1` before deploying. Not corrected in the post since `eth0` is a reasonable default and the comment context makes the substitution obvious.
- Step 4 has a minor workflow wrinkle: it both appends a peer via `tee -a` to `wg0.conf` and calls `wg addconf wg0 /dev/stdin` against the live interface. If the reader already included a `[Peer]` block in Step 2, this would create a duplicate peer; and `wg addconf` will fail if the interface isn't up yet (it is started in Step 6). This is a presentation/ordering issue rather than a technical error in the commands themselves, and was left as-is per the "fix technical errors only" directive.
- The `DNS = 8.8.8.8` example in the client config requires `resolvconf` (or systemd-resolved equivalents) to be installed on the client for `wg-quick` to honor it; not all readers will have this. A minor caveat, not an error.
