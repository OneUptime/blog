# How to Identify PCI DSS Merchant and Service Provider Roles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Compliance, Security

Description: Determine PCI DSS merchant and service-provider roles by payment activity, customer services, security impact, and the appropriate validation path.

---

A company can be a PCI DSS merchant for one activity and a service provider for another. The distinction depends on what the company does with payment data and whose payment environment its services affect. It is not determined by whether the company calls itself a fintech, software vendor, or platform.

The PCI SSC glossary defines a merchant around accepting payment cards for goods or services. Its service-provider definition includes processing, storing, or transmitting account data for another entity, and services that control or could affect the security of that data. [PCI SSC glossary](https://www.pcisecuritystandards.org/glossary/)

## Start with activities and counterparties

List each revenue and operational flow independently. For every flow, identify the seller, customer, contracting entity, payment recipient, provider of the payment interface, and systems receiving or affecting account data.

Consider an infrastructure company that accepts cards for its monthly subscription and operates managed firewalls for customers. Subscription billing makes it a merchant. Managing controls that protect a customer's cardholder data environment (CDE) can make it a service provider for that service, even when the company never sees a card number.

PCI SSC explicitly includes services with direct or indirect access to a CDE, services meeting PCI requirements for another entity, and services facilitating another entity's payment processing. [PCI SSC FAQ 1579](https://www.pcisecuritystandards.org/faqs/1579/)

## Classify the services with evidence

Use an activity register rather than one label for the entire organization:

| Activity | Role to evaluate | Evidence to examine |
|---|---|---|
| Selling the company's own subscriptions | Merchant | Acquirer arrangement and checkout flow |
| Storing customers' payment records for them | Service provider | Data stores, contracts, access model |
| Operating a customer's payment infrastructure | Service provider | Administrative access and control responsibilities |
| Hosting an unrelated public information site | Depends on actual impact | Connectivity, deployment rights, dependencies |
| Providing only a public communications link | Specific glossary exclusion may apply | Exact service boundary |

These examples are prompts for analysis, not automatic determinations. A hosting offering can include management functions beyond a simple network link. A software vendor may have support access or remote update capabilities that materially change the answer.

For a marketplace, document each party's actual responsibilities. Contractual terms such as “merchant of record” help explain the commercial arrangement, but should not replace tracing how the platform controls checkout or handles another entity's account data.

## Scope each provider service

If a service can affect account-data security without directly handling the data, its assessment still covers the relevant people, processes, and technology. Applicable requirements depend on the service and access. Requirements deemed not applicable need documented justification. [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/)

Walk through support tooling, deployment systems, privileged identities, network administration, secrets, and incident response. The service boundary should explain which shared corporate systems can affect delivery. Do not omit a deployment platform simply because payment data is absent from its database.

For dual-role organizations, show whether merchant billing and provider operations share infrastructure or security services. Separation may simplify scope, but a diagram alone does not demonstrate effective isolation.

## Choose validation with the accepting entity

Merchant SAQs have eligibility criteria for particular merchant environments. They are not a shortcut for validating service-provider activities. A provider generally uses a ROC or SAQ D for Service Providers as directed by the organization managing its compliance program. A merchant SAQ A AOC does not demonstrate the provider controls its customers depend on. [PCI SSC FAQ 1065](https://www.pcisecuritystandards.org/faqs/1065/)

Do not infer validation levels or reporting requirements from the label alone. Payment brands and acquirers manage compliance programs, and requirements can depend on the relationship and activity. Confirm the reporting route before choosing assessment documents.

For internal enterprise service functions, PCI SSC allows separate assessment as an internal service provider or inclusion within each corporate entity's assessment. The appropriate provider validation tool remains SAQ D for Service Providers or a ROC, as directed by the accepting entity. [PCI SSC FAQ 1602](https://www.pcisecuritystandards.org/faqs/1602/)

## Record and revisit the decision

Retain the activity register, data-flow diagrams, contracts, access analysis, role conclusion, applicable requirements, and validation decision. Assign an owner for changes such as adding managed operations, launching a payment feature, or granting support access into customer environments.

A useful final statement is precise: “We are a merchant for subscription billing and a service provider for the managed network service described in this scope.” That statement tells engineers what to maintain, tells customers which evidence to request, and prevents one business activity's assessment from being mistaken for coverage of another.
