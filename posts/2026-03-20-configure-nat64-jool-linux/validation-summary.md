# Validation Summary: How to Configure NAT64 with Jool on Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Jool (NAT64 / SIIT kernel module)
- Linux kernel networking
- iptables / ip6tables (mangle table, PREROUTING chain)
- IPv6 / IPv4 transition mechanisms (NAT64)
- DNS64
- sysctl IP forwarding
- Ubuntu/Debian package management (PPA, DKMS)

## Sources Consulted
- Jool official docs — Installation: https://nicmx.github.io/Jool/en/install.html
- Jool official docs — Stateful NAT64 Run: https://nicmx.github.io/Jool/en/run-nat64.html
- Jool official docs — `instance` mode flags: https://nicmx.github.io/Jool/en/usr-flags-instance.html
- Jool official docs — `pool4` mode flags
- Debian manpage for `jool(8)`: https://manpages.debian.org/unstable/jool-tools/jool.8.en.html
- Jool source: https://github.com/NICMx/Jool (CLI command tree in `src/usr/argp/main.c`)
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (defines `64:ff9b::/96`)
- RFC 6146 — Stateful NAT64
- RFC 7915 — IP/ICMP Translation Algorithm (SIIT)

## Issues Found
1. **`jool instance add --iptables` was missing the mandatory `--pool6` argument.**
   In Jool 4.x, `--pool6` is required when creating a NAT64 instance (per the official `instance` flags doc: "This argument is mandatory (and must not be `null`) in NAT64."). The original command would fail at runtime. Fixed by changing it to `jool instance add --iptables --pool6 64:ff9b::/96` and adding a brief inline comment noting that `--pool6` is mandatory.

2. **`jool pool6 add` and `jool pool6 display` are not valid commands in Jool 4.x.**
   Pool6 was a separate database in Jool 3.x but in Jool 4.x it became a global configuration field. The `jool` CLI's command tree has no `pool6` subcommand at all (verified against the Debian manpage and the `tree[]` array in Jool's source). The valid way to inspect/update pool6 after instance creation is via `jool global display` and `jool global update pool6 <prefix>`. Fixed the "Configuring the IPv6 Prefix (Pool6)" section to use the valid `jool global` commands and clarified that pool6 is now a global config field set primarily at instance-creation time.

## Review Notes
- The well-known prefix `64:ff9b::/96` is technically defined in RFC 6052, not RFC 6146. The post does not directly attribute the prefix to RFC 6146, only mentioning RFC 6146 as the stateful NAT64 spec (which is correct), so no change was needed.
- The iptables/ip6tables rules in the post add an extra `-d <prefix>` destination filter that is not shown in the official tutorial. This is a stricter (but still valid) match — Jool will only see packets destined for the configured prefix/pool. It works correctly and is a reasonable hardening choice, so it was left as-is.
- `ping6` is deprecated on modern Linux distributions in favor of `ping -6` (from iputils), but `ping6` is still provided as a compatibility shim almost everywhere, so the example will run on a typical system. Worth a future modernization pass.
- `add-apt-repository` requires the `software-properties-common` package on minimal Ubuntu/Debian images. Not technically incorrect on a typical desktop/server install, but a minimal-container reader might need that prerequisite called out.
- The post does not specify a port range for `jool pool4 add`. The Jool default port range for `add` is `61001-65535`, which is fine for a tutorial demonstrating defaults. A production setup would typically widen it.
- The `jool bib display --tcp` / `jool session display --tcp` commands shown at the end are valid; the protocol filter is one of `--tcp` / `--udp` / `--icmp`.
