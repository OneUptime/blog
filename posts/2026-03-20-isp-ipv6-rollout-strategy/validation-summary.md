# Validation Summary: How to Plan ISP IPv6 Rollout Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ISP address planning and RIR allocations
- BGP and MP-BGP for IPv6 route exchange
- DHCPv6, DHCPv6 Prefix Delegation, and SLAAC
- Broadband access platforms (BNG, DSLAM, OLT, CPE)
- IPv4aaS and transition mechanisms (DS-Lite, NAT64/DNS64, 464XLAT)
- IPAM and NOC monitoring
- Path MTU Discovery (PMTUD) and ECN
- Bash and Python examples

## Sources Consulted
- RIPE NCC, "Assessment Criteria for IPv6 Allocations" - https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/assessment-criteria-for-ipv6-allocations/
- ARIN, "Number Resource Policy Manual" - https://www.arin.net/participate/policy/nrpm/
- RFC 6177, "IPv6 Address Assignment to End Sites" - https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 7084, "Basic Requirements for IPv6 Customer Edge Routers" - https://www.rfc-editor.org/rfc/rfc7084
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 4760, "Multiprotocol Extensions for BGP-4" - https://www.rfc-editor.org/rfc/rfc4760.html
- RFC 2545, "Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing" - https://www.rfc-editor.org/rfc/rfc2545
- RFC 6146, "Stateful NAT64" - https://www.rfc-editor.org/rfc/rfc6146
- RFC 6147, "DNS64" - https://www.rfc-editor.org/rfc/rfc6147
- RFC 8585, "Requirements for IPv6 Customer Edge Routers to Support IPv4-as-a-Service" - https://www.rfc-editor.org/rfc/rfc8585.html
- RFC 7196, "Making Route Flap Damping Usable" - https://www.rfc-editor.org/rfc/rfc7196
- RFC 7454, "BGP Operations and Security" - https://www.rfc-editor.org/rfc/rfc7454.html
- RFC 8201, "Path MTU Discovery for IP version 6" - https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 9386, "IPv6 Deployment Status" - https://www.rfc-editor.org/rfc/rfc9386.html

## Issues Found
- The original wording said to "enable IPv6 on BGP peering sessions," which can imply IPv6 transport sessions are required. I changed this to "enable IPv6 route exchange with BGP peers and upstream providers" because MP-BGP can exchange IPv6 reachability over either IPv4 or IPv6 transport, as described in RFC 2545 and RFC 4760.
- The pilot-phase transition guidance mixed a dual-stack rollout with IPv6-only access transition mechanisms. I changed that line to make those tests conditional on future IPv6-only access and clarified the mechanism set to include NAT64/DNS64 with 464XLAT, which is the more accurate framing for IPv4-only content and applications in IPv6-only access scenarios per RFCs 6146, 6147, and 8585.
- The batch migration shell snippet used an unqualified vendor-specific DSLAM command as if it were universally valid. I kept the example but labeled it as vendor-specific syntax, added `set -euo pipefail`, improved quoting, and changed the echoed status text so the snippet no longer implies universal command compatibility.
- The optimization phase said to "let DS-Lite handle IPv4," which was too loose. I changed it to "move more subscribers to IPv4aaS such as DS-Lite" to reflect that DS-Lite is an IPv4-as-a-Service approach for IPv6-only access rather than a generic IPv4 optimization toggle.
- The routing-instability mitigation said to "use BGP dampening" without qualification. I changed it to recommend prefix filtering and maximum-prefix limits first, and to specify RFC 7196-adjusted thresholds if route flap dampening is used, because blanket dampening guidance is outdated according to RFC 7454.

## Review Notes
- The post is strategically sound after the corrections and remains current as of 2026-04-29.
- The Python example is syntactically valid and the sample calculation prints `IPv6 adoption in pilot: 84.7%`.
- The shell example is syntactically valid, but the remote DSLAM command remains illustrative and must be replaced with the target vendor's documented CLI or API before operational use.
