# Validation Summary: How to Configure SSH Tunnels for Secure Port Forwarding on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH client and server
- SSH local, remote, and dynamic port forwarding
- SOCKS5 proxying with curl
- SSH client configuration
- autossh
- systemd services
- ProxyJump / jump hosts

## Sources Consulted
- OpenSSH manual pages index: https://www.openssh.org/manual.html
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- curl command manual: https://curl.se/docs/manpage.html
- GNU Wget proxy documentation: https://www.gnu.org/software/wget/manual/html_node/Proxies.html
- Local Ubuntu OpenSSH 9.6p1 man pages and command output

## Issues Found
- The default remote forwarding example said anyone who could reach `public-server.example.com:8080` would reach the local service. With the default OpenSSH server `GatewayPorts no` behavior, remote forwards bind to loopback by default, so this is only reachable from the remote server itself unless external binding is explicitly enabled. Updated the comment to say processes on the remote server can connect via `localhost:8080`.
- The remote forwarding note specifically mentioned loopback as `127.0.0.1`. OpenSSH may bind loopback addresses rather than only that IPv4 address, so the wording was changed to "loopback addresses."
- The SOCKS proxy section showed GNU Wget using `http_proxy=socks5://...` and `https_proxy=socks5://...`. GNU Wget's documented proxy support is for HTTP/HTTPS/FTP proxy settings, not direct SOCKS proxy URLs. Replaced that example with a curl SOCKS proxy URL example using `socks5h://`.
- The SSH config example described `RequestTTY no` as "Don't execute a shell." `RequestTTY no` only controls pseudo-TTY allocation; `-N` is what prevents command/shell execution in the shown command. Updated the comment to accurately describe the directive.

## Review Notes
The remaining OpenSSH forwarding flags, ssh_config/sshd_config directives, ProxyJump examples, curl SOCKS options, and systemd service structure are technically consistent with the consulted manuals. The autossh command could not be executed locally because `autossh` is not installed in the review environment, but its usage was checked against available autossh manual documentation.
