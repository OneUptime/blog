# Validation Summary: How to Determine Whether Hosted Fields Put Your E-Commerce Site in SAQ A or A-EP

## Status

validated

## Post Type

Technical guide. Although it contains no executable code, commands, or configuration snippets, it provides substantive implementation guidance about frame origins, browser callbacks, tokenization, network data flows, and payment integration assessment.

## Technologies Covered

- PCI DSS and SAQ A / SAQ A-EP eligibility
- Braintree Hosted Fields and JavaScript SDK v3
- HTML iframes, DOM inspection, origins, and browser isolation
- Payment tokenization and payment-method nonces
- Payment-page script security and account-data handling

## Sources Consulted

- [PCI SSC FAQ 1291: Direct Post versus iframe/redirect eligibility](https://www.pcisecuritystandards.org/faqs/1291/).
- [PCI SSC FAQ 1438: Payment-page boundaries for iframe integrations](https://www.pcisecuritystandards.org/faqs/1438/).
- [PCI SSC FAQ 1588: SAQ A script eligibility criteria](https://www.pcisecuritystandards.org/faqs/1588/).
- [PCI SSC announcement of revised SAQ A](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a).
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/).
- [Braintree Hosted Fields overview, JavaScript v3](https://developer.paypal.com/braintree/docs/guides/hosted-fields/overview/javascript/v3).
- [Braintree Hosted Fields introduction](https://developer.paypal.com/braintree/docs/start/hosted-fields).
- [Braintree Hosted Fields events, JavaScript v3](https://developer.paypal.com/braintree/docs/guides/hosted-fields/events/javascript/v3).
- [WHATWG HTML Standard: Origins and browser security](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin).

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. There are no code examples, terminal commands, or configuration snippets to execute or syntax-check.
- FAQ 1291 supports the distinction between provider-originated payment collection and merchant-generated direct-post collection. The matrix correctly presents investigation branches subject to all eligibility criteria, rather than automatic questionnaire assignments.
- FAQ 1438 supports separating surrounding merchant content from elements that collect or process payment card data. Inspecting actual elements and data flows is appropriate; the absence of PAN in server logs alone cannot establish eligibility.
- Braintree documents iframe-based collection, direct transmission to Braintree, and a payment-method nonce for merchant use. Its events documentation supports using field validity and state information for merchant UI updates. The post appropriately avoids extending these product-specific properties to every tokenizer.
- Browser origin isolation supports the distinction between merchant DOM inputs and provider-controlled cross-origin inputs. The advice to inspect callbacks and reporting paths remains relevant because intentionally exposed data or merchant-owned collection can cross those boundaries.
- FAQ 1588 identifies PCI DSS v4.0.1 SAQ A r1 and confirms the embedded-form script eligibility condition and its two confirmation approaches. Provider confirmation must cover protection against script attacks for the solution implemented according to provider instructions. This particular condition does not apply to pure redirects. The revised SAQ was published in January 2025; the preceding version retired on 31 March 2025.
- Reviewing alternate checkout modes, exports, support channels, and provider assurances is appropriate scoping advice. The post correctly leaves the final questionnaire decision to the compliance-accepting entity and requires checking every eligibility statement.
- All six technical reference links in the post resolved to the intended official resources. The author-profile link is attribution, not technical evidence.
- Review limitation: the Document Library landing page was accessible, but attempts to retrieve the current SAQ A r1 and SAQ A-EP PDFs through the browsing tool returned errors. Eligibility claims were checked against the accessible official PCI SSC FAQs and revision announcement; this review does not claim a line-by-line audit of those PDFs or certification of any deployed checkout.
