# Validation Summary: How to Train ISP Support Staff on IPv6

## Status
validated

## Post Type
Training guide / Operational troubleshooting guide

## Technologies Covered
- IPv6 addressing and notation
- Global unicast, link-local, unique local, and multicast IPv6 addresses
- SLAAC, DHCPv6, Neighbor Discovery Protocol, and ICMPv6
- ISP CPE IPv6 support and customer firewall behavior
- RADIUS IPv6 attributes
- Happy Eyeballs dual-stack connection behavior
- Windows, Linux, macOS/BSD, and curl diagnostic commands

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 4864, Local Network Protection for IPv6: https://www.rfc-editor.org/rfc/rfc4864
- RFC 6092, Recommended Simple Security Capabilities in Customer Premises Equipment (CPE) for Providing Residential IPv6 Internet Service: https://www.rfc-editor.org/rfc/rfc6092
- RFC 8305, Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://www.rfc-editor.org/rfc/rfc8305
- RFC 3162, RADIUS and IPv6: https://www.rfc-editor.org/rfc/rfc3162
- RFC 4818, RADIUS Delegated-IPv6-Prefix Attribute: https://www.rfc-editor.org/rfc/rfc4818
- RFC 6911, RADIUS Attributes for IPv6 Access Networks: https://www.rfc-editor.org/rfc/rfc6911
- Microsoft Learn ipconfig documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn ping documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn findstr documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- curl command-line documentation for `-6, --ipv6`: https://curl.se/docs/manpage.html#-6
- Debian iputils ping man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html

## Issues Found
1. **Overstated IPv6/NAT behavior.** The post said "No NAT in IPv6" and that "all devices are directly accessible." IPv6 generally does not need NAT for address conservation, but NAT66/NPTv6 mechanisms exist, and inbound reachability depends on address type, routing, and firewall policy. Updated the Day 1 overview and quick reference to say IPv6 usually does not use NAT and that firewall rules control inbound access.
2. **Overbroad security-camera explanation.** The original wording implied IPv6 devices are always directly reachable without port forwarding. Updated it to say devices with global addresses can be reachable without port forwarding if the router firewall allows inbound connections.
3. **Simplified Happy Eyeballs explanation.** The post described clients as trying IPv6 first and falling back to IPv4 within a few seconds. RFC 8305 describes concurrent or closely staggered connection attempts, commonly with short delays. Reworded the customer-facing explanation to say the device may try IPv6 and IPv4 close together and use whichever connection succeeds first.
4. **Linux/macOS ping command distinction.** The post used `ping6` for both Mac and Linux. Modern Linux `iputils` supports `ping -6`; `ping6` may exist as a compatibility command. Updated the diagnostic block to show `ping -6` for Linux and `ping6` for macOS/BSD.

## Review Notes
- IPv6 address notation, compression, link-local `fe80::/10`, multicast, ULA, SLAAC, DHCPv6, ICMPv6, NDP, RADIUS IPv6 attributes, and the general support workflow are technically sound.
- The commands `ping -6 ipv6.google.com`, `ping6 ipv6.google.com`, and `curl -6 https://ipv6.google.com` were checked in the local environment. `https://test-ipv6.com` returned HTTP 200 during review.
- The post does not specify OS versions. The corrected commands are stable for current Windows, Linux iputils, and macOS/BSD environments, but exact customer output can vary by OS language, shell, and network configuration.
