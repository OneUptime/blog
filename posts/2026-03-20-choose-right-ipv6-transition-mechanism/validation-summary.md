# Validation Summary: How to Choose the Right IPv6 Transition Mechanism for Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Dual-stack
- NAT64
- DNS64
- 464XLAT
- DS-Lite
- Lightweight 4over6 (lw4o6)
- MAP-E
- MAP-T
- 6rd
- Kubernetes
- CoreDNS
- Jool

## Sources Consulted
- RFC 6146, Stateful NAT64: https://www.rfc-editor.org/rfc/rfc6146
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6333, Dual-Stack Lite: https://www.rfc-editor.org/rfc/rfc6333.html
- RFC 6877, 464XLAT: https://www.rfc-editor.org/rfc/rfc6877
- RFC 7381, Enterprise IPv6 Deployment Guidelines: https://www.rfc-editor.org/rfc/rfc7381.html
- RFC 7596, Lightweight 4over6: https://www.rfc-editor.org/rfc/rfc7596.html
- RFC 7597, MAP-E: https://www.rfc-editor.org/rfc/rfc7597.html
- RFC 7599, MAP-T: https://www.rfc-editor.org/rfc/rfc7599.html
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305.html
- RFC 8683, Additional Deployment Guidelines for NAT64/464XLAT in Operator and Enterprise Networks: https://www.rfc-editor.org/rfc/rfc8683.html
- RFC 9313, Pros and Cons of IPv6 Transition Technologies for IPv4-as-a-Service (IPv4aaS): https://www.rfc-editor.org/rfc/rfc9313.html
- CoreDNS `dns64` plugin docs: https://coredns.io/plugins/dns64/
- Kubernetes IPv4/IPv6 dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Jool IPv4/IPv6 translation docs: https://www.jool.mx/en/intro-xlat.html

## Issues Found
- The enterprise migration bullet implied that adding AAAA records was sufficient for an existing IPv4 service. I changed it to say the service must first be enabled for IPv6 and then publish AAAA records alongside A records, because DNS changes alone do not make a service reachable over IPv6.
- The Happy Eyeballs bullet said dual-stack clients "use IPv6 when available." RFC 8305 describes concurrent connection attempts with IPv6 preference and fast fallback, so I corrected the wording to reflect that behavior.
- The mobile section overstated deployment reality by saying mobile networks are "almost universally" IPv6-only at the radio layer and by hard-coding OS version claims for CLAT support. I replaced that with RFC-backed wording: many mobile networks deploy IPv6-only data services, 464XLAT is the standardized compatibility mechanism, and CLAT support exists on multiple platforms but varies by release and device.
- The comparison matrix marked dual-stack as "Partial" for IPv6-only clients. I changed that to "No" because dual-stack itself is not the mechanism that provides IPv4 reachability to IPv6-only clients.
- The ISP comparison table said dual-stack "requires two addresses per sub." I corrected that to "requires IPv4 plus IPv6 per sub" because broadband dual-stack typically means a public IPv4 allocation plus IPv6 service or prefix delegation, not literally just two host addresses.
- The summary sentence about mobile usage was softened to match the corrected body text.

## Review Notes
- CoreDNS documents that its `dns64` plugin currently provides basic AAAA synthesis and does not implement every DNS64 feature from RFC 6147. The post's high-level recommendation is still reasonable, but a future implementation-focused article should mention that limitation.
- Kubernetes supports single-stack IPv6 and dual-stack networking, but actual deployment depends on CNI and cloud-provider support.
- The subscriber-count cutoffs in the decision criteria are reasonable planning heuristics, not protocol-defined thresholds from the RFCs.
