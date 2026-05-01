# Validation Summary: How to Set Up DNS Resolution Inside a Network Namespace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux network namespaces
- `iproute2` / `ip netns`
- DNS resolver configuration via `resolv.conf`
- `dnsmasq`
- `systemd-resolved`
- `nss-resolve`
- `iptables` NAT

## Sources Consulted
- `ip-netns(8)` man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `resolv.conf(5)` man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- `systemd-resolved.service(8)` man page: https://www.freedesktop.org/software/systemd/man/250/systemd-resolved.service.html
- `nss-resolve(8)` man page: https://www.freedesktop.org/software/systemd/man/250/nss-resolve.html
- `dnsmasq(8)` man page: https://dnsmasq.org/docs/dnsmasq-man.html
- Local CLI help/man pages checked for command syntax: `ip netns help`, `dnsmasq --help`, `iptables --help`, `ping(8)`

## Issues Found
- The post originally described `/etc/netns/<name>/resolv.conf` as if Linux automatically applied it to all processes in the namespace. I corrected this to match `ip-netns(8)`: `ip netns exec` creates a mount namespace and bind-mounts per-namespace config files into `/etc` for the invoked command.
- The `dnsmasq` example used `--no-daemon`, which the upstream `dnsmasq(8)` documentation describes as debug-only. I changed it to `--keep-in-foreground`.
- The same `dnsmasq` example did not disable reading `/etc/resolv.conf`. Because the example later points the namespace `resolv.conf` at `127.0.0.1`, this could make `dnsmasq` re-read a resolver configuration that points back to itself. I added `--no-resolv` while keeping the explicit upstream `--server=8.8.8.8`.
- The `systemd-resolved` section was too vague. I corrected it to explain that `127.0.0.53` inside the namespace is that namespace's own loopback address, not the host stub resolver, and added a note about `nss-resolve` affecting glibc-based lookups.
- The custom search-domain example omitted the `mkdir -p /etc/netns/prod` step required before writing the file. I added it.
- The full setup script hardcoded `eth0` for NAT, which is not valid on many modern systems. I changed it to detect the default-route interface and use that interface name in the `iptables` rule.

## Review Notes
- The NAT example still assumes the host's forwarding policy allows the traffic once IP forwarding and MASQUERADE are configured. On hosts with restrictive firewall policies, additional `FORWARD` rules may be required.
