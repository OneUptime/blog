# Validation Summary: How to Troubleshoot DNS Resolution Failures on Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux DNS resolution
- `/etc/resolv.conf`
- `systemd-resolved` and `resolvectl`
- BIND `dig`
- Netcat (`nc`)
- iptables
- Name Service Switch (`/etc/nsswitch.conf`)
- DNSSEC

## Sources Consulted
- Linux `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Linux `nsswitch.conf(5)` manual: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- systemd-resolved manual: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- systemd `resolvectl(1)` manual: https://www.freedesktop.org/software/systemd/man/249/resolvectl.html
- systemd `resolved.conf(5)` manual: https://www.freedesktop.org/software/systemd/man/249/resolved.conf.html
- ISC BIND 9 `dig` manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1
- Linux `iptables(8)` manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- RFC 4035, Protocol Modifications for DNSSEC: https://datatracker.ietf.org/doc/html/rfc4035

## Issues Found
- The UDP reachability example used `nc -zu` and interpreted the exit status as "UDP 53 open" or "blocked". OpenBSD `nc(1)` documents that UDP scans with `-uz` can always report success regardless of target state, so this was replaced with an actual DNS query using `dig +timeout=2 +tries=1`.
- The `dig` timeout example used the abbreviated `+time=2` option. BIND accepts unambiguous abbreviations, but the documented option is `+timeout=2`, so the snippet now uses the full documented form.
- The NSS section said DNS would not be used whenever `dns` was missing. On systems using `systemd-resolved`, the `resolve` NSS module can provide DNS-backed host lookups, so the wording now checks for `dns` or a resolver module like `resolve`.
- The DNSSEC validation example used `google.com` and grepped for uppercase `AD`. In local verification, `google.com` did not return signed-answer DNSSEC output suitable for the example, and `dig` prints response flags in lowercase. The example now uses `cloudflare.com`, inspects the flags line, and explains that `ad` indicates authenticated data while `RRSIG` only shows DNSSEC records were returned.
- The `systemd-resolved` DNSSEC configuration snippet omitted the required `[Resolve]` section context. The snippet now shows `DNSSEC=no` under `[Resolve]`.

## Review Notes
- Commands that write `/etc/resolv.conf`, edit `/etc/nsswitch.conf`, or restart `systemd-resolved` require administrative privileges and may be overwritten by NetworkManager, resolvconf, or distribution-specific network tooling.
- The iptables check is correct for iptables-managed rules, but systems using nftables or firewalld may need additional firewall inspection commands.
