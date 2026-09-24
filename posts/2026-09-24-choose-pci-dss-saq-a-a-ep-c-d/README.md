# How to Choose the Correct PCI DSS SAQ: A, A-EP, C, or D

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Compliance, Security

Description: Choose a PCI DSS SAQ from actual payment data flows, outsourcing boundaries, and eligibility evidence, including the current SAQ A script criterion.

---

Choose a Self-Assessment Questionnaire from the payment channel you actually operate. A low transaction count, a payment provider's compliance badge, or a database without card numbers does not by itself establish SAQ A eligibility.

First confirm that the organization accepting your compliance submission permits self-assessment. Your acquirer or payment brand may require a different validation method. PCI SSC's [SAQ publication guidance](https://www.pcisecuritystandards.org/wp-content/uploads/2024/10/SAQs_for_PCI_DSS_v4.0.1_Bulletin.pdf) says to confirm eligibility and submission expectations before starting the questionnaire.

## Compare the architectures

This table is a starting point, not a replacement for the complete eligibility statements in the current [PCI SSC SAQs and instructions](https://www.pcisecuritystandards.org/document_library/).

| Candidate | Typical architecture | Important boundary |
| --- | --- | --- |
| SAQ A | Card-not-present payments fully outsourced to compliant providers | Merchant systems do not electronically store, process, or transmit account data; e-commerce payment collection elements come from the provider |
| SAQ A-EP | E-commerce site influences payment collection, such as direct post | Merchant servers do not receive account data, but the merchant supplies payment-page elements |
| SAQ C | Eligible Internet-connected payment application or POS environment | No electronic account-data storage; specific connectivity restrictions; not an e-commerce SAQ |
| SAQ D | Merchant environment that does not meet another SAQ's criteria | Assess applicable requirements across the actual environment |

SAQ C-VT, B-IP, P2PE, and other SAQs also exist. A telephone-order operator using a virtual terminal should investigate C-VT rather than select C because both names contain the same letter. Service providers have their own SAQ D where self-assessment is permitted; the merchant SAQs are not interchangeable with it.

## Distinguish an iframe from direct post

Suppose the merchant serves ordinary HTML card inputs and posts their values directly from the browser to a processor. The merchant server might never receive a PAN, but the merchant created the payment collection form. This is the architectural distinction behind SAQ A-EP.

In a provider iframe or redirect integration, the provider supplies the payment collection page. PCI SSC explains this difference in [FAQ 1291](https://www.pcisecuritystandards.org/faqs/1291/). Do not classify the integration from a screenshot: visually identical fields can have different origins and data access.

Inspect field ownership, JavaScript callbacks, request destinations, and fallback paths. If card data reaches your application API, neither “we tokenize immediately” nor “we do not save it” establishes SAQ A or A-EP eligibility.

## Apply the current SAQ A script criterion

The January 2025 revision of SAQ A removed individual questions for Requirements 6.4.3, 11.6.1, and 12.3.1 and added a script-attack eligibility confirmation. These changes affected the questionnaire; they did not delete those requirements from PCI DSS. See the [PCI SSC revision announcement](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a).

For a merchant page containing an embedded provider payment form, establish how script attacks are addressed. [FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) permits appropriate protective techniques or qualifying confirmation from the compliant provider about its correctly implemented solution. That particular criterion does not apply to a pure redirect flow. All other applicable eligibility statements still matter.

## Do not use SAQ C as an e-commerce shortcut

SAQ C addresses eligible Internet-connected payment application environments, including particular POS arrangements. It is not the middle step between A-EP and D for an online store. Its criteria include no electronic account-data storage and restrictions on connections to other merchant systems and locations. PCI SSC's [self-assessment overview](https://listings.pcisecuritystandards.org/pci_security/completing_self_assessment) distinguishes these channel types.

A shop with an isolated eligible POS deployment and an independently hosted online checkout may have different architectures in different channels. Document both and obtain the submission recipient's guidance about how to report them. Do not silently omit the more complex channel from a convenient questionnaire.

## Build an eligibility evidence packet

For each channel, collect a data-flow diagram, a list of payment collection origins, the provider's relevant AOC, electronic-storage findings, and a record of operational exceptions. Check exports, customer support, virtual terminals, and incident troubleshooting: a manual workaround can invalidate assumptions drawn from the normal checkout flow.

Write each eligibility decision beside its evidence. For example, “no PAN at merchant API” should reference reviewed request schemas and synthetic test observations, rather than a developer's recollection. Record who owns rechecking the decision after an integration change.

Finally, separate questionnaire selection from control completion. Even SAQ A e-commerce sites can require ASV scans; PCI SSC's [June 2026 FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/) explicitly covers redirect and iframe merchant webpages. The correct SAQ defines the assessment to perform. Selecting it does not complete that assessment.
