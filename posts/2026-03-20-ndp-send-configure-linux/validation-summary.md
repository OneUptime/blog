# Validation Summary: How to Configure SEND on Linux

## Status
validated

## Post Type
Tutorial / Guide (Linux network security configuration)

## Technologies Covered
- SEND (Secure Neighbor Discovery, RFC 3971)
- CGA (Cryptographically Generated Addresses, RFC 3972)
- NDP (Neighbor Discovery Protocol, RFC 4861)
- IPv6 / Linux kernel IPv6 stack
- ip6tables (netfilter ICMPv6 filtering, MAC match, limit module)
- Optimistic DAD (RFC 4429, `use_optimistic` sysctl)
- ndisc6 toolkit
- OpenSSL (RSA key generation for CGA)
- RA Guard (RFC 6105)

## Sources Consulted
- Linux kernel IPv6 Kconfig: https://raw.githubusercontent.com/torvalds/linux/master/net/ipv6/Kconfig
- Kernel ip-sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- iptables-extensions(8): https://ipset.netfilter.org/iptables-extensions.man.html
- RFC 3971 (SEND), RFC 3972 (CGA), RFC 4429 (Optimistic DAD), RFC 6105 (RA Guard)
- Wikipedia: Secure Neighbor Discovery (SEND implementation list)
- DoCoMo USL SEND project history (mobisend.org / docomolabs-usa.com archives)

## Issues Found

1. **Fabricated kernel CONFIG option (`CONFIG_IPV6_SIOCSIFADDR`)** — The post claimed this was a kernel build-time option "required for SEND user-space interaction." `SIOCSIFADDR` is an ioctl name, not a Kconfig symbol; no such option exists in `net/ipv6/Kconfig`. Fixed by replacing the misleading comment with an accurate explanation that mainline Linux has no in-tree SEND, and SEND/CGA is handled by user-space daemons via raw sockets or NFQUEUE. Kept `CONFIG_IPV6_OPTIMISTIC_DAD` since it is a real option, but corrected the framing — it is unrelated to SEND.

2. **"OpenSEND" is not a recognized project** — The known SEND user-space implementations are USL SEND (DoCoMo Labs USA), Easy-SEND, ipv6-send-cga, WinSEND, and Cisco IOS SEND. There is no canonical "OpenSEND" project. Replaced with the real implementations (Easy-SEND, ipv6-send-cga) and clarified that USL `sendd` is the DoCoMo Labs USA reference (now discontinued).

3. **Misleading claim that Optimistic DAD is related to SEND** — The comment "Optimistic DAD is related to SEND functionality" conflates RFC 4429 (Optimistic DAD, a source-address-selection optimization) with RFC 3971 (SEND, cryptographic NDP authentication). They are independent. Replaced the comment to clarify `use_optimistic` is RFC 4429–specific and shown only because some lab setups exercise both.

## Review Notes

- The `ip6tables` ICMPv6 filtering examples (`--icmpv6-type router-advertisement`, `-m mac --mac-source`, `-m limit --limit 100/sec --limit-burst 200`) are syntactically valid per iptables-extensions(8).
- The OpenSSL commands (`openssl genrsa`/`openssl rsa -pubout`) are correct for generating an RSA keypair, though the post correctly notes that actual CGA address generation requires a SEND tool, not just the keys.
- `sudo modprobe ipv6` is largely a no-op on modern distributions since IPv6 is built-in, but harmless.
- The overall framing — that SEND on Linux is not practically deployable and RA Guard / ip6tables filtering is the realistic alternative — is accurate and reflects the current state of mainline Linux.
- The post's `git clone https://github.com/...` placeholder is appropriately marked as needing the reader to find current repos, since SEND projects are scattered and many archived.
