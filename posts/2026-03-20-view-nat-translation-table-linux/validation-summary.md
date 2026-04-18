# Validation Summary: How to View the NAT Translation Table on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux netfilter connection tracking (conntrack)
- `conntrack` CLI (conntrack-tools)
- `/proc/net/nf_conntrack` kernel interface
- `iptables` (nat table: PREROUTING, POSTROUTING)
- Python `subprocess` module

## Sources Consulted
- conntrack-tools manpage and `--help` output (netfilter.org): https://conntrack-tools.netfilter.org/manual.html
- Linux kernel source for `/proc/net/nf_conntrack` format (net/netfilter/nf_conntrack_standalone.c)
- iptables manpage and netfilter documentation: https://www.netfilter.org/documentation/
- Debian/Ubuntu `conntrack` package metadata: https://packages.debian.org/conntrack
- Python `subprocess` docs: https://docs.python.org/3/library/subprocess.html

## Issues Found

1. **Incorrect SNAT/DNAT filtering in Method 1.** The post used `conntrack -L | grep SNAT` and `conntrack -L | grep DNAT`. conntrack's default `-L` output does not include the literal strings "SNAT" or "DNAT", so these greps would return no rows. Replaced with the proper filter flags: `conntrack -L --src-nat`, `conntrack -L --dst-nat`, and added `conntrack -L --any-nat` for completeness. These are the documented conntrack-tools options for NAT filtering.

2. **Incorrect claim about `[SNAT]` / `[DNAT]` markers in `/proc/net/nf_conntrack`.** The kernel does not emit `[SNAT]` or `[DNAT]` flags in that file (the flags emitted include `[ASSURED]`, `[UNREPLIED]`, `[OFFLOAD]`, etc.). Rewrote the example to explain that NAT is identified by comparing the original and reply tuples on each line, and pointed readers to `conntrack -L --any-nat` for explicit NAT filtering.

## Review Notes

- The stylized multi-line rendering of a conntrack entry in the "Reading conntrack Output" section is a readability choice; real conntrack output is a single line. Left as-is since it is presented as an illustrative example, not literal output.
- The Python snippet imports `defaultdict` but never uses it. Harmless unused import; did not change to preserve the author's style.
- The Python snippet reads both `result.stdout` and `result.stderr`. conntrack writes table rows to stdout and summary lines like "X flow entries have been shown" to stderr; reading stderr is unnecessary but not wrong because the `'src=' in line` filter excludes stderr noise.
- `conntrack -L` requires root (or `CAP_NET_ADMIN`) to read the connection tracking table. Not called out in the post but typical for sysadmin docs.
- Package naming caveat: on Debian/Ubuntu the package is `conntrack` (correct in the post); on RHEL/Fedora it is `conntrack-tools`. Not changed since the post targets apt-based systems by using `apt install`.
- Default established-TCP conntrack timeout is 432000 seconds (5 days); the example TTL of 86394 is plausible for a connection that has been idle.
