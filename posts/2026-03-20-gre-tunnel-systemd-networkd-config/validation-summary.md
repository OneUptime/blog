# Validation Summary: How to Configure a GRE Tunnel with systemd-networkd - Config

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux GRE tunnels
- systemd-networkd
- systemd `.netdev` and `.network` files
- Linux routing
- iptables
- nftables
- sysctl / IP forwarding
- `iproute2` and `tcpdump`

## Sources Consulted
- systemd.netdev(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.syntax(7): https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- Linux kernel documentation, Operational States: https://docs.kernel.org/6.2/networking/operstates.html
- `iptables-save(8)` local man page
- `ip-tunnel(8)` local man page
- `pcap-filter(7)` local man page

## Issues Found
- The systemd `.netdev` and `.network` snippets used inline `# ...` comments after key/value lines. In systemd syntax, comments must be on their own lines, so I moved those comments above the affected directives to keep the examples valid.
- The main example used `192.168.1.10` as an Internet-facing GRE endpoint. That is RFC 1918 private address space and is not an appropriate public endpoint example, so I replaced it with the documentation address `198.51.100.10` and updated the related tunnel examples for consistency.
- The firewall persistence example used `sudo iptables-save > /etc/iptables/rules.v4`, where the shell redirection is not elevated by `sudo`. I changed it to `sudo iptables-save -f /etc/iptables/rules.v4` and clarified that this path is a Debian/Ubuntu `iptables-persistent` example.
- The verification section said `ip link show` should show `UP state`. Tunnel devices commonly show the `UP` flag while operational state may still be `UNKNOWN`, so I corrected the wording to check for the `UP` flag instead.
- The best-practices section recommended GRE keepalives, but the Linux/systemd GRE path documented here does not expose a keepalive configuration in the referenced tooling. I changed that guidance to monitoring, which is accurate for this setup.
- I added `sudo` to the `nft` commands for consistency with the rest of the post and clarified that the MTU change shown with `ip link set` is a runtime change.

## Review Notes
- The core GRE configuration shown in the post is valid for current systemd releases: `Kind=gre` and `Kind=ip6gre`, `[Tunnel] Local=`, `Remote=`, and `TTL=`, plus `[Route] Destination=` and `Gateway=` are supported.
- The explanation that GRE provides no encryption and uses IP protocol 47 is accurate for the IPv4 underlay example in the post.
- The 24-byte overhead and `1476` MTU guidance are accurate for basic GRE over IPv4 with a 1500-byte underlay MTU.
- The `iptables-save -f /etc/iptables/rules.v4` path is distro-specific; other distributions persist firewall rules differently.
- The external author link and OneUptime link were reachable at review time.
