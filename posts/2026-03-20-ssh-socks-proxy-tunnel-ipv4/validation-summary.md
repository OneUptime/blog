# Validation Summary: How to Use SSH as a SOCKS Proxy for Tunneling IPv4 Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH dynamic port forwarding
- SOCKS4/SOCKS5 proxying
- curl proxy options
- autossh
- systemd service units
- Git proxy configuration
- npm proxy configuration
- Python PySocks
- ProxyChains-NG / proxychains4
- Nmap TCP connect scans

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- RFC 1928, SOCKS Protocol Version 5: https://www.rfc-editor.org/rfc/rfc1928
- curl SOCKS proxy documentation: https://everything.curl.dev/usingcurl/proxies/socks.html
- autossh README: https://www.harding.motd.ca/autossh/README.txt
- systemd syntax documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.syntax.html
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html
- Git `git-config` documentation for `http.proxy`: https://git-scm.com/docs/git-config#Documentation/git-config.txt-httpproxy
- npm CLI config documentation for `proxy` and `https-proxy`: https://docs.npmjs.com/cli/v11/using-npm/config
- PySocks README: https://github.com/Anorov/PySocks
- ProxyChains-NG README: https://github.com/rofl0r/proxychains-ng
- Nmap host discovery documentation: https://nmap.org/man/man-host-discovery.html
- Example Domain check: https://example.com/
- IP echo endpoint check: https://icanhazip.com/

## Issues Found
- The description and conclusion described the tunnel as "IPv4 traffic", which could imply arbitrary IP packets. OpenSSH dynamic forwarding is an application-level SOCKS forward for TCP connections, so I changed the wording to "TCP application traffic" and "TCP connections".
- The `icanhazip.com` test said it should return `remote-server.example.com`'s IP. The endpoint returns the remote side's public egress IP, which may differ from the server hostname's DNS address because of NAT or cloud networking. I corrected the comment.
- The Git example configured both `http.proxy` and `https.proxy`. Git documents `http.proxy` for HTTP(S) transport proxying and uses curl proxy syntax; `https.proxy` is not a documented Git proxy key. I removed the incorrect `https.proxy` command and clarified that `http.proxy` applies to HTTP and HTTPS remotes.
- The ProxyChains section claimed support for "Any Application". ProxyChains-NG works by hooking dynamically linked programs and supports TCP connections through SOCKS/HTTP proxies, so I changed the heading and comment to TCP applications.
- The Nmap ProxyChains example used `-sT` without `-Pn`. `-sT` is the right TCP connect scan for ProxyChains, but Nmap host discovery may use probes that do not travel through the SOCKS proxy. I added `-Pn` to skip host discovery when scanning through the tunnel.

## Review Notes
Local CLI versions checked: OpenSSH 9.6p1, curl 8.5.0, Git 2.43.0, npm 10.9.4, and systemd 255. I did not run a live SSH tunnel because the examples require real SSH credentials and a remote host, but command syntax and behavior were checked against official documentation and local CLI help.
