# How to Map Cardholder Data Flows and Define Your PCI DSS Scope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Compliance

Description: Map payment channels, data copies, administrative dependencies, and segmentation boundaries to produce a defensible PCI DSS scope.

---

A PCI DSS scope diagram should answer two questions: where can payment account data travel, and which systems can change the security of those paths? A diagram containing only a payment API and its database misses the systems that deploy code, issue identities, decrypt records, or receive troubleshooting exports.

[PCI SSC describes PCI DSS applicability](https://www.pcisecuritystandards.org/standards/pci-dss/) as including systems that handle account data and environments that can affect the cardholder data environment. Start with observed transactions and permissions, then draw the boundary around the evidence.

## Build a payment-channel inventory

List every way the organization takes a payment: hosted web checkout, embedded fields, mobile application, telephone order, retail terminal, subscription renewal, and manually entered invoice payment. Treat refunds, chargebacks, reconciliation, and failed payment support as separate branches of those flows.

For each channel, identify its owner, processor, integration method, production domains, and administrative tools. Do not assume a mobile SDK and a website using the same processor have identical data paths.

Use a register such as this example:

| Flow | Data at entry | First recipient | Later copies to investigate |
| --- | --- | --- | --- |
| Hosted checkout | PAN and authentication data | Processor page | Processor exports, support attachments |
| Recurring billing | Payment-method reference | Billing application | Jobs, retry queues, audit events |
| Telephone payment | Spoken account data | Agent or payment service | Call recording, transcription, desktop recording |
| Refund | Transaction identifier | Support application | Case notes, reports, provider dashboard |

PAN means primary account number. Distinguish it from sensitive authentication data such as card verification codes, full track data, and PIN information. Their permitted handling is different; labeling everything “payment data” conceals important retention decisions.

## Trace a complete transaction

Use processor-approved synthetic payment details in a test environment. Observe the browser's network destinations and trace the operation through gateways, services, queues, databases, and callbacks. Inspect failure cases as well as success: validation errors and timeout retries often copy more data than the normal path.

Write one row per edge:

```text
flow_id: checkout-card
source: provider-hosted card fields
destination: provider tokenization endpoint
data: PAN, expiration, card verification code
transport: HTTPS
merchant_server_receives: payment-method reference only
evidence: integration version and reviewed test capture
owner: payments engineering
```

Keep any permitted captures containing real account data inside the appropriately controlled environment and subject to retention and secure-deletion controls. Merchants must not retain real sensitive authentication data, including card verification codes, after authorization, even in encrypted captures. A scoping workshop should not create a new card-data repository in a shared document.

Now look for data leaving the expected path. Review request logging, distributed traces, browser session replay, crash reports, database exports, analytics events, backups, and support tickets. An architecture diagram describes intent; these checks establish what actually happens.

## Add the systems that can change the path

Draw a second layer for administrative and security dependencies. Include identity providers, deployment pipelines, source repositories, artifact registries, secrets and key management, network controllers, monitoring agents, and remote support access where they can affect the CDE.

For each dependency, ask what a compromised account could do. Could a deployment token replace checkout JavaScript? Could an administrator change a firewall policy? Could a backup operator restore PAN into another account? These relationships matter even when no card number normally appears in that system.

Do not declare an entire corporate platform in scope or out of scope by its product name. Record the actual permissions and trust relationships. The [PCI SSC modern-network scoping guidance](https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures) specifically addresses cloud inventories, microsegmentation, and modern architectures; a cloud account boundary alone does not settle the analysis.

## Explain each exclusion

For a proposed out-of-scope system, record why it cannot receive account data or affect CDE security, which controls provide isolation, and how that conclusion was tested. A useful decision record includes the denied network paths and denied identity privileges, rather than only a diagram color.

Keep data-flow diagrams distinct from network diagrams. The former explain data transformations and destinations; the latter explain connections, trust boundaries, and segmentation. Reference the same asset identifiers in both so a reviewer can join them.

For outsourced payment channels, retain the provider's relevant Attestation of Compliance and a responsibility allocation. Outsourcing changes who performs controls; it does not establish that the merchant has no remaining responsibilities. PCI SSC explicitly confirms that a [SAQ A merchant website remains in scope](https://www.pcisecuritystandards.org/faqs/1332/).

## Make scope maintenance operational

Attach the inventory and diagrams to changes that introduce payment fields, new processors, telemetry exports, network links, or administrative access. Require the owner to update the relevant flow before deploying such a change.

Requirements 1.2.3 and 1.2.4 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) address network and data-flow diagrams. Under 12.5.2, the entity documents and confirms scope at least every 12 months and after significant changes; service providers have a six-month frequency under 12.5.2.1. This is the entity's own process, separate from the assessor's scoping review.

Finish with a dated scope record: payment channels, systems, locations, providers, exclusions, evidence, and unresolved questions. Review it with the team responsible for the PCI assessment. The useful outcome is an explainable boundary that engineers can maintain as the payment system evolves.
