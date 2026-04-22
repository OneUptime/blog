# Validation Summary: How to Send a Broadcast Packet on Linux with socat or netcat

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux IPv4 UDP broadcast
- `SO_BROADCAST` socket option
- `socat`
- `netcat` / `nc`
- Nmap `ncat`
- Bash `/dev/udp` redirection
- Python `socket` module
- `tcpdump`
- Wake-on-LAN magic packets

## Sources Consulted
- Linux `socket(7)` manual page: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Debian `socat(1)` manual page: https://manpages.debian.org/trixie/socat/socat.1.en.html
- Nmap/Debian `ncat(1)` manual page: https://manpages.debian.org/testing/ncat/ncat.1.en.html
- Debian `netcat-openbsd` `nc_openbsd(1)` manual page: https://manpages.debian.org/bookworm/netcat-openbsd/nc_openbsd.1.en.html
- GNU Bash Reference Manual, redirections: https://www.gnu.org/software/bash/manual/bash.html#Redirections
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- RFC 919, Broadcasting Internet Datagrams: https://www.rfc-editor.org/rfc/rfc919.html
- RFC 2644, Changing the Default for Directed Broadcasts in Routers: https://www.rfc-editor.org/rfc/rfc2644.html
- AMD Magic Packet Technology white paper: https://www.amd.com/content/dam/amd/en/documents/archived-tech-docs/white-papers/20213.pdf
- Local command help: `nc -h` and `tcpdump --help`

## Issues Found
- The post claimed both `socat` and `netcat` generally support broadcast. Changed this to "some `netcat` variants" because support differs by implementation.
- The post recommended `ncat -u --broadcast`, but Nmap `ncat` does not document a `--broadcast` option. Replaced it with Debian/Ubuntu OpenBSD-style `nc -u -b`, whose `-b` option is documented as allowing broadcast.
- The post presented Bash `/dev/udp` as a workaround for broadcast. Replaced that with a warning that Bash can open UDP sockets but does not expose `SO_BROADCAST`, so it is not a reliable Linux broadcast workaround.
- The Python section referred specifically to `ncat` availability. Updated it to refer to any `netcat` variant with broadcast support.
- The receiver explanation said sockets bound to `0.0.0.0` "will receive" broadcasts. Changed this to "can receive" and noted the host firewall caveat.
- The Wake-on-LAN section said magic packets are broadcast UDP packets sent to port 9. Changed this to "often sent" because Magic Packet technology is protocol-independent and UDP port 9 is common rather than exclusive.
- The Wake-on-LAN code comment said it used `socat`, but the example uses Python. Corrected the comment.

## Review Notes
- The `tcpdump -i eth0` command is syntactically valid, but `eth0` is only an example interface name; users may need to substitute the actual interface name on modern Linux systems.
- Broadcast delivery can also be affected by local firewall rules, interface selection, VLANs, Wi-Fi/AP behavior, and router policy for directed broadcasts.
