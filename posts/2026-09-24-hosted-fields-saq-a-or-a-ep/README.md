# How to Determine Whether Hosted Fields Put Your E-Commerce Site in SAQ A or A-EP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Web Security, Compliance

Description: Determine SAQ A versus A-EP eligibility by inspecting hosted-field origins, browser data access, server requests, and provider integration conditions.

---

“Hosted fields” describes several integration designs. Some render provider-controlled card inputs in cross-origin iframes. Others provide JavaScript that reads merchant-owned inputs and tokenizes their contents. The branding can be similar while the PCI DSS implications differ.

Classify the implemented data flow before selecting a questionnaire. PCI SSC's [FAQ 1291](https://www.pcisecuritystandards.org/faqs/1291/) explains why provider iframe collection and merchant-generated direct-post collection lead to different SAQ eligibility considerations.

## Identify who owns each payment element

Open the checkout in a test environment with approved synthetic card details. Inspect the actual DOM and frame tree; the rendered appearance is insufficient.

For each field, record its host document, origin, script owner, and submission destination. Include PAN, card verification code, expiration, and any other element used to collect or process account data. Also inspect validation functions and callbacks: merchant code receiving the full PAN means the provider iframe label does not describe the whole implementation.

Use a small review matrix:

| Observation | Likely direction to investigate |
| --- | --- |
| Provider-controlled card fields in provider iframes; parent gets a reference | SAQ A, subject to every eligibility criterion |
| Merchant HTML collects card data and posts directly to provider | SAQ A-EP, subject to every eligibility criterion |
| Merchant API receives raw card data before calling the provider | Neither A nor A-EP; investigate the applicable broader assessment |
| Different modes across checkout pages | Assess each deployed mode and the combined environment |

These are investigation branches, not automatic eligibility decisions. Any disqualifying criterion still overrides the visual integration pattern.

## Compare against an actual vendor implementation

Braintree's [Hosted Fields overview](https://developer.paypal.com/braintree/docs/guides/hosted-fields/overview/javascript/v3) describes provider iframes for sensitive payment fields. Its [integration introduction](https://developer.paypal.com/braintree/docs/start/hosted-fields) explains that raw payment data goes directly to Braintree and the merchant receives a payment-method nonce.

That is evidence about this product and its supported implementation. It is not proof that a homegrown JavaScript tokenizer or a different provider's similarly named feature has the same architecture.

Capture the integration mode and supported version in your assessment notes. If the vendor offers both a hosted iframe mode and a direct card-tokenization API, ensure the engineering team has not mixed them across desktop, mobile, and fallback templates.

## Separate merchant layout from card capture

A merchant can supply surrounding content without supplying the payment collection fields. PCI SSC's [FAQ 1438](https://www.pcisecuritystandards.org/faqs/1438/) explains this distinction for iframe payment pages.

For example, an order summary beside an embedded provider form is different from a merchant-created PAN input that is later transformed by JavaScript. Similarly, receiving a validation status such as “incomplete” is different from receiving the field's raw value.

Inspect accessibility enhancements, custom formatters, autofill workarounds, and client-side error reporting. A helper introduced to improve the interface can accidentally copy account data into application state, an analytics event, or an exception object.

Do not rely solely on the fact that the server logs contain no PAN. SAQ A versus A-EP also depends on the origin of the payment collection elements. Server-side tokenization after receiving PAN does not repair an eligibility boundary that has already been crossed.

## Apply the post-2025 SAQ A condition

For embedded payment forms, [PCI SSC FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) explains the script-attack eligibility confirmation in SAQ A r1. Establish either appropriate protective techniques or qualifying provider confirmation for the correctly implemented solution.

Ask the provider to identify which integration mode its assurance covers and what merchant configuration is necessary. Then document how the deployed checkout satisfies those conditions. A compliance badge without this mapping does not resolve the script question.

Review parent-page script publishers as part of the implementation. A tag-management account or compromised deployment credential may let an attacker replace the form even when legitimate card entry occurs inside provider iframes.

## Check operational exceptions before deciding

Run through failed validation, customer retries, saved-card replacement, subscription signup, and manual customer-support payments. Check every locale and active experiment. The least-used checkout template can still handle real account data.

Review whether the application can request full PAN from the provider, whether exported reports contain account data, and whether support users collect card information through another channel. Those paths can change the overall assessment even when the primary web form is eligible for a reduced SAQ.

Prepare a concise decision record containing the frame-origin matrix, observed network destinations, callback schemas, provider AOC, script-protection evidence, and any exceptions. Compare it with all eligibility statements in the current [PCI SSC SAQ documents](https://www.pcisecuritystandards.org/document_library/), then confirm the proposed questionnaire with the organization receiving the compliance submission.

Keep this record tied to the checkout release process. Reclassify the integration whenever ownership of the payment elements or handling of their values changes.
