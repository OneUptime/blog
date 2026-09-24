# PCI DSS 4.0.1: Payment-Page Scripts and Change Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Security, Compliance

Description: Implement payment-page script authorization, integrity checks, and browser-visible tamper detection while accounting for the revised SAQ A eligibility rules.

---

Payment-page security requires knowing which code runs in the customer's browser and noticing when that behavior changes. A clean repository does not establish that a tag manager, third-party script, or compromised delivery path served the expected page.

PCI DSS v4.0.1 separates script management in Requirement 6.4.3 from change and tamper detection in Requirement 11.6.1. Their applicable controls became effective on 31 March 2025. Build an implementation that records both the approved design and the browser-visible result. [PCI DSS v4.0.1, Requirements 6.4.3 and 11.6.1](https://www.pcisecuritystandards.org/document_library/)

## Establish which validation path applies

Do not begin with an outdated SAQ A checklist. The revised SAQ A removed those two requirements as individual questionnaire entries and introduced an eligibility condition addressing script attacks for merchants using embedded payment forms. PCI SSC FAQ 1588 explains how merchants can support that condition, including appropriate technical protections or confirmation from their compliant payment provider about its securely implemented solution. The particular condition does not apply to redirect-only or fully outsourced payment-link arrangements. Other SAQ eligibility criteria still apply. [PCI SSC FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/)

The full standard's requirements and other applicable validation paths remain relevant. Record the checkout architecture, selected questionnaire or assessment path, and agreement with the compliance-accepting entity before deciding which evidence to collect.

## Inventory execution, not just source files

Use browser observations from each payment flow: guest checkout, signed-in checkout, different locales, consent states, and payment methods. Include scripts inserted by other scripts, tag-manager containers, and conditional experiments.

Maintain a record like this:

```yaml
script_id: checkout-address-helper
owner: checkout-team
loaded_by: checkout-template
pages: [guest-checkout, signed-in-checkout]
purpose: normalize billing-address input
authorization: change-482
integrity_method: reviewed immutable build with pinned digest
review_trigger: release-or-dependency-change
```

This is an engineering example, not a complete compliance template. The required inventory needs a written business or technical justification for each necessary script, alongside methods for authorization and integrity. Third- and fourth-party scripts belong in the analysis. For an embedded provider form, distinguish the merchant's parent-page scripts from scripts inside the provider-controlled form. [PCI DSS v4.0.1, 6.4.3](https://www.pcisecuritystandards.org/document_library/)

Remove scripts that have no checkout purpose. A marketing experiment that is harmless on a landing page may create unnecessary exposure on a page that embeds a payment form.

## Choose integrity mechanisms that fit the scripts

For immutable resources, Subresource Integrity lets the browser compare the downloaded resource with an expected digest. Cross-origin SRI also requires compatible CORS behavior. A script provider that changes bytes at a stable URL needs a different release or integrity strategy; pinning an old digest will block an otherwise legitimate update. [Mozilla SRI documentation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)

Use Content Security Policy deliberately. Narrow script sources and frame destinations, and manage any nonces or hashes through the application. Test report-only policies before enforcement, then review actual violations. A broad domain allowlist does not establish the integrity of every script delivered from that domain. [Mozilla CSP documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)

Document how the chosen combination covers each inventory entry. A product's “PCI ready” setting is not a substitute for that coverage mapping.

## Detect what the browser receives

Requirement 11.6.1 addresses unauthorized changes to security-impacting HTTP headers and payment-page script contents as received by the browser. It permits operation at least weekly or at a frequency justified by a targeted risk analysis under 12.3.1. That flexibility is specific; it is not an automatic monthly allowance. [PCI DSS v4.0.1, 11.6.1](https://www.pcisecuritystandards.org/document_library/)

Monitor representative production routes, geography-dependent responses, and third-party dependencies. Compare results with an approved baseline and route alerts to someone who can investigate. Repository file monitoring alone misses changes made by external systems at delivery time.

Keep detection failures visible. A monitor that cannot load checkout, loses authentication, or stops receiving telemetry should generate an operational alert rather than silently retaining yesterday's result.

## Test authorization and response together

In an authorized test environment, introduce an unapproved script, alter a monitored header, and change a pinned resource. Verify the relevant preventive behavior, alert, ticket, and escalation. Use synthetic checkout data and avoid collecting live card numbers in captures.

For legitimate releases, link baseline approval to the change record. Do not automatically approve every detected difference. Close the implementation only when engineers can explain a script's purpose, demonstrate its integrity mechanism, and show how an unexpected browser-visible change reaches incident responders.
