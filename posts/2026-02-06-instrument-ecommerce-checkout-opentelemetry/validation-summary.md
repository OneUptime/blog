# Validation Summary: How to Instrument an E-Commerce Checkout Flow with OpenTelemetry End-to-End

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- Node.js
- Express instrumentation
- HTTP instrumentation
- PostgreSQL instrumentation
- OTLP trace and metric exporters
- Stripe PaymentIntents API
- PostgreSQL row-level locking

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Helm chart configuration example: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- Stripe PaymentIntent create API documentation: https://docs.stripe.com/api/payment_intents/create?lang=node
- Current npm package exports for `@opentelemetry/resources@2.7.1` and `@opentelemetry/semantic-conventions@1.41.1`.

## Issues Found
- The SDK setup used `new Resource(...)`, but current `@opentelemetry/resources` exports `resourceFromAttributes` instead of a runtime `Resource` constructor. Updated the import and resource initialization.
- The SDK setup imported and used `ATTR_DEPLOYMENT_ENVIRONMENT`, which is deprecated and not exported from the stable semantic-conventions entry point. Replaced it with `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The payment example imported the deprecated `SemanticAttributes` namespace and did not use it. Removed that import.
- The payment gateway span used deprecated HTTP attributes `http.method` and `http.url`. Replaced them with current semantic convention constants for `http.request.method`, `server.address`, and `url.full`.
- The payment example used Stripe `charges.create` with PaymentIntent-style parameters. Updated it to `stripeClient.paymentIntents.create` and the `/v1/payment_intents` endpoint.
- The payment business span was marked as `SpanKind.CLIENT` even though only the external gateway call should be a client span. Removed the client kind from `payment.process` and kept it on `payment.gateway_call`.
- Several async child spans could remain open if awaited work threw before `span.end()` was reached. Added `try/finally` span ending to cart fetch, cart price verification, and the inventory batch span.
- The inventory example assumed `stock.rows[0]` always existed. Added a safe fallback so a missing inventory row is handled as insufficient stock rather than throwing an unrelated property access error.
- The cart and gateway examples treated an inventory reservation as a single object even though the inventory example returns an array of reservations. Updated the examples to consistently use `reservations`.
- The gateway example attempted to read `span.attributes`, which is not part of the OpenTelemetry JavaScript public Span API. Added a local `currentStep` tracker and helper to set both the local value and the span attribute.
- The prose called custom checkout fields "semantic attributes." Changed this to "span attributes" because fields such as `cart.id` and `checkout.step` are custom attributes, not official semantic convention attributes.

## Review Notes
The Collector configuration shape, OTLP receiver endpoints, memory limiter, batch processor, resource processor, and trace/metric pipelines are consistent with current OpenTelemetry Collector documentation. The examples remain illustrative and use placeholder clients such as `cartClient`, `db`, and `stripeClient`, so they are not standalone runnable programs without the surrounding application code.
