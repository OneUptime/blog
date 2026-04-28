# Validation Summary: How to Configure NAT for VPN Passthrough

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPsec (IKE, ESP, NAT-T)
- L2TP/IPsec
- OpenVPN
- WireGuard
- PPTP (GRE)
- Linux iptables (filter and nat tables)
- Linux netfilter conntrack helpers (`nf_conntrack_pptp`, `nf_nat_pptp`)

## Sources Consulted
- RFC 3947 (Negotiation of NAT-Traversal in the IKE) — https://datatracker.ietf.org/doc/html/rfc3947
- RFC 3948 (UDP Encapsulation of IPsec ESP Packets) — https://datatracker.ietf.org/doc/html/rfc3948
- RFC 4303 (IP Encapsulating Security Payload — ESP, IP protocol 50)
- RFC 7296 (IKEv2, UDP port 500/4500)
- RFC 2661 (L2TP, UDP port 1701)
- RFC 2637 (PPTP, TCP port 1723 + GRE IP protocol 47)
- IANA assigned protocol numbers (ESP=50, AH=51, GRE=47)
- iptables(8) man page and `xt_policy` / `-m policy` match docs
- OpenVPN docs — default UDP port 1194
- WireGuard docs — typical UDP listen port 51820
- Verified `nf_conntrack_pptp` and `nf_nat_pptp` modules ship in mainline Linux kernel via `modinfo`

## Issues Found
- **Duplicate / mislabeled Related Reading link.** The "Related Reading" section had two entries pointing to the same URL (`2026-03-20-nat-ipsec-vpn`): one labeled "How to Configure NAT for IPsec VPN Tunnels" and the other labeled "How to Use NAT with IPsec VPN Tunnels". The actual title of that post is "How to Use NAT with IPsec VPN Tunnels", so the first entry was a duplicate with the wrong title. Removed the duplicate, kept the correctly-titled entry.

## Review Notes
- All protocol/port assignments in the overview table are correct (IKE 500, NAT-T 4500, ESP IP 50, L2TP 1701, OpenVPN 1194, WireGuard 51820, PPTP 1723 + GRE 47).
- iptables `-p esp` is supported because iptables resolves protocol names via `/etc/protocols`; equivalent to `-p 50`.
- The `-m policy --dir in --pol ipsec` match requires the `xt_policy` kernel module (loaded automatically on use); this is the standard way to match post-decryption IPsec traffic in `FORWARD`.
- The conntrack-helper inspection command `lsmod | grep -E 'conntrack|nat' | grep -v nf_nat` is a slightly unusual filter (it hides `nf_nat*` modules); it works but a simpler `lsmod | grep -E 'conntrack|nat'` would show more useful output. Not changed since it is not technically incorrect.
- WireGuard does not have an officially IANA-registered port; 51820 is the conventional/documented default and the post's wording ("default") is acceptable.
- PPTP is widely considered cryptographically broken (MS-CHAPv2/MPPE weaknesses) and is deprecated in many environments. The post documents how to NAT it, which is still legitimate operational content, but readers should prefer modern alternatives. No content change made — this is informational.
- The post does not cover IPv6 NAT (NAT66/NPTv6) or nftables equivalents; could be a future enhancement.
