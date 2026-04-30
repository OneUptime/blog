# Validation Summary: How to Configure IPv6 on eero Mesh Systems - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- eero mesh networking
- IPv6
- Bridge mode and NAT
- Thread and Matter
- Linux networking tools (`ip`, `ping`, `curl`, `dig`)

## Sources Consulted
- eero Help Center, "What is IPv6?" https://support.eero.com/hc/en-us/articles/115005975026-What-is-IPv6
- eero Help Center, "What is bridge mode?" https://support.eero.com/hc/en-us/articles/208276903-How-do-I-bridge-my-eeros-
- eero Help Center, "What features do I lose if I put my eeros in bridge mode?" https://support.eero.com/hc/en-us/articles/115000825206-What-advanced-features-do-I-lose-access-to-if-I-put-my-eeros-into-bridge-mode-
- eero Help Center, "How do I put my modem/router combo in bridge mode?" https://support.eero.com/hc/en-us/articles/207613176-How-do-I-bridge-my-modem-router-combo-device-
- eero Help Center, "Can I use eero with my current ISP or modem?" https://support.eero.com/hc/en-us/articles/209605453-Can-I-use-eero-with-my-current-ISP-or-modem
- eero Help Center, "How do I configure ISP settings?" https://support.eero.com/hc/en-us/articles/360060086931-How-do-I-configure-ISP-settings
- eero Help Center, "What is Thread?" https://support.eero.com/hc/en-us/articles/360000104706-What-is-Thread
- Thread Group, "Overview" https://www.threadgroup.org/What-is-Thread/Overview/home
- Local CLI help used to verify command syntax: `ping -h`, `curl --help all`, `dig -h`, `ip -V`

## Issues Found
- Corrected the eero app navigation paths. The original post used `Advanced Settings` and `eero Mode`, but current eero documentation uses `Settings → Advanced networking → IPv6` and `Settings → Advanced networking → DHCP & NAT → Bridge`.
- Removed unsupported product-specific claims about delegated prefix sizes, `/64` distribution details, and app-visible LAN prefix status. The current eero support articles used for review do not document those behaviors at that level of detail.
- Corrected the verification section to target a Linux device specifically and replaced `ping6` with `ping -6`, which matches current command usage verified from local CLI help.
- Softened the claim that the ISP modem "must" be in bridge mode. eero recommends bridging a modem/router combo when you want eero to be the main router, but eero also documents other supported upstream-router arrangements.
- Fixed the Thread explanation. The original text incorrectly described the border router as mapping ULA addresses to global IPv6; the corrected version reflects eero's documented role as a Thread border router between the Thread mesh and Wi-Fi/Ethernet networks.
- Corrected the bridge-mode behavior. The original post said Thread border routing and eero security features still applied in bridge mode, but eero documents that bridge mode disables `Thread` and `Upstream IPv6` and limits many eero Plus features.
- Removed the incorrect PMTUD/DNS troubleshooting advice. DNS choice is not a valid workaround for IPv6 path MTU problems.

## Review Notes
- eero's public documentation confirms IPv6 support, bridge-mode behavior, Thread support, and current app paths, but it does not document all internal LAN-side IPv6 implementation details. The revised post stays at the level eero documents directly.
- Current eero ISP-settings documentation notes PPPoE and VLAN tagging support on eero 6-class hardware and newer, which is consistent with the Pro 6 / 6E focus of this post.
