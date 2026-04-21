# Validation Summary: How to Test for IPv6 VPN Leaks

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 networking
- VPN leak testing
- Bash shell scripting
- curl
- BIND dig and DNS TXT diagnostics
- Linux iproute2 and traceroute
- Browser/WebRTC and online DNS/IP leak testing

## Sources Consulted
- IETF RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- IETF RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- curl man page: https://curl.se/docs/manpage.html
- ISC BIND 9 dig manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- GNU Bash escape character documentation: https://www.gnu.org/software/bash/manual/html_node/Escape-Character.html
- Akamai WhoAmI DNS resolver diagnostic documentation: https://www.akamai.com/blog/developers/introducing-new-whoami-tool-dns-resolver-information
- Google Public DNS setup documentation: https://developers.google.com/speed/public-dns/docs/using
- Quad9 FAQ and IPv6 resolver addresses: https://quad9.net/support/faq/
- Cloudflare 1.1.1.1 resolver IP address documentation: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- ipify API documentation: https://www.ipify.org/
- Linux ip(8) manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- Linux traceroute(8) manual page: https://www.man7.org/linux/man-pages/man8/traceroute.8.html
- BrowserLeaks WebRTC test page: https://browserleaks.com/webrtc

## Issues Found
- The illustrative IPv6 address `2001:db8::your-real-address` was not valid IPv6 text syntax because IPv6 address fields must be hexadecimal. Changed it to `2001:db8::1234`, while keeping the RFC 3849 documentation prefix.
- The DNS resolver loop placed inline comments after backslash line continuations, which breaks Bash parsing. Removed those inline comments and verified the corrected loop with `bash -n`.
- The DNS leak example queried `myip.opendns.com` over IPv6 and used `whoami.cloudflare` against non-Cloudflare resolvers. Replaced these with Akamai's TXT-based resolver diagnostics: `whoami.ds.akahelp.net` for the configured resolver and `whoami.ipv6.akahelp.net` for IPv6 resolver checks.
- The automated script's DNS step resolved an AAAA record, which did not identify the DNS resolver path. Replaced it with a resolver identity check so users can compare the resolver against their VPN provider.
- Updated the traceroute command from `traceroute6` to the documented `traceroute -6` form.
- The BrowserLeaks URL `https://browserleaks.com/ipv6` returned HTTP 404, while `https://browserleaks.com/webrtc` is the WebRTC leak test page. Updated the table link.

## Review Notes
- The changed Bash snippets pass syntax checks with `bash -n`.
- The `api6.ipify.org` endpoint is IPv6-only; failing from a host without IPv6 connectivity is expected and documented by ipify.
- `traceroute` may not be installed by default on all Linux systems, but the `-6` and `-m` options are documented for the Linux traceroute utility.
