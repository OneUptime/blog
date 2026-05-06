# Validation Summary: How to Configure Broadcast Addresses in Linux Network Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv4 broadcast addressing
- `iproute2` / `ip addr`
- Debian/Ubuntu `ifupdown`
- Netplan
- Python `socket`

## Sources Consulted
- `ip-address(8)` man page, Debian manpages: https://manpages.debian.org/trixie/iproute2/ip-address.8.en.html
- `ip(7)` Linux man page: https://www.man7.org/linux/man-pages/man7/ip.7.html
- `interfaces(5)` man page, Debian manpages: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- `systemd.network(5)` Linux man page: https://www.man7.org/linux/man-pages/man5/systemd.network.5.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Local `ip addr help` output from the installed `ip` CLI

## Issues Found
- The introduction and default-broadcast explanation attributed broadcast derivation directly to “the kernel” without qualifying that this applies to broadcast-capable IPv4 subnets and that tooling/backends derive or set the usual directed broadcast from the prefix. I corrected the wording to be precise.
- The “Assigning a Custom Broadcast Address” examples did not actually demonstrate non-default broadcasts. One example explicitly set the normal `/8` broadcast, and another comment incorrectly referred to `broadcast +` while using a literal address. I replaced both with actual non-default broadcast examples.
- The explanation of `broadcast -` was too loose. The `ip-address(8)` documentation defines `+` and `-` as deriving the broadcast by setting or resetting host bits. I updated the text to match that behavior and noted that `-` is a legacy, rarely used case.
- The troubleshooting Python example sent traffic to `255.255.255.255`, which tests limited broadcast, not the interface’s configured directed broadcast address. I changed the example to send to a specific interface broadcast address placeholder so it validates the right behavior.
- The Netplan section implied Netplan itself computes broadcast values. I corrected this to say Netplan does not expose a broadcast field in its YAML schema and that the underlying backend derives the broadcast from the configured address and prefix.

## Review Notes
- The legacy `/etc/network/interfaces` example is still valid for an `ifupdown`-managed system, but current Debian documentation marks the `netmask` and `broadcast` options in that form as deprecated. Keeping it in a clearly labeled legacy section is appropriate.
- Linux `ip(7)` documents that the highest-numbered address on a broadcast-capable subnet is the directed broadcast address, and also notes that the historical lowest-numbered-address broadcast behavior is obsolete. That is why `broadcast -` should be treated as a special legacy case.
