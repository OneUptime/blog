# Validation Summary: How to Filter Netstat Output by Protocol (TCP, UDP)

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- netstat (net-tools)
- Linux networking
- TCP / UDP protocols
- IPv4 / IPv6
- grep, awk, watch (shell utilities)

## Sources Consulted
- netstat(8) man page (net-tools)
- Local netstat output verification (`netstat -tn`, `netstat -tulnp`)
- RFC 793 (Transmission Control Protocol) for TCP state names
- Linux kernel TCP states (linux/tcp.h: TCP_LISTEN, TCP_ESTABLISHED, TCP_TIME_WAIT, TCP_CLOSE_WAIT, TCP_SYN_SENT, TCP_SYN_RECV, TCP_FIN_WAIT1, TCP_FIN_WAIT2, TCP_CLOSING, TCP_CLOSE, TCP_LAST_ACK)
- sysctl net.ipv4.tcp_tw_reuse documentation (kernel.org Documentation/networking/ip-sysctl.txt)

## Issues Found
- The example output for `sudo netstat -tulnp` in the "Filter by Both TCP and UDP" section was missing the "Foreign Address" column. Real netstat output includes Proto, Recv-Q, Send-Q, Local Address, Foreign Address, State, PID/Program name. Fixed by adding the Foreign Address column with the typical `0.0.0.0:*` value shown for listening sockets.

## Review Notes
- All protocol/flag combinations (`-t`, `-u`, `-tn`, `-tl`, `-tlnp`, `-ta`, `-ulnp`, `-tulnp`, `-4`, `-6`, `-4t`, `-4u`, `-4tlnp`) are correct and produce the documented output.
- The `awk 'NR>2 {print $6}'` command correctly extracts the State column from `netstat -tn` output (which has 2 header lines and State as the 6th column).
- The `grep ':80 \|:443 '` uses BRE alternation correctly with escaped pipe.
- TCP state descriptions match RFC 793 / Linux kernel definitions. The state list omits LAST_ACK and a few less-common states, but is presented as "States you'll see" rather than an exhaustive list, so this is acceptable.
- The post does not mention that netstat is considered obsolete on modern Linux distributions (the netstat man page itself notes "This program is mostly obsolete. Replacement for netstat is ss."). A future revision could mention the equivalent `ss` commands (e.g., `ss -tulnp`).
- The "TCP + all (established + listening)" comment for `netstat -ta` is slightly imprecise — `-a` shows all sockets including TIME_WAIT, CLOSE_WAIT, etc., not only established + listening. This is a minor simplification rather than a hard error.
