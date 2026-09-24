# How to Reduce PCI DSS Scope with a Fully Hosted Checkout Page

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Web Security, Compliance

Description: Move card entry to a fully hosted payment page, remove residual PAN paths, and verify the merchant responsibilities that remain.

---

A fully hosted checkout can remove card entry and card-data transmission from your application servers. The useful design boundary is that your application creates an order and a payment session, while the payment provider receives the card details on its own page.

This can support SAQ A eligibility when the complete criteria are met. It does not remove every merchant system from PCI DSS scope. PCI SSC confirms that [merchant websites using SAQ A still have security responsibilities](https://www.pcisecuritystandards.org/faqs/1332/).

## Define the intended data flow

Write the proposed flow before integrating the provider:

```text
Customer -> merchant: cart and delivery choices
Merchant -> provider: order amount, currency, session configuration
Merchant -> customer: redirect to provider checkout URL
Customer -> provider: card details and authentication
Provider -> merchant: authenticated payment result and references
Merchant -> customer: order status
```

Only the provider-facing customer interaction should contain the PAN and card verification code. Avoid routing that interaction through your own reverse proxy or creating merchant-hosted fallback card inputs when the provider is unavailable.

For example, [Stripe Checkout supports a provider-hosted page reached by redirect](https://docs.stripe.com/payments/checkout). Other processors have comparable products, but “hosted” is a product label that must be checked against the exact integration method.

## Make the server authoritative for the order

When the customer clicks Pay, authenticate the customer or validate the guest checkout session. Recalculate the amount from server-side product and pricing records. A browser-supplied total is not authoritative.

Create a local order in a pending state, then ask the provider to create the hosted checkout session. Store the provider's session identifier beside the local order identifier. Use the provider's documented idempotency mechanism to avoid duplicate sessions or charges when the browser retries.

Send the customer to the URL returned by the provider's API. Keep success and cancellation destinations under your control. Do not implement a generic redirect endpoint that accepts any destination from a query parameter; that would create a separate phishing risk in the payment journey.

Configure metadata conservatively. An order reference is useful; raw customer form submissions and payment details are not. Review provider dashboards and exports before deciding which fields should appear there.

## Treat the return page as navigation

A customer returning to your success URL does not prove that money was collected. A browser can revisit a URL, and payment methods can complete asynchronously. Keep fulfillment behind a verified provider event or an authenticated server-side status check appropriate to the integration.

For webhooks, verify the provider's signature using its documented request format. Stripe's [signature verification documentation](https://docs.stripe.com/webhooks/signature) requires the unmodified request body, the signature header, and the correct endpoint secret. Avoid logging the body merely to debug a verification failure.

Make event handling idempotent. Store the event identifier or enforce an order-state transition so retries cannot ship an order twice. Reconcile delayed and failed events through a scheduled status check using provider transaction references.

## Remove the old card-data paths

Deploying a new checkout page does not erase the previous integration. Find and retire merchant API endpoints that accepted PAN, old form templates, mobile deep links, background retry messages, and support procedures that still ask for card details.

Inspect historical data stores under the organization's retention and incident processes. Include database replicas, request logs, error trackers, object storage, exports, and backups. Keep existing controls in place while historical account data remains; a front-end migration is not proof that the old environment is now out of scope.

Test success, cancellation, provider timeout, duplicate submission, and refund flows using approved synthetic data. Confirm that merchant requests contain session or payment references rather than card numbers. Include application monitoring and session-replay tools in the inspection.

## Document the responsibilities that remain

Collect the provider's relevant AOC and identify which service and checkout mode it covers. Record who controls merchant DNS, site deployment, administrative accounts, hosted-checkout settings, and payment-event processing. Protecting these paths prevents an attacker from replacing a legitimate payment destination.

The specific SAQ A script eligibility criterion discussed in [PCI SSC FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) does not apply to pure redirect integrations. That is a narrow distinction, not permission to leave the merchant website unmaintained.

In particular, [FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/) confirms that SAQ A merchant webpages which redirect customers to a provider still need the applicable ASV scans. Agree scan coverage with the ASV and hosting provider, and retain passing results on the required schedule.

Complete the migration with a reviewed diagram, evidence that merchant systems no longer receive card details, a plan for residual stored data, and confirmation of the appropriate validation method from the compliance submission recipient. Scope reduction becomes defensible when the implementation and the evidence describe the same boundary.
