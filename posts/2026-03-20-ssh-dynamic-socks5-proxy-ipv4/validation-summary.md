# Validation Summary: How to Set Up SSH Dynamic Port Forwarding as a SOCKS5 Proxy (-D)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client dynamic port forwarding
- SOCKS4/SOCKS5 proxying
- IPv4 SSH connections
- SSH client configuration
- curl
- GNU Wget
- Git HTTP/HTTPS proxy configuration
- Python Requests SOCKS proxy configuration
- Firefox and Chrome proxy configuration
- proxychains4
- Nmap TCP connect scans through a proxy
- Linux socket and packet inspection tools (`ss`, `tcpdump`)

## Sources Consulted
- OpenBSD/OpenSSH `ssh(1)` manual page: https://man.openbsd.org/ssh.1
- OpenBSD/OpenSSH `ssh_config(5)` manual page: https://man.openbsd.org/ssh_config.5
- OpenBSD/OpenSSH `sshd_config(5)` manual page: https://man.openbsd.org/sshd_config.5
- RFC 1928: SOCKS Protocol Version 5: https://www.rfc-editor.org/rfc/rfc1928
- curl man page: https://curl.se/docs/manpage.html
- GNU Wget manual, Proxies: https://www.gnu.org/software/wget/manual/html_node/Proxies.html
- Git `git-config` documentation: https://git-scm.com/docs/git-config
- Requests advanced usage, SOCKS proxies: https://requests.readthedocs.io/en/latest/user/advanced/#socks
- Chromium SOCKS proxy documentation: https://www.chromium.org/developers/design-documents/network-stack/socks-proxy
- ProxyChains-NG README: https://github.com/rofl0r/proxychains-ng
- Nmap Reference Guide, TCP connect scan and host discovery: https://nmap.org/book/man-port-scanning-techniques.html and https://nmap.org/book/man-host-discovery.html

## Issues Found

1. **The post overstated dynamic forwarding as routing "all traffic."** OpenSSH dynamic forwarding is a local application-level SOCKS4/SOCKS5 proxy for forwarded TCP connections, not a general IP tunnel for all traffic types. Updated the description, introduction, and conclusion to say "supported application TCP connections" and "proxied TCP connections."

2. **The GNU Wget SOCKS example was incorrect.** GNU Wget documents HTTP/HTTPS/FTP proxy settings and rejects `socks5://` proxy URLs with "Unsupported scheme." Removed the native Wget SOCKS command, added a note that GNU Wget does not support SOCKS proxies directly, and added a `proxychains4 wget` example in the proxychains section.

3. **The curl, Git, and Python Requests examples used client-side DNS resolution.** `curl --socks5`, `socks5://` in libcurl/Git, and `socks5://` in Requests resolve hostnames locally. Updated them to `--socks5-hostname` / `socks5h://` so DNS resolution happens through the SOCKS proxy when supported.

4. **The Python Requests SOCKS example omitted its optional dependency.** Requests requires the `requests[socks]` extra for SOCKS support. Added that requirement to the example comment.

5. **The Nmap-through-proxychains example could perform non-proxied host discovery.** Nmap performs host discovery before scanning by default, and proxychains supports TCP connection proxying only. Added `-Pn` to skip host discovery and keep the example aligned with TCP connect scanning through SOCKS.

6. **The bound-interface comment was too broad.** Binding to `10.0.0.5:1080` makes the proxy reachable to machines that can route to that address, not necessarily every machine on `10.0.0.0/8`. Updated the comment accordingly.

7. **The curl IP-check comment assumed the login IP would be shown.** The visible address is the SSH server's outbound/egress IP, which may differ from the SSH login address because of NAT or multi-homed routing. Updated the comment to say "outbound IP address."

## Review Notes
- `ssh -4` and `AddressFamily inet` force the SSH connection to the server to use IPv4. The server's outbound path for proxied destinations still depends on server routing and destination resolution.
- Binding a dynamic forward to `0.0.0.0` exposes an unauthenticated SOCKS listener to any client that can reach the local host and port. The post already warns to use this carefully.
- Proxychains is TCP-only and may not work with every application, especially programs that use raw packets, UDP, ICMP, static linking, or unusual process loading.
