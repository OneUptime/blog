# How to Validate a Payment Provider’s PCI Status and Collect AOC Evidence

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Compliance, Security

Description: Review payment-provider PCI evidence by legal entity, service scope, assessment status, customer responsibilities, and renewal workflow.

---

A payment provider's PCI logo does not tell you whether the product, region, or operating model you use was assessed. Useful evidence connects your actual integration to the provider's assessment and explains the controls your company still operates.

PCI SSC expects a third-party service provider (TPSP) to supply sufficient evidence covering the relevant services and requirements. An applicable Attestation of Compliance (AOC) is a common starting point. A merchant SAQ A or its AOC is not adequate evidence for a provider's services to merchant customers. [PCI SSC FAQ 1065](https://www.pcisecuritystandards.org/faqs/1065/)

## Identify the service before requesting documents

Write down the contracting legal entity, product name, implementation mode, account or tenant identifier, and regions in use. Attach a small data-flow diagram showing which party serves the payment page, receives card data, returns tokens, stores records, and provides administrative access.

For example, a provider may offer hosted checkout, a direct API, fraud analytics, and a separate reporting service. Evidence for one offering does not automatically cover all four. An acquired subsidiary can also have a different assessment boundary from the parent company.

Request documents through the provider's official trust portal or support channel. Verify the contact and document origin; do not accept an attachment merely because its filename contains “PCI.” Keep the original file and record when and how it was obtained.

## Review the AOC against your integration

Use a review worksheet with explicit outcomes:

| Review area | Question to answer |
|---|---|
| Entity | Does the assessed entity match the service provider you engaged? |
| Scope | Are the relevant services, locations, and platforms covered? |
| Assessment | Which PCI DSS version and assessment completion date are recorded? |
| Result | Is the stated outcome suitable for the controls you depend on? |
| Exceptions | Do exclusions or untested areas affect your deployment? |
| Responsibilities | What configuration and operational work remains with your team? |

Do not infer that “Level 1” describes a particular technical feature or automatically covers every product. Read the assessment scope and outcome. Where the AOC lacks enough detail, ask for relevant sections of the Report on Compliance (ROC) or SAQ D for Service Providers, or specific control evidence. [PCI SSC FAQ 1576](https://www.pcisecuritystandards.org/faqs/1576/)

Compare the deployment date and current service architecture with the assessed environment. A new payment integration, region, or managed feature introduced after the assessment needs a specific explanation of coverage, not a silent assumption.

## Keep three evidence types separate

An AOC, a responsibility matrix, and a contractual acknowledgment answer different questions.

The AOC supports assessment status and scope. The matrix allocates PCI requirements between provider, customer, and shared work. The written agreement acknowledges the provider's responsibility for the account data it handles or can affect. Requirement 12.8.2 explicitly distinguishes that acknowledgment from an AOC or an informal website statement. [PCI DSS v4.0.1, Requirements 12.8.2 and 12.8.5](https://www.pcisecuritystandards.org/document_library/)

Give each customer responsibility an internal owner. For example, a provider can secure its hosted form while your engineers remain responsible for safely integrating it and protecting merchant-controlled administration. Link those responsibilities to configuration evidence and operating procedures.

## Handle missing and aging evidence honestly

If a provider has no applicable AOC, it may supply specific evidence for the relevant requirements so your assessor can evaluate the service. Do not automatically classify every provider without an AOC as prohibited: Requirement 12.8 requires monitoring compliance status, while controls outsourced to the provider still need adequate evidence in your assessment. [PCI SSC FAQ 1312](https://www.pcisecuritystandards.org/faqs/1312/)

Create an evidence gap with an owner and resolution date. Record which assessment conclusions are blocked by the gap. A supplier's promise to send a report later should not appear as a completed control today.

Monitor TPSP compliance status at least once every 12 months. Avoid inventing a universal AOC expiration rule. FAQ 1601 explains that evidence an assessor considers valid when reviewed remains valid for that assessment, alongside expectations for timely documentation updates. Acceptance questions belong with the organization managing your compliance program. [PCI SSC FAQ 1601](https://www.pcisecuritystandards.org/faqs/1601/)

## Store the decision, not just the PDF

Keep the reviewed AOC, scope comparison, matrix, agreement reference, unresolved questions, reviewer, and next review date together. Restrict access according to the provider's sharing terms and your own evidence policy.

The finished record should let another engineer answer a practical question: “Does this evidence cover the payment service running in our production environment, and which controls must we still demonstrate?” If answering that requires remembering a vendor sales call, the review is not finished.
