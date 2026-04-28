# Validation Summary: How to Configure Nebula VPN with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nebula (open-source overlay networking, slackhq/nebula)
- IPv6 (underlay transport and overlay addressing)
- nebula-cert (PKI tooling for Nebula)
- YAML configuration
- ip6tables (Linux IPv6 firewalling)
- Prometheus metrics endpoint
- systemd service management

## Sources Consulted
- Nebula example config: https://raw.githubusercontent.com/slackhq/nebula/master/examples/config.yml
- nebula-cert sign source: https://raw.githubusercontent.com/slackhq/nebula/master/cmd/nebula-cert/sign.go
- nebula-cert ca source: https://raw.githubusercontent.com/slackhq/nebula/master/cmd/nebula-cert/ca.go
- nebula main source: https://raw.githubusercontent.com/slackhq/nebula/master/cmd/nebula/main.go
- Nebula CHANGELOG: https://raw.githubusercontent.com/slackhq/nebula/master/CHANGELOG.md
- Latest release (v1.10.3, 2026-02-06): https://github.com/slackhq/nebula/releases/tag/v1.10.3

## Issues Found

1. **Outdated claim about overlay IPv6 support.** The post stated "Nebula overlay addresses are IPv4 currently; IPv6 is underlay-only." Nebula v1.10.0 (released 2025-12-04) added support for IPv6 and multiple IPv4/IPv6 addresses in the overlay (v2 cert format). Updated the comment to reflect that `-networks` accepts both IPv4 and IPv6 CIDRs as of v1.10.0.

2. **Deprecated `-ip` flag on `nebula-cert sign`.** The post used `nebula-cert sign -ip "..."`. Per `cmd/nebula-cert/sign.go`, `-ip` is deprecated in favor of `-networks` (a comma-separated list of CIDRs). Replaced all three occurrences with `-networks`.

3. **Invalid IPv6 address `2001:db8::lighthouse`.** IPv6 addresses only accept hex digits 0–9 and a–f; the literal string "lighthouse" contains non-hex characters. Replaced both occurrences with `2001:db8::1`.

4. **Misleading description of `-test` flag.** The post said the `-test` flag "Check[s] connection to lighthouse." Per `cmd/nebula/main.go`, `-test` only validates that the config parses; it does not dial the lighthouse. Updated the comment to reflect actual behavior.

## Review Notes

- `listen.host: "::"`, `tun.drop_local_broadcast`, `tun.drop_multicast`, `tun.mtu: 1300`, `punchy.punch`, `static_host_map`, and the `stats` block (`type: prometheus`, `listen`, `path`) all match the official example config.
- The release asset URL `https://github.com/slackhq/nebula/releases/latest/download/nebula-linux-amd64.tar.gz` is correct for current releases.
- Firewall rule selectors (`port`, `proto`, `host`, `group`) match the example config schema.
- Future improvement: the post could mention `static_map.network: ip6` for controlling DNS resolution family when the lighthouse is referenced by hostname. Not a correctness issue.
- Future improvement: with v1.10.0+, the post could include an example of issuing a v2 cert with a dual-stack `-networks "192.168.100.2/24,fd00::2/64"` so readers can take advantage of true IPv6 overlay addressing. Left out to avoid adding new sections beyond what is needed to fix errors.
