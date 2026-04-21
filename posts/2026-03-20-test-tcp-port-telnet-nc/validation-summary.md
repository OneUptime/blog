# Validation Summary: How to Test TCP Port Connectivity with telnet and nc

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- telnet
- netcat / nc
- TCP
- UDP
- Bash scripting
- HTTP
- SMTP
- Redis

## Sources Consulted
- GNU Inetutils telnet manual: https://www.gnu.org/software/inetutils/manual/html_node/telnet-invocation.html
- Debian netcat-openbsd manual: https://manpages.debian.org/bullseye/netcat-openbsd/nc_openbsd.1.en.html
- OpenBSD nc manual: https://man.openbsd.org/nc.1
- RFC 9293, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc9293
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 1945, HTTP/1.0: https://datatracker.ietf.org/doc/html/rfc1945
- RFC 5321, Simple Mail Transfer Protocol: https://datatracker.ietf.org/doc/html/rfc5321
- Redis protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Local command documentation: `nc -h`, `man nc`, `telnet --help`, `man telnet`

## Issues Found
- Corrected overly absolute timeout wording for `nc -w`. The netcat-openbsd manual states that `-w` sets a timeout for connects and idle reads and that the default is no `nc` timeout, so the post now says "default is no nc timeout" instead of "default waits forever."
- Replaced `echo -e` with `printf` for the manual HTTP request so the command emits exact CRLF line endings as required by HTTP/1.0 and as shown in the netcat manual.
- Replaced `echo "PING"` with `printf "PING\r\n"` for the Redis example so the command uses the protocol terminator documented by Redis.
- Clarified UDP testing with `nc -uzv`. The netcat-openbsd manuals warn that UDP port scans using `-uz` can report success regardless of target state, so the post now says success does not confirm receipt unless a response or packet capture is observed.
- Clarified "Connection refused" and timeout diagnosis. TCP RST behavior supports "connection refused," but a refusal can also come from an active reject, while a timeout can indicate a firewall drop, host down, packet loss, or routing issue. The post now avoids presenting those as certain single-cause diagnoses.

## Review Notes
The commands are generally accurate for OpenBSD netcat as packaged on common Linux distributions, but `nc` has multiple implementations with slightly different flags and output text. Future revisions could mention this variant caveat if the post is expanded.
