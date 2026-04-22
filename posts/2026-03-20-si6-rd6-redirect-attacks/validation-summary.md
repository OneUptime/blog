# Validation Summary: How to Use the SI6 Networks rd6 Tool for Redirect Attacks

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- rd6
- IPv6 Neighbor Discovery Protocol
- ICMPv6 Redirect messages
- Linux iproute2
- Linux sysctl

## Sources Consulted
- SI6 Networks IPv6 Toolkit official page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks IPv6 Toolkit rd6 manual: https://github.com/fgont/ipv6toolkit/blob/master/manuals/rd6.1
- Debian rd6(1) manpage for ipv6toolkit 2.0: https://manpages.debian.org/testing/ipv6toolkit/rd6.1.en.html
- RFC 4861, Neighbor Discovery for IP version 6, especially Redirect message format and validation: https://www.rfc-editor.org/rfc/rfc4861
- Linux kernel IP sysctl documentation for IPv6 `accept_redirects`: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- iproute2 `ip-route(8)` documentation for route cache and `protocol redirect`: https://manpages.debian.org/trixie/iproute2/ip-route.8

## Issues Found
- The post used the nonexistent `rd6` option `--redir-addr`. Changed it to the documented `--redir-target` option.
- The post used the nonexistent `--redir-hdr` option. Updated the Redirected Header section to state that `rd6` includes the Redirected Header option by default unless `--no-payload` is used.
- Several example IPv6 addresses used placeholder words such as `fe80::router`, `fe80::target`, and `2001:db8::server`, which are not syntactically valid IPv6 addresses. Replaced them with valid documentation-range examples.
- Several multiline shell examples placed comments after line-continuation backslashes, which breaks shell parsing. Moved or removed those inline comments so the commands are syntactically valid.
- The basic `sudo rd6 -i eth0` example did not provide the required active-mode redirect target, redirect destination, and victim destination, nor did it select passive mode. Replaced it with a complete active-mode example using `--learn-router`.
- The RFC 4861 validation checklist was incomplete and included an imprecise on-link destination rule. Updated it to reflect the required link-local source, current first-hop router, Hop Limit, ICMPv6 Code/checksum/length, non-multicast destination, target-address, and option-length checks.
- The Linux route verification notes referred only to generic `redirect` flags. Added a `table cache proto redirect` command to match iproute2's documented route protocol naming.
- The persistent sysctl example used shell redirection to `/etc/sysctl.conf` without root privileges. Replaced it with `sudo tee` into `/etc/sysctl.d/99-ipv6-redirects.conf` and `sudo sysctl --system`.
- The Arch Linux install line used `pacman -S ipv6toolkit`, but the package is available through the AUR rather than the official pacman repositories. Updated it to an AUR-helper command and labeled it as AUR.

## Review Notes
The post is technically valid after the corrections. The examples remain suitable only for authorized lab environments, as the post already warns.
