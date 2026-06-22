# Validation Summary: Setting Up a SOCKS5 Proxy on Ubuntu with Dante

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Dante / danted SOCKS server
- SOCKS5
- OpenSSH dynamic forwarding
- microsocks
- systemd services
- UFW
- curl
- Python requests
- proxychains
- stunnel

## Sources Consulted
- RFC 1928: SOCKS Protocol Version 5: https://datatracker.ietf.org/doc/html/rfc1928
- Dante danted(8) Debian man page: https://manpages.debian.org/unstable/dante-server/danted.8.en.html
- Dante danted.conf(5) Debian man page: https://manpages.debian.org/unstable/dante-server/danted.conf.5.en.html
- Dante authentication documentation: https://www.inet.no/dante/doc/1.4.x/config/auth.html
- Dante sockd.conf(5) documentation: https://www.inet.no/dante/doc/1.3.x/sockd.conf.5.html
- Dante minimal server configuration: https://www.inet.no/dante/doc/latest/config/server.html
- Dante logging configuration: https://www.inet.no/dante/doc/latest/config/logging.html
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- curl SOCKS proxy documentation: https://everything.curl.dev/usingcurl/proxies/socks.html
- Python Requests advanced usage, SOCKS section: https://requests.readthedocs.io/en/latest/user/advanced/#socks
- stunnel manual page: https://www.stunnel.org/manual.html
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The Dante bandwidth example used `bandwidth: 10000000` while labeling it `10 Mbps`. Dante documents bandwidth values as bytes per second and the feature requires Dante's bandwidth module, so the example was changed to `1250000` bytes per second with a module note.
- The Python `requests` example omitted the optional SOCKS dependency. Added `python -m pip install 'requests[socks]'` before the Python snippet.
- The stunnel section showed only the server-side wrapper, which is not enough for ordinary SOCKS clients to speak TLS to the proxy port. Added a note that clients must use a matching stunnel client and point SOCKS applications at the local stunnel port.
- The authentication troubleshooting section suggested `su - proxyuser`, but the guide creates `proxyuser` with `/bin/false`, so interactive login is expected to fail. Replaced it with a curl-based SOCKS credential test.

## Review Notes
The remaining commands and configuration snippets are broadly correct for Ubuntu systems using the packaged `dante-server`, OpenSSH, curl, systemd, and stunnel. Interface names such as `eth0` are examples and may need replacement with the actual interface from `ip addr show`.
