# Validation Summary: How to Configure IPv6 with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- systemd-networkd (network configuration daemon)
- IPv6 (SLAAC, DHCPv6, static addressing, privacy extensions, forwarding)
- systemd .network configuration files
- networkctl CLI
- resolvectl CLI
- iproute2 (`ip -6` commands)
- journalctl

## Sources Consulted
- systemd.network(5) man page (local, systemd 255) — verified `[IPv6AcceptRA] Token=` valid values, `IPv6PrivacyExtensions=` valid values, `[DHCPv6] UseAddress=`, `[Route]` syntax
- systemd.network(5) man page on Debian unstable (https://manpages.debian.org/unstable/systemd/systemd.network.5.en.html) — verified `IPv6Forwarding=` (added in systemd 256) replaces deprecated `IPForward=`
- RFC 4941 (Privacy Extensions for Stateless Address Autoconfiguration in IPv6)
- RFC 7217 (referenced for `prefixstable` token mode)

## Issues Found

1. **Invalid IPv6 address in static route example.** The `[Route]` section under "Adding Static IPv6 Routes" used `Gateway=2001:db8::gateway`, but `gateway` is not a valid hex sequence so this is not parseable as an IPv6 address. Changed to `Gateway=2001:db8::1`.

2. **Invalid `Token=` value in privacy extensions example.** The `[IPv6AcceptRA]` section used `Token=random`, but per systemd.network(5) the only valid values for `Token=` in `[IPv6AcceptRA]` are `eui64`, `static:ADDRESS`, and `prefixstable[:ADDRESS][,UUID]`. The accompanying comment ("Token = random | static | <specific-suffix>") was also inaccurate. The `Token=` directive is unrelated to privacy/temporary addresses (which are controlled solely by `IPv6PrivacyExtensions=`), so the entire `[IPv6AcceptRA]` block was removed from the privacy extensions example.

3. **Duplicate `[Network]` sections in privacy extensions example.** The same example previously had two `[Network]` sections in the same file separated by `[IPv6AcceptRA]`. While systemd does merge duplicate sections, this is unidiomatic. After removing the misplaced `[IPv6AcceptRA]` block in fix #2, the two `[Network]` sections were consolidated into one.

## Review Notes

- `IPv6Forwarding=` in `[Network]` was added in systemd 256 and replaces the now-deprecated `IPForward=ipv6`. The post is correct for systemd 256+; users on older systemd (e.g., 255 or earlier) would need to use `IPForward=ipv6` or `IPForward=yes` instead. Worth noting if a future revision wants to call out version compatibility.
- `[DHCPv6] UseAddress=` was added in systemd 248 — broadly available on modern distributions.
- `[IPv6AcceptRA] Token=` was added in systemd 250.
- Multiple `[Network]` sections in a single .network file are technically permitted by systemd (which merges them), but consolidating is better practice for readability.
- All commands (`networkctl`, `resolvectl`, `ip -6`, `journalctl -u systemd-networkd`, `networkctl --json=short`, `networkctl reload`, `networkctl reconfigure`) verified as current and correct.
