# How to Decide Whether an Identity, DNS, Code-Hosting, or Monitoring Vendor Is a PCI DSS TPSP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Security, Compliance

Description: Evaluate identity, DNS, repository, and monitoring vendors as PCI DSS service providers by their actual access, security impact, and outsourced control responsibilities.

---

A vendor does not have to receive card numbers to affect their security. An identity platform can authorize privileged access, a DNS service can redirect checkout, and a deployment system can replace payment code. The PCI DSS question is what the service can do in your architecture.

PCI SSC explicitly includes providers with direct or indirect CDE access, providers performing PCI requirements for another entity, and providers facilitating another entity's payment-data processing. Use those pathways to evaluate each service rather than classifying vendors by product category. [PCI SSC FAQ 1579](https://www.pcisecuritystandards.org/faqs/1579/)

## Trace the impact path

For each vendor, record the service instance, integrations, permissions, data received, and control responsibilities. Then follow a concrete failure or compromise scenario:

```text
Vendor capability -> affected identity, route, code, or control
                  -> access to or impact on account-data security
```

The analysis should include administrative and recovery paths. A provider with no normal production access might still reset a credential, alter a deployment trust relationship, or operate a support channel capable of changing configuration.

Do not equate every business dependency with PCI relevance. Establish the actual connection to account-data security and retain the evidence behind the decision.

## Evaluate four common services

**Identity.** Determine whether the service authenticates administrators, supplies authorization claims, or manages recovery for systems in scope. Examine federation mappings, privileged groups, emergency access, and account-recovery permissions. An unrelated identity tenant used only by a segregated marketing system needs its own assessment; the vendor name alone does not decide the answer.

**DNS.** Identify the zones and records managed by the vendor. Ask whether changes can redirect a payment page, replace an embedded-provider destination, or affect trusted administration. Include registrar access and delegated control. A public zone containing only unrelated services can have a different conclusion from the zone serving checkout.

**Code hosting and delivery.** Trace who can change protected branches, release artifacts, CI workflows, signing material, and production credentials. A repository that feeds payment deployments can be security-impacting even if its contents never include PAN. A detached source mirror without a trusted deployment path presents a different boundary.

**Monitoring.** Check whether the vendor receives account data, operates privileged agents, or performs required security monitoring on your behalf. A service ingesting harmless aggregate metrics with no access or required-control role may be treated differently from a managed security service responsible for detecting CDE compromise.

These are engineering decision examples based on the service-provider criteria, not blanket PCI SSC classifications of particular vendors.

## Document inclusion and exclusion symmetrically

Use a short decision record:

| Field | Example evidence |
|---|---|
| Service boundary | Tenant, repository, zone, or agent population |
| Access | Roles, API scopes, administrative and recovery paths |
| Security effect | Deployment, identity, routing, or required-control dependency |
| Decision | TPSP or excluded for the documented service |
| Basis | Architecture and permission evidence |
| Change triggers | New integration, broader permissions, required-control assignment |

An exclusion should explain what prevents impact. “No PAN stored” alone does not establish it. Validate claimed separation with configurations and access tests appropriate to the architecture.

For non-data-handling providers, the assessment scope still includes the people, processes, and technology delivering the relevant service, with requirement applicability determined from access and function. [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/)

## Apply the specific exclusions carefully

PCI SSC identifies a narrow exclusion for third-party script providers for Requirements 12.8 and 12.9 in an entity's e-commerce assessment: their only service must be providing scripts unrelated to payment processing and their scripts must be unable to affect cardholder-data or sensitive-authentication-data security. Both conditions matter. A script's marketing purpose alone does not establish the second condition. [PCI SSC FAQ 1592](https://www.pcisecuritystandards.org/faqs/1592/)

ASVs and QSAs are also not TPSPs for Requirements 12.8 and 12.9 when their only services are ASV scanning and PCI DSS assessments respectively. Additional services can change that conclusion. Normal supplier due diligence still applies. [PCI SSC FAQ 1598](https://www.pcisecuritystandards.org/faqs/1598/)

## Turn the classification into provider oversight

For included providers, maintain the service inventory, appropriate agreement, due-diligence record, compliance-status monitoring, and responsibility allocation required by 12.8. Obtain evidence for controls you outsource.

Requirement 12.8 does not itself require every provider to hold an independently validated AOC. It requires oversight; when the provider performs a requirement for you, that requirement still needs sufficient evidence for your assessment. [PCI SSC FAQ 1312](https://www.pcisecuritystandards.org/faqs/1312/)

Revisit the decision when capabilities change. Granting a monitoring agent remote-command access or enabling a repository deployment integration can convert yesterday's exclusion into today's security-impacting service. Make that review part of the integration change, while the access model is still visible to the engineers implementing it.
