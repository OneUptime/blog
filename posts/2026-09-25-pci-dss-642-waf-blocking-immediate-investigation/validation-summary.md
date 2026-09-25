# Validation Summary: How to Validate WAF Blocking and Alert Investigation for PCI DSS 6.4.2

## Status
validated

## Post Type
Technical validation guide. Although it contains no executable code, commands, or configuration syntax, it includes technical implementation details covering request routing, effective WAF actions, enforcement testing, audit evidence, and alert investigation. It therefore warrants technical review rather than the not-code-blog classification.

## Technologies Covered
- PCI DSS v4.0.1 Requirement 6.4.2 and supporting incident-response controls.
- Web application firewalls, including AWS WAF rules, rule groups, Count overrides, and terminating actions.
- DNS, CDNs, load balancers, reverse proxies, APIs, origins, and IPv4/IPv6 exposure.
- Audit logging, alert delivery, investigation, escalation, and configuration monitoring.

## Sources Consulted
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) — verified that the linked library lists PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirements and Testing Procedures](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) — the publisher download returned HTTP 403. Read the PCI SSC-authored document through a [copy hosted on Red Hat's issue tracker](https://issues.redhat.com/secure/attachment/13274529/PCI-DSS-v4_0_1.pdf), particularly Requirement 6.4.2 on printed page 152 and Requirements 12.10.3–12.10.5.
- [PCI SSC FAQ 1593](https://www.pcisecuritystandards.org/faqs/1593/) — independently confirmed the 31 March 2025 effective date and replacement of Requirement 6.4.1.
- [AWS WAF testing and tuning](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing.html) — checked staging tests, production Count-mode tuning, and propagation differences across enforcement locations.
- [AWS WAF rule and rule group actions](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rule-actions.html) — checked evaluation order, terminating Allow/Block actions, non-terminating Count, and protected-resource behavior.
- [AWS WAF rule group action overrides](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rule-group-override-options.html) — checked individual rule overrides and the distinction from overriding a group's returned action.
- [AWS WAF log fields](https://docs.aws.amazon.com/waf/latest/developerguide/logging-fields.html) — checked that request and rule identifiers and effective actions support test correlation.
- [CloudFront: Restrict access to Application Load Balancers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html) — verified direct-origin bypass concerns and the need to validate the actual route.
- [Author GitHub profile](https://github.com/nawazdhandala) — checked the author-link destination.

## Issues Found
- The blocking-test paragraph said to confirm that the response was blocked. Changed “response” to “request” in README.md. AWS WAF's Block action prevents the matching request from reaching the protected application; the client can still receive a response from the enforcement control. The surrounding instruction to confirm that the protected action did not complete remains correct.

## Review Notes
- Confirmed active, current automated protection, audit logging, and the blocking-or-immediate-investigation alternative. Requirement 6.4.2 does not specify a universal response time in minutes. The post correctly avoids inventing one.
- Off-hours coverage and escalation are sensible implementation guidance, consistent with designated incident responders being available around the clock. Automation must actually investigate or support investigation; notification delivery or acknowledgement alone does not establish it.
- PCI applicability remains bounded by the assessed environment. The route examples are illustrative, not a determination that every unrelated public application falls within an organization's PCI scope.
- Count mode does not itself block. Early Allow matches can stop subsequent evaluation, and overrides can change effective behavior. Reviewing exclusions and testing representative detections are technically sound recommendations.
- A marker rule verifies the tested routing and event path, but does not demonstrate attack-rule effectiveness. The evidence-chain text block is explanatory notation, not executable code or a native log schema. Rule versions may need to be correlated from configuration records.
- Configuration drift, logging failures, and notification failures are reasonable monitoring targets. Sensitive payment data should not be introduced into test events or evidence unnecessarily.
- Both technical links in the post resolve to relevant official resources. The PCI library remains a suitable link despite the direct PDF access restriction encountered during review.
- This was a documentation-based technical review. No deployed WAF, live attack tests, or operational investigation workflow was available to exercise. No executable code, CLI flags, or configuration snippets required runtime testing.
