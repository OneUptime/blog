# Validation Summary: How to Configure IPv6 on Google WiFi and Nest WiFi

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Wifi
- Nest Wifi
- Nest Wifi Pro
- Google Home app
- IPv6
- DHCPv6
- SLAAC
- Thread
- Matter

## Sources Consulted
- Google Nest Help: IPv6 - https://support.google.com/googlenest/answer/6361450
- Google Nest Help: Bridge mode - https://support.google.com/googlenest/answer/6240987
- Google Nest Help: Wifi software versions & release notes - https://support.google.com/googlenest/answer/13800967
- Google Nest Help: What is Nest Wifi Pro? - https://support.google.com/googlenest/answer/12395776
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc8415

## Issues Found
- The post said IPv6 was enabled by default and implied there was nothing to turn on. Google documents IPv6 as a setting in `Google Home -> Wifi -> Settings -> Advanced Networking`. I updated the setup steps to reflect that IPv6 must be enabled there before the automatic behavior starts.
- The architecture diagram and explanation claimed the primary point sub-delegates separate `/64` prefixes to each mesh point and that each point sends its own Router Advertisements. Google's IPv6 docs say the prefix is associated with the router or primary Wifi point in a mesh, while additional points use SLAAC to construct their own addresses. I corrected the diagram and surrounding explanation to show bridged mesh points instead of per-point routed `/64` segments.
- The note claiming Google Wifi "ONLY supports DHCPv6-PD" and "no static IPv6 or 6in4 tunnel" overstated what the public docs guarantee. I replaced it with Google's documented IPv6 limitations: no 6to4, 6rd, IPv4 over IPv6, or IPv6+.
- The `curl -s https://test-ipv6.com/ip/?callback=x | python3 -m json.tool` example was broken. That endpoint returns JSONP, not JSON, so `python3 -m json.tool` fails. I removed the broken pipeline and replaced it with a browser-based end-to-end test note while keeping working CLI checks.
- The Thread section claimed a specific ULA-to-global mapping model and pointed to a Google Home "Thread" settings path that I could not verify in Google's public docs. I rewrote that section to the documented claim that Nest Wifi Pro includes a built-in Thread border router and kept device inspection guidance generic.
- The troubleshooting section overstated DHCPv6-PD requirements, referenced a vague "status page," and suggested `dhclient -6` on a LAN that Google documents as using Router Advertisements and SLAAC for clients. I updated this to Google's documented DHCPv6-based WAN behavior, release notes, and more generic client restart guidance.
- The bridge mode section used the wrong app navigation path and implied a primary mesh point could run in bridge mode. Google's bridge mode docs state bridge mode only works when you're using a single Wifi device. I corrected the app path and added the single-device limitation.
- The conclusion repeated the incorrect default-enable, sub-delegation, and bridge-mode assumptions. I updated it to match the corrected setup and routing behavior.

## Review Notes
- I verified the command behavior locally on 2026-04-30 for `ip`, `ping6`, `curl -6 https://ifconfig.co/ip`, and the failing `test-ipv6.com` JSONP pipeline.
- Google's IPv6 docs note an additional guest-network caveat: IPv6 guest networking requires an ISP-provided prefix shorter than `/64`. The post does not cover guest-network specifics, but it is otherwise accurate after the corrections above.
