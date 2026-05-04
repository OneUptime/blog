# Validation Summary: How to Configure Privoxy for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Privoxy (privacy-enhancing web proxy)
- IPv6 networking (RFC 4291 addressing)
- SOCKS5 proxy forwarding (including SOCKS5t for Tor-style hostname resolution)
- systemd service management
- curl HTTP client
- ss (iproute2) socket statistics

## Sources Consulted
- Privoxy User Manual — https://www.privoxy.org/user-manual/config.html
- Privoxy `listen-address` directive documentation — https://www.privoxy.org/user-manual/config.html#LISTEN-ADDRESS
- Privoxy `permit-access` / `deny-access` directives — https://www.privoxy.org/user-manual/config.html#PERMIT-ACCESS
- Privoxy `forward-socks5t` directive — https://www.privoxy.org/user-manual/config.html#FORWARD-SOCKS
- Privoxy `forward` directive (URL pattern target syntax) — https://www.privoxy.org/user-manual/config.html#FORWARD
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- RFC 5952 (IPv6 text representation — hex characters 0–9, a–f only)
- curl manual page (`-x`/`--proxy`, `-6`/`--ipv6`)

## Issues Found

1. **Invalid IPv6 literal `2001:db8::proxy`** in Step 1 (commented example) and Step 5 (curl test). IPv6 address fields must be hexadecimal (0–9, a–f); the letters `p`, `r`, `x`, and `y` are not valid hex. Replaced with `2001:db8::1`, a valid documentation address.

2. **Invalid IPv6 literal `2001:db8::socks`** in Step 3 (`forward-socks5t` example). The characters `s`, `o`, and `k` are not valid hex. Replaced with `2001:db8::1`.

3. **Invalid `forward` target pattern `2001:db8:internal::/48`** in Step 3. Two problems: (a) `internal` is not valid hex; (b) Privoxy's `forward` directive does not accept CIDR ranges as the target_pattern — it expects a URL/host pattern (`host[:port][/path]`). CIDR notation is only supported by access-control directives such as `permit-access`/`deny-access`. Replaced with a hostname pattern (`forward .internal/ .`) which is valid Privoxy syntax for routing matching hosts directly without an upstream proxy.

## Review Notes
- All other directives (`listen-address`, `permit-access`, `deny-access`, `forward-socks5t`, `actionsfile`, `filterfile`, `{+block{...}}` action syntax) are valid Privoxy 3.0.x configuration. Multiple `listen-address` lines are supported since Privoxy 3.0.21 (2014).
- The default log path `/var/log/privoxy/logfile` matches the Debian/Ubuntu package default.
- The `--no-daemon` flag is correct for foreground execution; `privoxy --help` confirms this.
- `2001:db8::/32` is the RFC 3849 documentation prefix; using it with the comment "internal network" is a slight stretch (ULA would be `fc00::/7`), but it is conventional in tutorials and not technically incorrect for a configuration example.
- Readers should note that `permit-access`/`deny-access` rules are evaluated in order with first-match-wins semantics; the post's ordering (specific permits before broad deny) is correct.
