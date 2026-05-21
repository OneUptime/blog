# Validation Summary: How to Handle Egress for Third-Party Payment Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry, Gateway, VirtualService, DestinationRule, and AuthorizationPolicy
- Istio egress gateways and TLS passthrough
- Kubernetes kubectl commands
- Prometheus alert rules for Istio telemetry
- Stripe, PayPal, and Braintree payment service endpoints
- PCI DSS egress, logging, encryption, and segmentation considerations

## Sources Consulted
- Istio Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Stripe Domains and IP addresses: https://docs.stripe.com/ips
- PayPal REST API requests: https://developer.paypal.com/api/rest/requests/
- Braintree IP Addresses and domains: https://developer.paypal.com/braintree/docs/reference/general/braintree-ip-addresses
- PCI DSS overview and SAQ references from PCI Security Standards Council: https://www.pcisecuritystandards.org/standards/pci-dss/

## Issues Found
- Stripe webhook handling was described as egress from `events.stripe.com`. Updated the text to clarify that Stripe webhooks are inbound requests from Stripe webhook IP addresses, while backend egress commonly uses `api.stripe.com` and `files.stripe.com`.
- ServiceEntry namespace scoping implied that placing a ServiceEntry in `payment-system` was enough to limit visibility. Added `exportTo` entries for the payment namespace and `istio-system`, and updated the explanation to match Istio configuration scoping behavior.
- Braintree sandbox egress omitted `payments.sandbox.braintree-api.com`. Added it based on Braintree's official domain list.
- The egress Gateway host list did not include every payment host shown in the ServiceEntries. Expanded it to cover the Stripe, PayPal, and Braintree production and sandbox hosts used by the examples.
- The AuthorizationPolicy explanation implied that it blocks direct calls to Stripe by itself. Updated the text to state that bypass prevention also requires outbound traffic policy, Kubernetes NetworkPolicies, or firewall rules.
- The Prometheus examples used HTTP request metrics and response codes for TLS passthrough traffic. Replaced them with TCP-level Istio telemetry examples for recent traffic and unexpected sources, and clarified that HTTP response codes and request latency are not visible unless TLS is terminated or originated at the gateway.
- The DestinationRule used HTTP connection-pool settings for TLS passthrough traffic. Removed the HTTP-specific settings and kept TCP connection settings.
- The testing section said the unauthenticated Stripe `curl -I` request should succeed. Updated it to say the request should reach Stripe, while the HTTP status may be authentication-related, and clarified that the non-payment service test only fails when bypass prevention is enforced.

## Review Notes
The Istio resource snippets follow the current `networking.istio.io/v1` and `security.istio.io/v1` API forms shown in official Istio documentation. I could not perform live Kubernetes schema validation because the environment does not provide a cluster with Istio CRDs or a local YAML parser package, so validation was done against official documentation and direct snippet review.
