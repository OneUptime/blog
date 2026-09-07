# How to Audit Colocation Physical Access and Tenant Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Access Control, Tenant Isolation, Compliance, Audit

Description: Audit identity, entry layers, cages, cabinets, media, deliveries, remote hands, access logs, and shared infrastructure in colocation.

---

Colocation divides physical security between the facility and the customer. An audit should prove who can reach the building, floor, cage, cabinet, cabling, and equipment, and should test whether the records support that claim.

## Define responsibility and scope

Obtain the contract, security responsibility matrix, floor and cage drawings, access policy, remote-hands terms, and relevant assurance reports. Mark each control as provider, customer, carrier, landlord, or shared.

Include:

- perimeter, loading dock, lobby, and entry controls
- data hall, suite, cage, cabinet, and rack
- overhead and underfloor cable routes and meet-me rooms
- shipping, staging, media, spare parts, and waste
- provider staff, customer staff, visitors, vendors, and remote hands
- cameras, alarms, logs, reviews, and incident response

Confirm the exact building and service covered by each certification or report. A corporate certificate does not automatically cover every facility, cage, or subcontractor.

## Test authorization lifecycle

Sample access requests from approval through removal. Verify identity proofing, least privilege, role or site scope, training, issue date, expiry, and approving owner. Test urgent termination and lost-badge procedures, including after-hours escalation.

Compare four populations:

1. authorized roster
2. active access cards and biometrics
3. human-resources or vendor status
4. actual entry records

Investigate stale, duplicate, generic, or never-used credentials. Provider access must also have a business reason and audit trail.

NIST SP 800-53's physical controls cover authorization, entry enforcement, monitoring, visitor records, lockable casings, and protection of transmission media. Use the controls appropriate to your risk and obligations rather than treating the document as a facility certification.

## Walk every security layer

Observe perimeter barriers, lighting, loading access, guards, alarms, identity checks, anti-passback or mantrap behavior, data-hall entry, cage construction, locks, and cabinet doors. Test only with authorization.

Look above, below, and beside the cage. Assess whether walls, mesh, raised floor, ceiling voids, neighboring cabinets, removable panels, and shared cable trays permit unintended reach. Confirm emergency egress remains safe while controls prevent unauthorized entry.

At the cabinet, verify unique keys or electronic access, hinge and side-panel exposure, key custody, spare key seals, and evidence of forced or unauthorized opening. Inspect management, console, and PDU ports as privileged access points.

## Audit tenant and network separation

Trace each customer cross-connect from its documented demarcation without disturbing live fiber. Reconcile circuit IDs, panels, ports, cable labels, and letters of authorization. Ask how technicians prevent or detect connection to the wrong tenant.

Review shared management networks, wireless access, crash carts, console equipment, temporary technician laptops, and remote-console sessions. A locked cage does not compensate for an exposed BMC or a shared management VLAN.

Validate how the provider isolates customer equipment during installation, cable work, cleaning, audits, and incident response. Check tool control and whether photographs or video can capture neighboring tenants.

## Inspect delivery and removal controls

Follow a sample package from advance authorization through loading dock, custody, staging, unpacking in the designated area, cage delivery, and inventory update. Repeat for an outbound device and failed data-bearing drive.

Verify serial or asset ID, sender and recipient, timestamps, storage duration, tamper evidence, and who can authorize removal. NIST physical controls explicitly include delivery and removal, and media controls add transport and sanitization requirements.

Equinix's documented inbound-shipment process, for example, requires an order and tracking details and describes loading-dock and collection rules. Audit the actual provider procedure against its contract, not against another provider's example.

## Test the evidence

Select a time window and reconcile:

- facility and cage access logs
- visitor and escort records
- camera or alarm events
- customer change and incident tickets
- Smart Hands orders and technician identity
- BMC, console, and network-device audit logs

Check clock synchronization before correlating events. Verify log retention, integrity, access, export, privacy, and the time allowed to request video. Ask for evidence of periodic review and sample how exceptions were closed.

Run scenarios for a terminated user, lost credential, propped door, wrong-cage request, unannounced shipment, missing spare, and after-hours hardware removal. Record preventive, detective, and response controls for each.

## Report actionable findings

For every finding, state asset or location, observed evidence, requirement, risk, owner, remediation, and due date. Distinguish absence of evidence from evidence of absence. Validate high-risk corrections and schedule recurring roster, access-log, inventory, and physical inspections.

## Conclusion

A useful colocation physical audit follows identities and assets through their full lifecycle, walks every shared boundary, reconciles independent records, and tests realistic misuse scenarios. Certification reports help define evidence, but direct scope and control testing establish tenant isolation.

## Official Documentation

- [NIST SP 800-53 Rev. 5 security and privacy controls](https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0)
- [NIST SP 800-171 Rev. 3 physical access requirements](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html)
- [Equinix Smart Hands reports](https://docs.equinix.com/smart-hands/sh-reports/)
- [Equinix inbound shipment requirements](https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/)
