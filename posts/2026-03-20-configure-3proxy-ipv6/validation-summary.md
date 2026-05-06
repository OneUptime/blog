# Validation Summary: How to Configure 3proxy for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- 3proxy
- IPv6
- HTTP proxying
- SOCKS5 proxying
- systemd
- curl

## Sources Consulted
- 3proxy official README: https://github.com/3proxy/3proxy
- 3proxy official configuration reference (`3proxy.cfg`): https://3proxy.org/doc/man3/3proxy.cfg.3.html
- 3proxy official IPv6 notes in the project wiki: https://github.com/3proxy/3proxy/wiki/How-To-%28incomplete%29
- curl official man page: https://curl.se/docs/manpage.html
- systemd official `systemd.service(5)` reference: https://www.freedesktop.org/software/systemd/man/253/systemd.service.html
- systemd official `systemctl(1)` reference: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The post used invalid example IPv6 literals such as `2001:db8::proxy`, `2001:db8::upstream`, and `2001:db8::squid`. I replaced them with valid documentation-prefix IPv6 addresses because the original strings were not syntactically valid IPv6 addresses.
- The upstream chaining example omitted the required preceding `allow` rule for `parent` and used `http` while the text described an HTTP CONNECT parent. I added `allow *`, changed the HTTP example to `connect`, and commented the alternative so the snippet does not unintentionally create a multihop chain when copied as-is.
- The IPv6-client restriction example used the ACL fields incorrectly and omitted an auth mode that enables IP-based ACLs. I changed it to `auth iponly` with `allow * 2001:db8::/32`, which matches clients by source IPv6 subnet as intended.
- The conclusion incorrectly said `-6` is what makes 3proxy listen on IPv6. I corrected it to explain that `-i` binds the listener and `-6` controls IPv6-only upstream name resolution.

## Review Notes
- The sample systemd unit is syntactically valid, but `User=proxy` assumes that the `proxy` service account already exists on the host.
- The sample `curl --socks5` command verifies SOCKS5 access over IPv6. If you specifically want the proxy to resolve the destination hostname itself, `curl --socks5-hostname` is the relevant curl mode.
