# How to Tokenize Card Data So Your Application Never Stores the PAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Tokenization, Data Security

Description: Design provider-side card collection and reusable payment references so merchant applications avoid receiving PAN and cannot detokenize stored references.

---

Tokenization reduces exposure when the card number goes directly to a payment provider and the application receives a substitute reference. Sending a PAN through your API and replacing it before the database write still leaves your API, its memory, and its data path handling cardholder data.

Design the collection boundary first. Then decide how tokens are stored, authorized, reused, and retired. A token is not automatically harmless: its ability to retrieve PAN or initiate payments depends on the particular system.

## Keep collection outside the application

Use a supported provider-hosted checkout or provider-hosted card fields. The provider should receive the card number and verification code directly from the customer's browser. Your server should receive a documented reference and only the display metadata needed by the product.

For example, [Braintree Hosted Fields](https://developer.paypal.com/braintree/docs/start/hosted-fields) sends card details directly to Braintree and returns a payment-method nonce. A nonce is a particular provider's short-lived integration object; do not assume every token is reusable or interchangeable with a stored payment-method identifier.

A practical architecture looks like this:

```text
Browser provider component -> payment provider: card details
Browser -> merchant API: provider reference, cart identifier
Merchant API -> provider: reference plus server-authorized operation
Provider -> merchant API: transaction result and safe display metadata
Merchant database: local customer-to-provider-reference mapping
```

Do not introduce a merchant-hosted card form for unsupported browsers. A temporary fallback is still a payment channel and needs its own assessment.

## Model references explicitly

Keep the local customer record separate from the provider object. An example application schema is:

```text
customer_payment_method
  id                         local opaque identifier
  customer_id                local account owner
  provider                   selected payment integration
  provider_customer_id       provider-side customer reference
  provider_payment_method_id reusable reference, if supported
  display_brand              optional provider metadata
  display_last4              optional provider metadata
  status                     active / detached / expired
```

There is intentionally no PAN, card verification code, magnetic-stripe data, or encrypted copy of those values. Encryption does not make a CVV acceptable to retain after authorization; [PCI SSC FAQ 1280](https://www.pcisecuritystandards.org/faqs/1280/) also rejects saving it for recurring payments.

Store only the provider metadata you actually use. A broad “save the whole API response” approach makes later API expansions a data-retention decision by accident.

## Authorize the token's use

Before charging a stored reference, verify that it belongs to the authenticated customer or the specific merchant-authorized workflow. Never trust a browser-supplied provider identifier as proof of ownership. Bind the reference to the local customer when the provider confirms setup, and verify provider-side ownership where the API supports it.

Calculate prices and permitted actions on the server. Protect refund, charge, and payment-method-update operations independently. A system that cannot reveal a PAN can still cause financial harm if an attacker can charge someone else's saved method.

Separate test and production references. Store the integration environment explicitly where necessary, and reject references that do not match the configured provider account. Use the provider's documented setup and consent process for future payments rather than treating a successful one-time payment as universal permission to reuse the method.

## Limit recovery and export capabilities

Review provider API permissions and dashboard roles. If an application identity or operator can retrieve full PAN, the stored token is part of a much more sensitive workflow than a reference that only supports constrained payment operations.

PCI SSC's [tokenization guidance](https://www.pcisecuritystandards.org/documents/Tokenization_Guidelines_Info_Supplement.pdf) explains that scope reduction depends on the implementation, isolation, and ability to recover card data. It is supplemental guidance, not a blanket exemption or a substitute for the current standard.

Keep detokenization unavailable to ordinary application roles. If another business process legitimately needs PAN recovery, isolate it and include its systems, identities, and operational dependencies in the scope analysis. Avoid adding recovery privileges to a general billing service “for future flexibility.”

## Prove the boundary through failures

Test failed validation, processor declines, retries, duplicate webhooks, saved-card replacement, and account deletion. Inspect merchant-side requests, queues, error events, and session-replay output using approved synthetic data. Check that exceptions do not serialize the browser form or provider SDK internals.

When migrating from a PAN-based design, inspect the historical database, backups, exports, and observability systems. A new token column does not remove old account data. Record the migration and retention work separately from the application's new operating model.

Finally, retain the provider's relevant AOC, the integration instructions, and a current data-flow diagram. Have the appropriate assessment owner review scope and SAQ eligibility. The engineering objective is observable and testable: merchant application paths use authorized references, while card collection and recovery remain within the intended provider boundary.
