# Validation Summary: How to Use IPv4 Multicast Sockets in C

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- C (POSIX sockets API)
- IPv4 multicast (RFC 1112, RFC 2365, RFC 5771)
- UDP (`SOCK_DGRAM`)
- IGMP (group management)
- Linux/BSD socket options: `IP_MULTICAST_TTL`, `IP_MULTICAST_IF`, `IP_MULTICAST_LOOP`, `IP_ADD_MEMBERSHIP`, `IP_DROP_MEMBERSHIP`, `SO_REUSEADDR`
- `struct ip_mreq`, `struct sockaddr_in`, `inet_pton`/`inet_ntop`

## Sources Consulted
- Linux `ip(7)` man page — https://man7.org/linux/man-pages/man7/ip.7.html
- POSIX.1-2017 socket interface
- RFC 1112 (Host Extensions for IP Multicasting)
- RFC 2365 (Administratively Scoped IP Multicast)
- RFC 5771 (IANA Guidelines for IPv4 Multicast Address Assignments)
- IANA IPv4 Multicast Address Space Registry
- W. R. Stevens, *UNIX Network Programming* (multicast chapter)

## Issues Found
- **Address scope terminology (table):** The original table labeled `239.0.0.0/8` as "Site-local (administratively scoped)" and `224.0.1.0 – 238.255.255.255` as "Globally routable." Per RFC 2365 the `239/8` block is formally the **Administratively Scoped** space (with sub-ranges for organization-local and IPv4-local scopes); per RFC 5771 the standard term for the inter-network range is **Globally scoped**. Changed the table labels to "Administratively scoped (RFC 2365)" and "Globally scoped" for correctness without restructuring the section.

All code (sender, receiver, multi-group join) was verified against the Linux ip(7) man page and POSIX socket API and is syntactically and semantically correct.

## Review Notes
- `IP_MULTICAST_TTL` and `IP_MULTICAST_LOOP` are documented in Linux `ip(7)` as taking an "integer" argument, but the kernel accepts both 1-byte (`unsigned char`) and 4-byte (`int`) `optlen` values for backward compatibility with BSD. The post's use of `unsigned char` is portable across Linux and BSD and is the traditional Stevens-style choice — kept as-is.
- `IP_MULTICAST_LOOP` semantics differ slightly between BSD (applied at the sender) and Linux (applied at the receiver). Not material to the example but worth knowing if a reader extends it.
- `struct ip_mreq` is the classic, portable form. Linux 2.2+ also supports `struct ip_mreqn` (which lets you select an interface by index instead of address). Both are valid; the post sticks to the more portable `ip_mreq`.
- `IP_MAX_MEMBERSHIPS` is documented as "usually 20" — that matches the historical default and the runtime sysctl `/proc/sys/net/ipv4/igmp_max_memberships`. Some distributions raise it; the wording is fine.
- `SO_REUSEADDR` is sufficient for multiple receivers on the same multicast (group, port) on Linux and BSD. For unicast port sharing, Linux 3.9+ requires `SO_REUSEPORT` — not relevant to this post but a common follow-up question.
- `IP_DROP_MEMBERSHIP` only triggers an IGMPv2+ Leave when the host is the last member of the group on that interface; this is a kernel/IGMP detail and matches the post's claim.
- Receivers binding to `INADDR_ANY` is the most portable approach. On Linux/BSD, binding directly to the multicast group address also works and acts as a destination filter, but is not portable to all stacks (notably older Windows). The current approach is the right default for a POSIX tutorial.
