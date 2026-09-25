# How to Validate WAF Blocking and Alert Investigation for PCI DSS 6.4.2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, WAF, Security

Description: Validate public-facing web protection through deployment coverage, effective rule actions, complete logging, and tested immediate investigation workflows.

---

A WAF appearing in an architecture diagram does not show that it protects every public application route. Rules may be in count mode, an origin may be reachable directly, or alerts may wait in a queue until office hours. Validate the actual request path and operational response.

PCI DSS v4.0.1 Requirement 6.4.2 requires an automated technical solution for public-facing web applications. Its conditions include active, current protection, audit logging, and configuration that either blocks web attacks or alerts for immediate investigation. The requirement has been effective since 31 March 2025. [PCI DSS v4.0.1, 6.4.2](https://www.pcisecuritystandards.org/document_library/)

## Map the protected request paths

List each public hostname and application, including alternate domains, APIs, administrative endpoints, and disaster-recovery routes. Trace DNS, CDN, load balancer, reverse proxy, and origin connectivity.

Record the security policy associated with each path. A global policy name is less useful than proof that the correct policy is attached to the resource that serves the request. Verify IPv4 and IPv6 exposure where applicable and investigate direct-origin access that can avoid inspection.

A working inventory might contain:

| Route | Enforcement point | Policy | Expected handling |
|---|---|---|---|
| Checkout hostname | Edge proxy | Payment web policy | Attack blocking |
| Public API | API ingress | API protection policy | Blocking with reviewed exclusions |
| Partner portal | Regional load balancer | Portal policy | Alert with immediate investigation |

The choices are examples. Each real route needs protection and evidence appropriate to its function; an unlisted route does not inherit coverage by assumption.

## Inspect effective actions, including overrides

Review rule ordering, exclusions, allow rules, managed-rule versions, and default actions. A rule group configured to block can still contain count overrides. An early allow action may prevent later inspection.

For AWS WAF, the official testing workflow recommends observing rules in count mode while tuning and then moving to the intended production actions. Count mode helps understand matches; it does not itself block a request. An alert-based PCI implementation also needs the immediate investigation process. [AWS WAF testing and tuning](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing.html)

Record the reason and owner for exclusions. Bound them to the narrowest necessary request condition and revisit them after application changes. A broad exclusion for every request body can remove the protection needed by the application's most sensitive operations.

## Test blocking as an observable chain

Agree a safe test plan with the application and security owners. Use synthetic data and approved detection test cases. A custom rule matching a unique test marker can validate routing and alert plumbing, but cannot establish that the real attack rules work. Exercise representative relevant detections in a controlled environment and verify deployed behavior as appropriate.

For each test, capture:

```text
Test identifier -> request route -> matched rule and version
               -> effective action -> application observation -> audit event
```

For a blocking case, confirm the request was blocked by the intended security control and the protected action did not complete. An application returning an error for unrelated reasons is not evidence of WAF enforcement.

Test a permitted request as well. The goal is to establish the policy's behavior, including that tuning has not broken the business flow. Repeat across distinct enforcement points rather than assuming one edge test covers every regional path.

## Test immediate investigation as a staffed operation

If using the alert option, follow a test event from detection to a person or automated response process capable of investigation. Capture delivery, acknowledgement, investigation start, conclusion, and containment when needed.

PCI DSS does not supply a universal number of minutes that automatically means immediate. Define an operational response design that supports immediate investigation, document it, and demonstrate it to the assessor. A next-business-day queue or a daily digest does not establish that behavior.

Include nights, weekends, missing primary responders, and broken notification integrations. Verify that escalation reaches someone with the context and authority to investigate. Acknowledging a page without examining the event does not prove investigation occurred.

## Preserve evidence and monitor drift

Retain the route inventory, effective configuration, rule-update process, test results, and linked security events. Check that event records contain useful identifiers without recording sensitive payment payloads.

Monitor policy detachment, disabled protections, configuration changes, log-delivery failures, and notification failures. Route these to owners who can restore the control. Revalidate after application routing changes, major rule updates, or new exception rules.

Requirement 6.4.2 is one part of application security. Its evidence should show continuous protection and an effective response path. It does not replace secure development, vulnerability remediation, or other applicable payment-page controls.
