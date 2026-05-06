# Validation Summary: How to Configure CoreDNS for IPv6 Standalone Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CoreDNS
- DNS
- IPv6
- Corefile
- systemd
- Prometheus metrics

## Sources Consulted
- CoreDNS homepage: https://coredns.io/
- CoreDNS GitHub repository and README: https://github.com/coredns/coredns
- CoreDNS 1.14.2 release notes: https://coredns.io/2026/03/06/coredns-1.14.2-release/
- CoreDNS `forward` plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS `bind` plugin documentation: https://coredns.io/plugins/bind/
- CoreDNS `view` plugin documentation: https://coredns.io/plugins/view/
- CoreDNS `dnssec` plugin documentation: https://coredns.io/plugins/dnssec/
- CoreDNS `health` plugin documentation: https://coredns.io/plugins/health/
- CoreDNS `prometheus` plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS `file` plugin documentation: https://coredns.io/plugins/file/
- `systemd.exec(5)` man page
- `capabilities(7)` man page

## Issues Found
- The installation command used `https://github.com/coredns/coredns/releases/latest/download/coredns_linux_amd64.tgz`, which does not match the versioned release asset naming on GitHub and would not download successfully. I replaced it with the current official `v1.14.2` asset URL, updated the tar filename to match, and added `sudo` for moving the binary into `/usr/local/bin`.
- The Step 1 forwarding comment said the configuration would "prefer IPv6", but CoreDNS `forward` randomizes upstream selection by default and `prefer_udp` only prefers UDP over TCP. I rewrote the comment so it accurately describes forwarding to IPv6 upstream resolvers.
- The Step 1 `dnssec` stanza was labeled as "DNSSEC validation", but the official CoreDNS `dnssec` plugin performs on-the-fly signing of authoritative data rather than recursive validation. I removed the plugin from the forwarding-only example and corrected the surrounding explanatory text to refer to DNSSEC signing for authoritative data.
- Step 3 used listener IPs as server block keys (`[::1]:53` and `[2001:db8::53]:53`), but CoreDNS uses server block keys for zones and ports while the `bind` plugin controls the listen address. I rewrote the example to use `bind` with IPv6 addresses.
- Step 4 used `view external` as a standalone directive, which is not valid `view` syntax. I kept the internal `view` block with the documented `expr` form and made the external block the default fallback server block.
- The systemd unit ran as `User=coredns` while binding to port 53 but did not grant the capability required for privileged ports. I added `AmbientCapabilities=CAP_NET_BIND_SERVICE` and `CapabilityBoundingSet=CAP_NET_BIND_SERVICE`.

## Review Notes
- I validated the corrected Corefile patterns against a CoreDNS `v1.14.2` binary in the sandbox. The `view` and `bind` configurations started successfully when tested with locally bindable IPv6 loopback addresses.
- The documentation address `2001:db8::53` cannot be bound in this environment because it is not assigned locally, so only the `bind` syntax itself was runtime-validated.
- The installation example is now accurate as of 2026-05-06, but it is pinned to CoreDNS `v1.14.2` and should be refreshed when a newer release becomes the recommended download target.
