# Validation Summary: How to Fix Too Many TCP Connections in TIME_WAIT State

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux networking
- `ss`
- `sysctl`
- Python `requests`

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP) https://www.rfc-editor.org/rfc/rfc9293
- RFC 6191: Reducing the TIME-WAIT State Using TCP Timestamps https://www.rfc-editor.org/rfc/rfc6191.html
- Linux kernel IP sysctl documentation https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Requests advanced usage documentation https://docs.python-requests.org/en/latest/user/advanced/
- Requests developer API for `HTTPAdapter` https://docs.python-requests.org/en/latest/api/
- Local Linux man pages: `man 7 tcp` and `man 7 ip`
- Local CLI help output: `ss --help` and `sysctl --help`

## Issues Found
- The introduction conflated the RFC requirement of `2×MSL` with Linux's typical TIME_WAIT duration. I changed it to distinguish the protocol requirement from Linux's usual `~60s` implementation behavior.
- The `ss` examples counted and parsed the header row, which makes the connection count off by one and pollutes the address parsing. I added `-H` to the relevant commands and corrected the `awk` field numbers to match the headerless output.
- The remote-address parsing used `cut -d: -f1`, which breaks on IPv6 addresses. I replaced it with a regex that strips only the final port suffix.
- The "check if you're running out of local ports" example was not a reliable port-exhaustion test. I changed it to show the ephemeral port range and count distinct local ports currently tied up in TIME_WAIT.
- The `tcp_tw_reuse` section overstated the recommendation. Current kernel documentation says this setting should not be changed without expert advice, and current kernels default it to `2` for loopback-only reuse. I updated the wording and added a command to inspect the current value first.
- The Requests example only mounted a custom adapter for `http://` and left `https://` using the default adapter. I updated the snippet to mount both schemes and to use a context manager for the session.
- The `ip_local_port_range` section presented a specific default as universal. I changed it to show the current range instead of asserting a single default value.
- The `tcp_fin_timeout` section was technically wrong as a TIME_WAIT fix. `tcp_fin_timeout` applies to orphaned `FIN_WAIT_2` handling, not TIME_WAIT duration, so I rewrote the section to say not to use it for this problem.
- The monitoring section used a hard `~50,000` threshold with no kernel or RFC basis. I replaced it with guidance tied to actual ephemeral-port exhaustion and memory pressure.
- The conclusion described `tcp_tw_reuse=1` as a safe blanket mitigation. I changed it to a more accurate, qualified statement and updated the `tcp_tw_recycle` note to reflect why it was removed.

## Review Notes
Linux TCP defaults can vary by kernel version and distribution, so the post should continue to frame sysctl values as version-specific operational tuning rather than universal defaults.
