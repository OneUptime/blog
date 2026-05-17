# Validation Summary: How to Use sslh to Multiplex SSH and HTTPS on Port 443 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sslh (protocol multiplexer)
- Ubuntu (apt, systemd, ufw)
- OpenSSH
- nginx (HTTPS backend)
- OpenVPN
- iptables / iproute2 (transparent proxy / fwmark routing)
- Linux capabilities (cap_net_bind_service / setcap)
- libconfig (sslh's config file format)

## Sources Consulted
- sslh upstream repository: https://github.com/yrutschle/sslh
- sslh example config: https://github.com/yrutschle/sslh/blob/master/example.cfg
- sslh config documentation: https://github.com/yrutschle/sslh/blob/master/doc/config.md
- sslh transparent proxy guide: https://github.com/yrutschle/sslh/blob/master/doc/tproxy.md
- sslh probe source: https://github.com/yrutschle/sslh/blob/master/probe.c
- Debian/Ubuntu sslh package documentation (init script + systemd-sslh-generator)
- RFC 4253 (SSH Transport Layer Protocol) for SSH banner exchange semantics
- iptables / iproute2 manpages for fwmark routing semantics

## Issues Found
1. **IPv6 listen host syntax (`[::]` → `::`).** The post's listen block used `host: "[::]"`. sslh resolves the `host` field via `getaddrinfo()`, which does not accept bracketed IPv6 notation — brackets are URI/socket-string syntax. The example config in the upstream repo uses bare hostnames/addresses. Changed to `host: "::"` so the config actually parses and binds to the IPv6 wildcard.
2. **Incorrect iptables rule for transparent mode.** The post used `iptables -t mangle -A PREROUTING -i lo -p tcp -m multiport --dports 22,4443 -j MARK --set-mark 0x1`. The official sslh tproxy guide marks packets in the **OUTPUT** chain using the **owner** match for the `sslh` user (so backend responses get routed back to sslh via the custom routing table). The PREROUTING+dports approach marks the forward path, not the return path that fwmark routing needs to redirect. Replaced with `iptables -t mangle -A OUTPUT -p tcp -m owner --uid-owner sslh -j MARK --set-mark 0x1` and updated the surrounding comment to describe what is actually being marked and why.

## Review Notes
- The post sets `/etc/sslh/sslh.cfg` as the config path. The Debian/Ubuntu init logic reads `/etc/sslh.cfg` first and falls back to `/etc/sslh/sslh.cfg`. Both work in practice on current Ubuntu, so this was left as-is.
- `setcap 'cap_net_bind_service=+ep'` is applied to both `/usr/sbin/sslh-fork` and `/usr/sbin/sslh`. On Debian/Ubuntu `/usr/sbin/sslh` is typically a symlink to one of the two flavors (fork/select); setting it on both binaries is harmless and was left alone.
- The SSH probe in sslh works by matching the `"SSH-"` prefix sent by the client. RFC 4253 allows either side to send the version string first; OpenSSH's client sends it immediately, which is why the probe works in practice. The post's wording ("the protocol starts with `SSH-2.0-` which sslh recognizes") is consistent with the actual probe implementation.
- `verbose: 3;` is still accepted as an umbrella option that sets all `verbose-*` flags. Newer sslh versions prefer the granular `verbose-connections`, `verbose-config`, etc., but the post's form is not broken on the sslh versions shipped with current Ubuntu.
- The transparent-mode section is intentionally a starting point; a complete setup typically also requires `sysctl net.ipv4.conf.<iface>.route_localnet=1` and consideration of CONNMARK for save/restore. The post doesn't claim to be exhaustive here, so this was not added.
- Recommending `/etc/rc.local` for persistence is somewhat dated on modern Ubuntu (systemd is preferred), but the post offers a systemd service as the first option, so this is acceptable.
