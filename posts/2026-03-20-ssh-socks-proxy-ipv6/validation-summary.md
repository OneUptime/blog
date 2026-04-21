# Validation Summary: How to Use SSH as a SOCKS Proxy for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH dynamic port forwarding
- SOCKS4/SOCKS5 proxies
- IPv6 addressing and IPv6 URL literals
- curl proxy configuration
- PySocks
- ProxyChains
- autossh
- systemd service units
- Firefox SOCKS proxy settings

## Sources Consulted
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- curl man page: https://curl.se/docs/manpage.html
- everything curl SOCKS proxy documentation: https://everything.curl.dev/usingcurl/proxies/socks.html
- GNU Wget proxy documentation: https://www.gnu.org/software/wget/manual/html_node/Proxies.html
- PySocks PyPI documentation and project source: https://pypi.org/project/PySocks/ and https://github.com/Anorov/PySocks
- autossh(1) manual: https://manpages.ubuntu.com/manpages/noble/man1/autossh.1.html
- ProxyChains-NG README: https://github.com/rofl0r/proxychains-ng
- RFC 3849 IPv6 documentation prefix: https://www.rfc-editor.org/info/rfc3849
- Local systemd.service(5) man page for ExecStart and Restart syntax

## Issues Found
- The post used invalid IPv6 placeholders such as `2001:db8::sshserver`, `2001:db8::server`, and `2001:db8::service`. IPv6 address fields are hexadecimal, so these are not valid literals. Replaced them with valid documentation-prefix addresses: `2001:db8::10`, `2001:db8::20`, and `2001:db8::30`.
- The GNU Wget example used `ALL_PROXY="socks5h://[::1]:1080"`, but GNU Wget documents HTTP, HTTPS, and FTP proxy variables and does not provide native SOCKS proxy support. Replaced that example with a curl `ALL_PROXY` example, which is supported by curl.
- The Python example used PySocks monkeypatching with `urllib.request` for an IPv6 literal destination. PySocks' direct `socksocket.connect()` path rejects IPv6 socket address tuples in this pattern, while `socks.create_connection()` handles IPv4 or IPv6 proxy addresses and destination addresses. Rewrote the snippet to use `socks.create_connection()` directly.
- The conclusion said the `[::1]`-bound proxy accepts local IPv4 or IPv6 connections. A listener explicitly bound to IPv6 loopback accepts connections on that bound address. Reworded this to describe binding behavior accurately while preserving the IPv4/IPv6 destination claim.
- The IPv6 test comment said the response is the IPv6 address of the SSH server. Reworded it as the SSH server's IPv6 egress address, which is more accurate for routed or NATed environments.

## Review Notes
- `2001:db8::/32` is reserved for documentation examples and must be replaced with real reachable addresses in production.
- The autossh and systemd examples are syntactically valid for the documented options. For production boot ordering, `network-online.target` may be preferable to `network.target` when the tunnel must wait for working connectivity.
