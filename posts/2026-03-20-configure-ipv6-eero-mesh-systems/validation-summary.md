# Validation Summary: How to Configure IPv6 on Eero Mesh Systems

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Amazon Eero mesh networking systems (Eero 6, 6+, Pro 6, Pro 6E, Max 7, Beacon)
- IPv6 protocol
- SLAAC (Stateless Address Autoconfiguration)
- DHCPv6 and DHCPv6-PD (Prefix Delegation)
- Eero mobile app (iOS / Android)
- Eero Secure (DNS filtering)
- CLI tools: `ip`, `ifconfig`, `ipconfig`, `ping6`, `curl`
- Public DNS resolvers (Google, Cloudflare)

## Sources Consulted
- Eero Help Center — "What is IPv6?" (https://support.eero.com/hc/en-us/articles/115005975026-Does-eero-support-IPv6)
- Eero Help Center — "How do I set up custom DNS servers with eero?" (https://support.eero.com/hc/en-us/articles/360059988432)
- Eero Help Center — "What are the Advanced networking settings?" (https://support.eero.com/hc/en-us/articles/360036385311)
- Eero Help Center — "How do I set up port forwarding?" (https://support.eero.com/hc/en-us/articles/207908443)
- Eero Community discussions on IPv6 inbound connections and prefix delegation
- RFC 4862 (SLAAC), RFC 8415 (DHCPv6 / IA_PD)
- Public DNS server addresses: Google (2001:4860:4860::8888), Cloudflare (2606:4700:4700::1111)

## Issues Found

1. **Incorrect claim about manual IPv6 toggle.** The post stated "There is no manual toggle - the system detects ISP IPv6 availability and enables it automatically." This is wrong: current Eero firmware exposes an IPv6 toggle under Settings → Advanced Settings → IPv6, and toggling it reboots the network. Updated the wording to reflect that a toggle exists but defaults to automatic detection.

2. **Incorrect WAN IPv6 acquisition order.** The post said the gateway "tries SLAAC first, then DHCPv6" when requesting IPv6 from the ISP. According to Eero's documentation, the gateway requests a WAN IPv6 address via DHCPv6 and a prefix via DHCPv6-PD (a /56 is preferred, /60 is accepted). SLAAC is used to distribute a /64 to LAN clients, not to obtain addressing from the ISP. Rewrote step 1 of "The automatic process" to reflect this and added a step noting that stateful DHCPv6 for LAN clients is not supported.

3. **Inconsistent and incorrect DNS path in the Eero app.** The post used two different paths: "Advanced → Network Settings → DNS" and "Settings → Advanced → DNS." Per Eero's DNS help article, the actual path is Settings → Network Settings → Advanced Settings → DNS. Standardized both occurrences. Also corrected "Custom" to "Custom DNS," which matches the actual UI label.

4. **Port Forwarding does not directly cover IPv6.** The post claimed "Port Forwarding ... supports both IPv4 and IPv6." Eero's app exposes IPv4 Port Forwarding and a separate IPv6 Firewall Rules section under Reservations & Port Forwarding; they are different features. Updated the wording to direct readers to the correct feature for each protocol.

5. **Restart Network path was wrong.** The post directed users to "Advanced → Restart Network." The actual path in the Eero app is Settings → Troubleshooting → Restart Network. Corrected.

## Review Notes

- `ping6` is still functional on macOS and Linux but is being deprecated in favor of `ping -6`. Both work today, so no edit was made, but a future revision could mention `ping -6` as the modern alternative.
- The note about some app versions only accepting IPv4 DNS entries is consistent with community reports — IPv6 DNS support was added around app version 2.24.0 and may not be visible in all UI states (this still happens for some users).
- The "Eero Beacon" listed under previous-generation hardware was discontinued from sale in 2023 but remains supported, so listing it is reasonable. No edit made.
- The post does not mention that Eero requires the upstream modem to be in bridge mode for DHCPv6-PD to work end-to-end; this is a common gotcha in real-world deployments but is outside the strict scope of the current text.
- IPv6 addresses for Google (2001:4860:4860::8888) and Cloudflare (2606:4700:4700::1111) public resolvers are correct.
