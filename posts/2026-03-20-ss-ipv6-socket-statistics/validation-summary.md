# Validation Summary: How to Use ss Command for IPv6 Socket Statistics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `ss` command from iproute2
- IPv6 sockets
- TCP and UDP socket monitoring
- Linux `/proc/net/tcp6`
- Bash shell scripting

## Sources Consulted
- `ss(8)` Linux manual page for iproute2 options, state filters, expressions, host syntax, and usage examples: https://www.man7.org/linux/man-pages/man8/ss.8.html
- Local `ss --help` and `man ss` output from iproute2 6.1.0
- `ipv6(7)` Linux manual page for `IPV6_V6ONLY`, IPv4-mapped IPv6 behavior, and `/proc/sys/net/ipv6/bindv6only`: https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- Linux kernel documentation for `/proc/net/tcp` and `/proc/net/tcp6`, including the deprecation note in favor of `tcp_diag`: https://docs.kernel.org/next/networking/proc_net_tcp.html
- Red Hat Enterprise Linux Network Troubleshooting and Performance Tuning documentation for `Recv-Q` and `Send-Q` interpretation on listening TCP sockets: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/network_troubleshooting_and_performance_tuning/network_troubleshooting_and_performance_tuning

## Issues Found
- `ss -u6` was described as showing all IPv6 UDP sockets, but `ss(8)` documents `-a` as required for all sockets and gives `ss -u -a` as the all-UDP example. Changed the command and conclusion reference to `ss -ua6`.
- Several comments described TCP-only commands as if they covered all IPv6 sockets or services. Updated those comments to say TCP where the command uses `-t`, and changed the all-service examples to use `ss -tulnp6`.
- The `src` and `dst` IPv6 filter examples used bare IPv6 literals, which `ss` rejects because inet6 host syntax requires square brackets to disambiguate colons. Changed them to `dst '[2001:db8::1]'` and `src '[2001:db8::100]'`.
- The non-established state example used invalid filter syntax: `ss -tn6 state all '! state established'`. Replaced it with the documented state-filter syntax: `ss -tn6 state all exclude established`.
- The `Recv-Q` / `Send-Q` description said they were bytes waiting in buffers, which is incomplete for LISTEN sockets. Clarified that established sockets show queued receive/send bytes, while LISTEN sockets show current and maximum backlog counts.
- The `/proc/net/tcp6` example was technically correct but referenced a kernel interface documented as deprecated in favor of `tcp_diag`. Added a short caveat to prefer `ss` for normal use.

## Review Notes
Validated the corrected command syntax against local `ss` from iproute2 6.1.0 and ran `bash -n` against the shell script block. Process details from `ss -p` may require elevated privileges depending on the target socket owner and system policy.
