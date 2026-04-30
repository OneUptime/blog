# Validation Summary: How to Sign Up and Configure Hurricane Electric IPv6 Tunnel Broker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hurricane Electric Tunnel Broker
- IPv6
- 6in4 / SIT tunnels
- Linux `iproute2`
- `systemd-networkd`
- `radvd`
- Cisco IOS
- Windows `netsh`
- DHCP hook automation

## Sources Consulted
- Hurricane Electric Tunnel Broker home page: https://tunnelbroker.net/
- Hurricane Electric FAQ: https://ipv6.he.net/certification/faq.php
- Hurricane Electric official API documentation thread: https://forums.he.net/index.php?topic=3153.0
- `systemd.netdev` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Cisco IOS IPv6 command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Microsoft `netsh interface` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- `radvd.conf(5)` manpage: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html

## Issues Found
- The `systemd-networkd` example was incomplete for SIT tunnel creation. `systemd-networkd` expects the tunnel to be requested from the underlying link with `Tunnel=`. I added a WAN `.network` example, added `MTUBytes=1480`, and changed the tunnel `.network` file to use `Gateway=2001:470:xxxx::1`.
- The LAN-routing section omitted IPv6 forwarding, which is required for a Linux host to route traffic between the LAN and the HE tunnel. I added `net.ipv6.conf.all.forwarding=1` and a persistent sysctl example.
- The `radvd.conf` write command would fail as written for non-root shells because shell redirection happens before `sudo`. I changed it to `sudo tee ... > /dev/null`.
- The `radvd` prefix block incorrectly set `AdvRouterAddr on;`, which is a Mobile IPv6-specific option and not appropriate for a normal LAN prefix advertisement. I removed it.
- The Cisco IOS example used `ipv6 nd ra-interval 30`, which Cisco documents as replaced by `ipv6 nd ra interval 30`. I updated the command to the current syntax.
- The Windows `netsh` example omitted the explicit parameter names used in current Microsoft documentation, and the interface address was added without `/64`. I updated the commands to the documented `interface=`, `localaddress=`, `remoteaddress=`, `address=.../64`, and `prefix=`/`nexthop=` forms.
- The dynamic IPv4 update section incorrectly referred to an HE account API key. Hurricane Electric's endpoint-update API uses the account password or a tunnel-specific Update Key. I corrected the guidance, switched the example to the documented `username=` / `password=` parameter form, and removed unnecessary `sudo` from the hook script.
- The verification section overstated the expected browser result by claiming `test-ipv6.com` should specifically show the tunnel endpoint `::2`. After LAN routing is configured, the browser may instead use another IPv6 address from the routed allocation. I generalized the verification guidance.

## Review Notes
- Hurricane Electric documents two operational prerequisites that readers still need in practice: the IPv4 endpoint must respond to ICMP echo requests, and any NAT/firewall in front of the tunnel endpoint must permit IP protocol 41. The post remains technically valid, but those prerequisites would be useful future context.
