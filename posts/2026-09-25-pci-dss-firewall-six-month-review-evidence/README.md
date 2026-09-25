# How to Turn Firewall Rule Exports into PCI DSS Six-Month Review Evidence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Firewall, Compliance

Description: Turn raw firewall exports into traceable PCI DSS network-control review evidence with resolved objects, business justification, review decisions, and verified remediation.

---

A firewall rule export proves that a configuration existed. It does not prove that someone reviewed whether the rules were still necessary, correctly scoped, and effective. The missing step is a documented decision about the actual permitted network paths, followed by verification of required changes.

PCI DSS v4.0.1 Requirement 1.2.7 requires network security control configurations to be reviewed at least every six months for relevance and effectiveness. Its testing includes verifying that configurations without continuing business justification are removed or updated. The scope is broader than a single perimeter firewall. [PCI DSS v4.0.1, 1.2.7](https://www.pcisecuritystandards.org/document_library/)

## Establish the complete review population

Use the network and data-flow diagrams to identify enforcement points. Include applicable physical and virtual firewalls, cloud security controls, routers enforcing policy, internal segmentation controls, and centrally managed policies inherited by local devices.

Record the device or policy identifier, owner, environment, account or tenant, location, active revision, and export time. Include failover members and disaster-recovery configurations where relevant. Reconcile the export list to the inventory so an omitted region does not disappear from the review.

Capture active configurations rather than only the infrastructure-as-code repository. Compare intended and deployed state to find console changes and failed deployments. Retain the source exports in protected evidence storage and attach checksums to detect accidental changes during normalization.

## Normalize without losing rule semantics

Build a review table that links every row back to a source rule. Useful fields include direction, source, destination, protocol, ports, action, rule priority, enabled state, logging behavior, owner, business purpose, and expiry.

Resolve address and service groups. A rule referring to `payment-partners` is not reviewable unless the reviewer can see its current membership and where that membership is managed. Include IPv6, prefix lists, dynamic tags, and referenced security groups when they affect permitted access.

Preserve platform semantics. Ordered rules, additive allow policies, stateful return traffic, stateless access lists, and NAT translations cannot all be represented as the same flat allow/deny list. Keep enough original context for the reviewer to understand the effective path.

An example review row could be:

```text
Policy: cde-egress
Rule: allow-settlement-transfer
Source: settlement-worker group, membership captured
Destination: approved processor endpoint group, membership captured
Service: TCP 443
Business owner: settlement platform
Justification: processor transfer integration, design reference
Decision: narrow obsolete destination member
Change: approved change reference
Verification: active rule export plus permitted/denied path checks
```

The example does not imply that port 443 alone makes a connection justified or secure.

## Make a decision for each configuration

Compare allowed paths with current application and business needs. Ask whether the source and destination populations remain correct, whether the protocol and port range are necessary, and whether a narrower rule can satisfy the purpose.

Investigate broad networks, unrestricted egress, expired temporary rules, unused services, duplicate rules, shadowed rules, and administrative paths that bypass the expected entry point. Rule descriptions copied from years-old tickets need current confirmation from the responsible owner.

Use traffic and hit-count evidence as an input, not the sole decision. A zero-hit disaster-recovery rule may still be necessary, while a frequently used rule may permit an unauthorized dependency. For uncertain cases, involve the application owner and test the intended flow.

Requirements 1.2.5 and 1.2.6 address authorized services, protocols, ports, and security features for insecure ones. Connect the review to those existing records instead of maintaining a separate unexplained list of permissions. [PCI DSS v4.0.1, 1.2.5–1.2.7](https://www.pcisecuritystandards.org/document_library/)

## Track changes through deployed verification

Use explicit outcomes such as retain with justification, narrow, remove, or investigate. Assign an owner and target date to each action. A review is not substantively complete when known unnecessary permissions remain in a spreadsheet without follow-through.

Apply changes through normal change control. Test affected business flows and expected denied paths, including the return path and relevant failover route. Preserve a rollback plan when a correction can disrupt payment operations.

After deployment, capture the active configuration and confirm the rule actually changed. A merged pull request or approved ticket alone does not prove the production policy was updated.

## Package evidence that another reviewer can follow

Retain the population inventory, raw exports, normalization method, object-membership snapshots, reviewer decisions, supporting justifications, change records, and verification results. Record review dates and responsible reviewers.

Schedule the next review to maintain the at-least-six-month cadence. High change volumes may justify more frequent review, and ordinary change approval remains necessary between periodic reviews.

The evidence should let someone start with a live permitted connection and trace it to a current business reason, a review decision, and the deployed configuration. That traceability turns a routine export into a meaningful control review.
