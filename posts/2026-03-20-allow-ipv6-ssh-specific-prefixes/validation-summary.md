# Validation Summary: How to Allow IPv6 SSH Access Only from Specific Prefixes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- OpenSSH `sshd`
- `ip6tables`
- `nftables`
- TCP Wrappers
- `knockd`

## Sources Consulted
- OpenSSH `sshd_config(5)`: https://man.openbsd.org/sshd_config
- OpenSSH `sshd(8)` authorized key options: https://man.openbsd.org/sshd
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- Netfilter `iptables`/`ip6tables` manual: https://ipset.netfilter.org/iptables.man.html
- Netfilter `nft` manual: https://netfilter.org/projects/nftables/manpage.html
- `knockd` upstream sample configuration: https://github.com/jvinet/knock/blob/master/knockd.conf
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- TCP Wrappers `hosts_access(5)`: https://man.openbsd.org/OpenBSD-5.3/hosts_access.5

## Issues Found
- Several example IPv6 literals were invalid because they used non-hex hextets such as `mgmt`, `vpn`, `admin`, and `server`. Replaced them with valid ULA and RFC 3849 documentation addresses so the commands and examples are syntactically correct.
- The description and Layer 3 heading referred to an `sshd AllowFrom` configuration that does not exist. Updated the post to use real OpenSSH controls: `AllowUsers` with CIDR host restrictions and `Match Address`.
- The `ip6tables` custom-chain example used `RETURN` in the allowlist chain and then accepted all remaining TCP/22 traffic, which made the “Allow established” comment incorrect and weakened the example. Reworked the chain so the allowlist uses `ACCEPT`, and the caller distinguishes `ESTABLISHED` from `NEW` traffic with conntrack state.
- The TCP Wrappers section was presented as a normal layer for SSH without noting that modern OpenSSH removed `tcpwrappers/libwrap` support. Marked it as legacy-only.
- The port-knocking example used UDP knocks while also setting `tcpflags = syn`, which is inconsistent with the upstream sample. Changed the sequence to the default TCP form so the example is coherent.
- The dynamic update script attempted to delete a rule using `LAST_MGMT_IP` without ever loading that variable. Fixed the script to read the previous address from a state file before deleting the old `/128` rule.
- The verification command used `ip6tables -L ... | grep ':22 '`, which is format-dependent and unreliable. Replaced it with `ip6tables -S INPUT | grep -- '--dport 22'`.
- The summary used `--limit 1/min`, while the documented form is `1/minute`, and overstated ULA routing behavior as “can never appear” on the Internet. Corrected the rate-limit example and aligned the ULA wording with RFC 4193.

## Review Notes
- `ip6tables` remains valid on current Linux systems, but many distributions now implement it as a frontend to the nftables backend.
- The RFC 3849 `2001:db8::/32` prefix is appropriate for documentation examples and should not be used for real routed deployments.
- The TCP Wrappers examples are only relevant for legacy environments; on modern OpenSSH, firewall rules and OpenSSH-native access controls are the practical layers.
