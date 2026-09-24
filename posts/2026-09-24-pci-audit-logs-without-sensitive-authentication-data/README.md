# How to Build PCI DSS Audit Logs Without Recording Sensitive Authentication Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Logging, Security Monitoring

Description: Design complete PCI DSS security audit events, exclude payment payloads, protect log integrity, and verify retention, review, and delivery failures.

---

An audit event should establish who performed an action, what resource was affected, when it happened, where it originated, and whether it succeeded. It should not reproduce the payment payload used by that action.

This separation is essential for payment systems. Card verification codes and other sensitive authentication data cannot be retained after authorization by an ordinary merchant, even inside encrypted audit storage. [PCI SSC FAQ 1280](https://www.pcisecuritystandards.org/faqs/1280/) makes clear that encryption does not create a retention exception.

## Design events around actions and identities

Define an event catalog covering card-data access, administrative actions, log access, failed logical access, identity and privilege changes, logging lifecycle events, and system-level object creation or deletion. These correspond to the event coverage in Requirement 10.2.1 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/).

For each event, capture the fields needed by 10.2.2 using stable identifiers rather than account data. An example is:

```json
{
  "event_id": "audit_example",
  "occurred_at": "2026-09-24T09:30:00Z",
  "actor_id": "staff_example",
  "action": "payment_record.view",
  "resource_type": "payment_record",
  "resource_id": "record_example",
  "outcome": "denied",
  "source_ip": "192.0.2.24",
  "service": "support-api",
  "authorization_rule": "missing_pan_view_permission"
}
```

The IP is a documentation example. In production, derive origin information from a trusted connection path; do not blindly trust an arbitrary client-supplied forwarding header.

Keep free text and serialized request objects out of this schema. A generic `details` object is a common route for PAN, CVV, authentication tokens, or exception-local variables to enter an otherwise careful audit design.

## Cover direct and indirect access

Application audit logs may identify the real operator better than a database log showing one shared application identity. However, a direct database administrator connection can bypass the application entirely.

Map each access path to an authoritative event source. Use application, operating-system, database, cloud-control-plane, and identity logs as needed to cover the behavior. [PCI SSC FAQ 1081](https://www.pcisecuritystandards.org/faqs/1081/) explains that the required complete record can come from an appropriate combination; every layer need not duplicate the same event without purpose.

Include interactive use of application or system accounts and actions taken through role assumption. Preserve the original individual identity so an investigator can distinguish two people using the same elevated role.

## Keep security audit delivery independent of trace sampling

Distributed tracing helps explain performance, but sampled traces can omit events that an audit trail must retain. Publish security audit events through a delivery path whose reliability and retention match the requirement.

Use durable buffering with bounded access and monitor queue growth, rejected events, unavailable destinations, and dropped messages. Ensure buffers contain only the approved schema. Decide explicitly how the application behaves when required audit delivery is unavailable; that decision should be reviewed against the action's risk and operational requirements.

An asynchronous API returning success is not proof that the event reached durable storage. Measure delivery and periodically reconcile expected event counts or controlled test events with the destination.

## Protect storage and administrative control

Limit read access to audit records, protect them from unauthorized changes, back them up appropriately, and detect alteration in accordance with Requirement 10.3. Separate application write permissions from permissions to delete or change retention.

Where immutable storage is used, prevent sensitive payloads at ingestion. An accidental CVV in a locked archive is harder to remediate than one rejected before persistence. Do not assume a retention lock replaces the rest of the log-protection controls.

Keep clocks synchronized under Requirement 10.6 so cross-system timelines are meaningful. Preserve both event time and ingestion time when that helps identify delayed delivery, without treating them as interchangeable.

## Make retention and review verifiable

Requirement 10.5.1 calls for at least 12 months of audit history, with the latest three months immediately available for analysis. Test an actual query and historical retrieval rather than relying only on a storage lifecycle configuration.

Requirement 10.4.1 identifies logs requiring at least daily review, including security events and the specified critical, security-function, and account-data systems. Automated review mechanisms under 10.4.1.1 are now effective. Other system-log review frequencies follow the targeted-risk-analysis process under 10.4.2.1.

Connect suspicious events and pipeline failures to an owned response process. A dashboard that nobody reviews is not an operational review workflow.

Exercise a denied PAN-view request, an administrator role change, and a stopped log collector using synthetic records. Confirm event completeness, absence of sensitive authentication data, arrival, alerting, and retrieval. Keep the evidence with the event catalog so future changes can be checked against the same expectations.
