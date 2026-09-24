# How to Segment the Cardholder Data Environment and Validate the Segmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Networking, Security

Description: Define enforceable CDE boundaries, test denied paths and administrative bypasses, and retain segmentation evidence at the required cadence.

---

Segmentation can reduce PCI DSS scope when it actually isolates the cardholder data environment from systems treated as out of scope. A VLAN, cloud account, namespace, or firewall rule is an implementation component; none is sufficient evidence by itself.

Start by describing the boundary in terms of allowed operations and denied paths. Then test whether the deployed controls enforce that description.

## Identify what the boundary must protect

Map account-data stores and flows, then include the systems that administer or can affect them. Identity services, deployment agents, backup controllers, and network-policy administrators can matter even when they do not receive PAN.

Separate three questions in the inventory:

1. Does this system store, process, or transmit account data?
2. Can it connect to a CDE system or provide a security function for it?
3. Can it change CDE code, identities, keys, routes, or access policy?

Record the reasoning for proposed exclusions. If a general corporate administrator can assume the production payment role, the account separation diagram does not establish the intended isolation.

PCI SSC's [modern-network scoping guidance](https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures) addresses cloud, microsegmentation, and zero-trust environments. Apply the scoping principles to the actual control plane rather than assuming a particular platform provides an exemption.

## Create an explicit communication matrix

Write allowed paths before implementing rules. Include direction, source identity or network, destination, protocol, business purpose, and owner.

| Source | Destination | Intended behavior |
| --- | --- | --- |
| Public web tier | Payment API | Only documented application endpoint |
| Payment API | PAN vault | Only authorized vault operation |
| Corporate workstation | PAN vault | Denied |
| Approved administration path | CDE management interface | Authenticated, authorized, logged |
| Payment workload | Unapproved Internet destination | Denied |

Cover DNS, time synchronization, telemetry, updates, and backup transfers. Otherwise teams often add a broad outbound exception later to restore a forgotten dependency.

Implement a default-deny boundary with narrow, reviewed permissions. Keep policy configuration versioned and monitor changes. PCI SSC's [VLAN FAQ](https://www.pcisecuritystandards.org/faqs/1135/) makes clear that adequate segmentation depends on the controls and their configuration, not the use of VLANs alone.

## Test bypass paths as well as expected routes

Ask a qualified tester to evaluate the boundary from the excluded environments. Include alternative routes, IPv6 where present, peering, VPNs, secondary interfaces, host networking, shared management services, and cloud control-plane permissions.

A TCP connection test to one port proves only that one tested path behaved as observed. It does not demonstrate that every segmentation method is effective. Test the controls used in the actual scope-reduction claim, including the isolation of systems with differing security levels where relevant.

Use positive tests too: confirm that intended payment operations still work through the approved route. This makes it easier to distinguish an enforced boundary from an outage or a test launched from the wrong source.

Avoid testing only from a privileged management host that already has CDE access. Record the tester's starting network and identity, the target, expected result, observed result, and the control that should enforce it.

## Apply the correct testing frequency

Requirement 11.4.5 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) requires segmentation penetration testing at least every 12 months and after changes to segmentation controls or methods. Requirement 11.4.6 imposes at least every six months for service providers, also after those changes. The tester must be qualified and organizationally independent; being a QSA or ASV is not mandatory for this test.

Do not substitute a quarterly vulnerability scan for segmentation penetration testing. They answer different questions. A host with no known vulnerabilities may still be reachable through a boundary that was supposed to exclude it.

Connect infrastructure changes to retesting. A new peering route, firewall policy, shared identity role, or management connection may alter the segmentation method even when the payment application's code is unchanged.

## Preserve evidence and respond to failures

Retain the communication matrix, diagrams, asset inventory, policy exports, tester qualifications, test methodology, results, and remediation retests. Ensure the tested deployment corresponds to the version currently in service.

If a supposedly excluded system can reach or influence the CDE unexpectedly, treat the scope assumption as unresolved. Restrict the path, assess exposure, and apply appropriate controls while the boundary is repaired. Do not simply remove the failed test from the report.

Finally, keep scope confirmation separate from the technical test. Under 12.5.2, the entity confirms scope at least annually and after significant changes; service providers have the six-month requirement in 12.5.2.1. The inventory review and penetration test support each other, but one does not replace the other.
