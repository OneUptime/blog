# Validation Summary: How to Configure Fortinet SD-WAN with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- FortiGate
- FortiOS
- Fortinet SD-WAN
- IPv6
- BGP
- NAT66

## Sources Consulted
- Fortinet FortiOS CLI reference: `config system sdwan` https://docs.fortinet.com/document/fortigate/7.4.7/cli-reference/838040159/config-system-sdwan
- Fortinet FortiOS CLI reference: `config system interface` https://docs.fortinet.com/document/fortigate/7.4.2/cli-reference/9620/config-system-interface
- Fortinet FortiOS administration guide: Configuring SD-WAN in the CLI https://docs.fortinet.com/document/fortigate/7.4.8/administration-guide/256518/configuring-sd-wan-in-the-cli
- Fortinet FortiOS administration guide: Manual strategy https://docs.fortinet.com/document/fortigate/7.4.8/administration-guide/723448/manual-strategy
- Fortinet FortiOS administration guide: BGP and IPv6 https://docs.fortinet.com/document/fortigate/7.4.8/administration-guide/18177/bgp-and-ipv6
- Fortinet FortiOS CLI reference: `config router bgp` https://docs.fortinet.com/document/fortigate/7.4.0/cli-reference/528620/config-router-bgp
- Fortinet FortiOS administration guide: Specify an SD-WAN zone in static routes and SD-WAN rules https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/270527/specify-an-sd-wan-zone-in-static-routes-and-sd-wan-rules
- Fortinet FortiOS CLI reference: `config router static6` https://docs.fortinet.com/document/fortigate/6.2.15/cli-reference/531620/config-router-static6
- Fortinet FortiOS feature note: VRF-aware SD-WAN IPv6 health checks https://docs.fortinet.com/document/fortigate/7.4.0/new-features/474917/vrf-aware-sd-wan-ipv6-health-checks
- RFC 3849: IPv6 Address Prefix Reserved for Documentation https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The WAN interface examples used invalid FortiOS IPv6 syntax. I replaced `set ip6 address ...` with the documented `config ipv6`, `set ip6-mode static`, and `set ip6-address ...` syntax.
- Multiple example IPv6 addresses were not valid IPv6 literals because they used words like `wan1`, `lan`, `voip`, `sip-server`, and `isp-peer` inside the address. I replaced them with valid documentation-prefix addresses from `2001:db8::/32`.
- The post did not include an IPv6 static route to the SD-WAN zone, which is required for the example to forward IPv6 traffic through SD-WAN. I added a `config router static6` example using `set sdwan-zone "virtual-wan-link"`.
- The IPv6 health-check example used `set protocol ping6`, but current FortiOS SD-WAN health checks use `set addr-mode ipv6` with `set protocol ping`. I corrected that and added `set addr-mode ipv6` to both IPv6 health checks.
- The SD-WAN service rule examples used invalid FortiOS options: `set mode load-balance`, `set load-balance-mode weighted`, `set members 1 2`, `set mode best-quality`, `set quality-link bandwidth`, and `set dscp 0x2e`. I replaced them with current FortiOS rule syntax using `manual` or `priority` mode, `set load-balance enable`, `set hash-mode round-robin`, `set priority-members`, `set health-check`, `set link-cost-factor latency`, and the documented DSCP tagging options.
- The firewall section referenced an IPv6 pool object that was never defined. I added a matching `config firewall ippool6` example for `IPv6-WAN-Pool`.
- The BGP example used an incorrect nested `config capability` block for IPv6. I replaced it with the documented neighbor-level `set activate6 enable` and `set capability-graceful-restart6 enable` settings.
- The verification section used an invalid sample IPv6 source address and an outdated route diagnostic command form. I replaced them with a valid source address and `diagnose ipv6 route list`, and simplified the health-check verification command to `diagnose sys sdwan health-check`.
- Several FortiOS CLI commands had inline `#` comments on the same line as `set` commands, which would make the pasted configuration invalid. I moved those notes onto their own comment lines.

## Review Notes
- The post is now technically consistent with current FortiOS SD-WAN and BGP CLI structure, but some exact commands and available fields can still vary slightly across FortiOS release trains.
- The examples use RFC 3849 documentation addresses and must be replaced with real production prefixes before deployment.
