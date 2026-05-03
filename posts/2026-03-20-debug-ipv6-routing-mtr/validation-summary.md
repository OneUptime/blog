# Validation Summary: How to Debug IPv6 Routing Issues with mtr

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- mtr (My TraceRoute) v0.95
- IPv6 / ICMPv6
- TCP SYN probing
- JSON output processing (jq)
- Debian/Ubuntu, RHEL/Fedora, macOS package management

## Sources Consulted
- mtr upstream source code: https://github.com/traviscross/mtr/blob/master/ui/mtr.c (canonical list of long/short options)
- mtr(8) man page (option semantics for `-6/--inet6`, `-n/--no-dns`, `-r/--report`, `-c/--report-cycles`, `-a/--address`, `-T/--tcp`, `-P/--port`, `-j/--json`)
- Debian package archive (`mtr` and `mtr-tiny` packages)
- Google Public DNS IPv6 documentation (2001:4860:4860::8888)
- Quad9 DNS IPv6 documentation (2620:fe::fe)
- RFC 4443 (ICMPv6) for the rate-limiting/filtering behavior at intermediate hops

## Issues Found
- **`--ipv6` is not a valid mtr long option.** The post originally used `mtr --ipv6 ipv6.google.com`, but mtr's source code (`{"inet6", 0, NULL, '6'}`) only registers `-6` and `--inet6` (and would reject `--ipv6` with "unrecognized option"). Changed `--ipv6` to `--inet6` on the dual-stack hostname example. All other usages already used the short `-6` form, which is correct.

## Review Notes
- All other mtr flags used in the post (`-n/--no-dns`, `-r/--report`, `-c/--report-cycles`, `-a/--address`, `--tcp`, `--port`, `--json`) are confirmed valid against the upstream source.
- `mtr-tiny` on Debian/Ubuntu is the curses-only build (no GTK); the regular `mtr` package would also work. The choice in the post is fine for CLI users.
- The TCP-probe note ("bypassing ICMP filters") is accurate for the destination response, but worth noting for readers: intermediate-hop discovery in TCP mode still relies on ICMPv6 Time-Exceeded replies from routers along the path. So `--tcp` only bypasses ICMP filtering at the endpoint, not at every hop. The post's wording is acceptable but slightly oversimplified.
- The `--json` option requires mtr to be built with libjansson; this is standard on most distro packages but not guaranteed on every minimal build.
- Example destination addresses are real and current: `2001:4860:4860::8888` (Google) and `2620:fe::fe` (Quad9).
- The 100%-loss-on-intermediate-hop interpretation is correct and reflects standard ICMPv6 rate-limiting behavior on transit routers.
