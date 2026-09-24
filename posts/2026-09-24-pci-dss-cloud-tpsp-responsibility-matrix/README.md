# How to Build a PCI DSS Responsibility Matrix for Cloud Providers and Other TPSPs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Cloud, Compliance

Description: Build a PCI DSS responsibility matrix that maps cloud and other service-provider controls to concrete customer tasks, evidence, and owners.

---

A cloud provider can operate compliant infrastructure while a customer's deployment remains insecure. A responsibility matrix makes the division of work explicit: which controls the provider performs, which your team performs, and what each party must do where a requirement is shared.

PCI DSS v4.0.1 Requirement 12.8.5 requires maintaining that allocation for third-party service providers (TPSPs). Requirement 12.9.2 requires providers to support customer requests for compliance-status and responsibility information. [PCI DSS v4.0.1, 12.8.5 and 12.9.2](https://www.pcisecuritystandards.org/document_library/)

## Start at the service and deployment level

List the exact services, regions, accounts, and operating modes in use. A managed database, virtual machine, and object store distribute work differently. A provider-level “shared responsibility” diagram is useful context, but it rarely answers every PCI requirement for your deployment.

Obtain the provider's applicable AOC, service coverage information, and responsibility guidance. For AWS, Artifact provides a documented workflow for obtaining compliance reports, subject to account permissions and report terms. Downloading a report is evidence collection; it does not determine your workload's compliance. [AWS Artifact report documentation](https://docs.aws.amazon.com/artifact/latest/ug/downloading-documents.html)

Check that the evidence covers the particular service you use. Record unresolved coverage questions rather than assigning responsibility from assumptions.

## Break shared requirements into actions

A row saying “encryption: shared” hides the work. Split it into observable tasks: who protects physical media, who configures data-level protection, who controls keys, who authorizes decryption, and who verifies account-data copies.

Use columns like these:

```text
Requirement | Service/system | Provider action | Customer action
Internal owner | Required configuration | Evidence | Review trigger
```

An illustrative allocation might be:

| Control area | Provider contribution | Customer work to verify |
|---|---|---|
| Physical security | Assessed facility and hardware operations | Confirm service and location coverage |
| Network protection | Managed infrastructure capabilities | Configure permitted flows and review rules |
| Identity | Authentication and access-control features | Assign roles, enforce access policy, review accounts |
| Logging | Generate supported service events | Enable required logs, protect them, review alerts |
| Data lifecycle | Storage and deletion mechanisms | Define retention, cover copies, verify disposal |

These are questions for a deployment review, not assertions about every cloud service. Replace each generic contribution with the provider's actual documented commitment and your configuration evidence.

## Keep accountability inside your organization

Name the team that owns each customer action and one accountable owner for the complete control. Avoid assigning your internal responsibility to “the cloud.” For a shared logging control, platform engineers may enable collection while security operations reviews alerts; somebody must verify the entire chain.

Include the handoff mechanism and failure response. If a provider supplies events only after a customer enables a feature, the row should include that prerequisite, the configuration check, and an alert for disabled delivery.

Trace dependencies between providers. A managed application might rely on a cloud host, identity platform, and external monitoring service. Record which party obtains evidence for each nested service and how gaps are surfaced to you.

## Keep agreements separate from evidence

A responsibility matrix does not replace the written acknowledgment required by 12.8.2. The standard distinguishes contractual acknowledgment from an AOC, policy statement, or matrix that is not part of a written agreement. Maintain all required records and connect them. [PCI DSS v4.0.1, 12.8.2](https://www.pcisecuritystandards.org/document_library/)

Likewise, an AOC does not make an unconfigured customer feature operational. For each shared row, retain provider evidence and customer evidence. PCI SSC FAQ 1576 describes the information providers are expected to share, including responsibility details. [PCI SSC FAQ 1576](https://www.pcisecuritystandards.org/faqs/1576/)

## Validate rows through an operational walkthrough

Choose a realistic event such as a disabled audit stream or an emergency key rotation. Walk through detection, action, provider escalation, customer verification, and evidence retention. The matrix should identify the actors without an improvised meeting.

Mark gaps explicitly: unknown, awaiting provider evidence, misconfigured, or unassigned. Assign resolution work and avoid claiming the associated control is complete until the necessary pieces are demonstrated.

## Maintain the matrix when architecture changes

Review affected rows whenever a service tier, region, responsibility agreement, deployment model, or security feature changes. Monitor TPSP compliance status at least every 12 months under 12.8.4, and keep the allocation current as part of ongoing provider oversight. [PCI DSS v4.0.1, 12.8](https://www.pcisecuritystandards.org/document_library/)

A useful matrix lets an engineer point to a production system, name the responsible parties, and retrieve evidence for both sides of a shared control. That is a much stronger result than a spreadsheet filled with checkmarks under the provider's name.
