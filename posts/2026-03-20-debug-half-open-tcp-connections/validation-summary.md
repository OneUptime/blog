# Validation Summary: How to Debug Half-Open TCP Connections

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- TCP (RFC 793)
- Linux networking
- `ss` (iproute2 socket statistics utility)
- `conntrack` (conntrack-tools)
- Linux sysctl TCP keepalive parameters (`net.ipv4.tcp_keepalive_*`)
- Python `socket` module / `SO_KEEPALIVE`

## Sources Consulted
- ss(8) man page (verified locally) — confirms timer output format `timer:(<timer_name>,<expire_time>,<retrans>)`
- iproute2 source (`misc/ss.c`) — confirms `timer:(keepalive,...)` parenthesized format
- conntrack-tools manpage (netfilter.org) — confirms `conntrack -D [table] parameters` syntax where `conntrack` is a valid positional table name
- Linux kernel documentation: `Documentation/networking/ip-sysctl.txt` (tcp_keepalive_time / _intvl / _probes semantics)
- Python docs: `socket` module — `SO_KEEPALIVE`, `BrokenPipeError`, `ConnectionResetError`
- RFC 793 (TCP) and RFC 1122 §4.2.3.6 (TCP Keep-Alives)

## Issues Found
1. **Incorrect grep pattern for ss timer field.** The post used `grep timer:keepalive` and referenced `"timer:keepalive"` in two comments. The actual `ss -o` output format (per ss(8) and the iproute2 source) is `timer:(<timer_name>,<expire_time>,<retrans>)` — i.e. `timer:(keepalive,2min4sec,0)` — with a literal `(` between `timer:` and `keepalive`. As written, the grep would never match. Fixed the grep to `grep "timer:(keepalive"` and updated both comment annotations to reflect the real output format. Also clarified the second comment from "high elapsed time" to "long expire time on idle connections" since the timer field shows time-until-next-event, not connection age.

## Review Notes
- The keepalive math (`30 + 5×10 = 80s`) is correct as a worst-case detection time given the timeline: first probe at `tcp_keepalive_time`, then probes at `tcp_keepalive_intvl` until `tcp_keepalive_probes` total unacked probes.
- `conntrack -D conntrack ...` uses the conntrack table name as a positional argument. This is technically valid (and equivalent to the default), though redundant — left as-is since it is not incorrect.
- The Python snippet at the end of the "Preventing" section is embedded inside a ` ```bash ` fence. It is syntactically valid Python and the intent is clear, but the fence language is mismatched. Left untouched per the brief (no stylistic-only changes), but worth fixing in a future pass.
- `ss -K` (kill sockets) requires `CONFIG_INET_DIAG_DESTROY` and root privileges; works on IPv4/IPv6 TCP sockets. Behavior matches the post's description.
- `import errno` in the application-level detection snippet is unused. Harmless; left unchanged.
- The conclusion's recommendation to set keepalive intervals shorter than NAT/firewall conntrack timeouts is sound and matches RFC 1122 / common operational guidance.
