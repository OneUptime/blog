# Validation Summary: How to Configure a Mobile IPv6 Home Agent on Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Mobile IPv6 (MIPv6, RFC 6275)
- UMIP (USAGI-patched Mobile IPv6) `mip6d` daemon
- Linux IPv6 networking and sysctl
- Linux IPsec via `ip xfrm` (XFRM framework)
- ESP / transport-mode IPsec (RFC 3776 — Using IPsec to Protect Mobile IPv6 Signaling)
- radvd (Router Advertisement Daemon — referenced for HA flag advertisement)
- systemd unit management

## Sources Consulted
- mip6d.conf(5) man page — https://www.systutorials.com/docs/linux/man/5-mip6d.conf/
- mip6d(1) man page — https://www.unix.com/man_page/centos/1/mip6d/
- UMIP project documentation — http://umip.linux-ipv6.org/
- RFC 6275 — Mobility Support in IPv6
- RFC 3776 — Using IPsec to Protect Mobile IPv6 Signaling Between Mobile Nodes and Home Agents
- iproute2 `ip-xfrm(8)` documentation for XFRM state/policy syntax
- IANA Protocol Numbers (135 = IPv6 Mobility Header)

## Issues Found

1. **Invalid IPv6 addresses throughout the post.** All examples used `2001:db8:home::1`, `2001:db8:home::100`, and `2001:db8:foreign::50`. The substrings `home` and `foreign` are not valid hexadecimal — IPv6 hextets only allow `0-9` and `a-f`. These addresses would be rejected by every tool in the post (mip6d parser, `ip xfrm`, `ping6`). Replaced with valid documentation-prefix addresses: HA = `2001:db8:1::1`, MN HoA = `2001:db8:1::1234`, MN CoA = `2001:db8:2::50`.

2. **`HaRestartAfterReboot enabled;` is not a real UMIP option.** No such directive exists in `mip6d.conf(5)`. Removed it. Daemon restart-on-boot is a systemd concern, not a UMIP config concern.

3. **`Interface "eth0" { ... }` block contained an invalid option.** With the bogus `HaRestartAfterReboot` removed, the block was empty. Replaced with the canonical `Interface "eth0";` statement form shown in the man page example.

4. **Top-level `HomeAgentAddress`, `HomeAgentPreference`, and `HomeAgentLifetime` are not valid mip6d.conf options.** Per the man page, `HomeAgentAddress` only appears inside an `IPsecPolicySet { ... }` block. `HomeAgentPreference` and `HomeAgentLifetime` are not mip6d options at all — they are configured in `radvd.conf` (the values are advertised in Router Advertisements with the HA flag, per RFC 6275 §8.4). Removed the top-level lines and added a clarifying note pointing readers to radvd.

5. **`IPsecPolicy { ... }` block syntax is incorrect.** The actual UMIP grammar is single-statement form: `IPsecPolicy <type> UseESP <reqid_in> <reqid_out>;` where `<type>` is one of `Mh`, `ICMP`, `MobPfxDisc`, `TunnelMh`, `TunnelPayload`, etc. The post used a fabricated block form with `MnAddress`, `Direction`, `IPsecType`, `ReqID` keys that do not exist. Replaced with the documented one-line form covering Mh, ICMP, MobPfxDisc, TunnelMh, and TunnelPayload (the standard set required for full MN↔HA protection per RFC 3776).

6. **Added `HaServedPrefix`, `HaAcceptMobRtr`, `SendMobPfxAdvs`, `DefaultBindingAclPolicy`, and `BindingAclPolicy`** — these are the actual valid HA-specific top-level options that the original post was trying (incorrectly) to express via the bogus directives. The new config matches the structure of the official mip6d.conf(5) example.

7. **`mip6d -n` does not exist.** UMIP's `mip6d` binary accepts only `-c`, `-d`, `-V`, `-h`, `-C`, `-H`, `-M` (and a few build-conditional flags). There is no `-n` option, and the "Home Agent Binding Cache" output format shown was fabricated. Replaced with the actual UMIP introspection mechanism: the `--enable-vt` virtual-terminal interface accessed via telnet on port 7777 with the `bc` command, plus `SIGUSR1` to dump state to syslog. Updated the watch/monitoring commands accordingly. Added `--enable-vt` to the source build's `./configure` line so the VT path actually works.

8. **`ip xfrm` algorithm name escaping.** The post used `auth hmac\(sha256\)` and `enc aes`. While the backslash escape works in bash, the canonical iproute2 form is single-quoted: `auth 'hmac(sha256)'`. Also corrected `enc aes` to `enc 'cbc(aes)'` since the modern `ip xfrm` prefers the kernel CryptoAPI mode-qualified name. The protocol selector in the policy was changed from the numeric `proto 135` to the named `proto mh`, which is what `ip-xfrm(8)` documents for the Mobility Header — both work but `mh` is the supported keyword.

9. **`ip tunnel show | grep mip` was misleading.** UMIP creates `ip6tnl*` interfaces (IPv6-in-IPv6 tunnels), not interfaces named `mip*`. Replaced with `ip -6 tunnel show` so the user actually sees the tunnels.

## Review Notes

- **UMIP is unmaintained.** The original USAGI/UMIP project (umip.linux-ipv6.org) has not seen upstream activity in many years. The post links to `github.com/openairinterface/umip`, which is OAI's research fork — fine for lab use but readers should be aware this stack is not production-grade and may not build cleanly against modern kernels. Worth flagging in a future revision.
- **`apt-get install umip`** is unlikely to succeed on current Ubuntu/Debian — the `umip` package was dropped from Debian after `wheezy` and from Ubuntu after `xenial`. The "or build from source" path is realistically the only option today; the post would benefit from saying so explicitly.
- **systemd unit assumption.** `sudo systemctl enable mip6d` only works if the user installed via a package or wrote their own unit file — `make install` does not install one. A small caveat or example unit file would help readers who follow the source-build path.
- **Kernel feature `CONFIG_IPV6_MIP6` and `CONFIG_INET6_XFRM_MODE_TUNNEL`** must be present in the kernel for MIPv6 to function. Stock distro kernels generally have these, but a one-line check (`grep -E 'MIP6|XFRM' /boot/config-$(uname -r)`) would be a useful addition.
- **`accept_ra = 2`** is correctly set to 2 (accept RAs even when forwarding is enabled), which is required because the HA forwards traffic but may still need RAs to learn the default router.
- **IPv6 Mobility Header protocol number is 135** — verified against IANA Protocol Numbers; the post's claim is accurate.
