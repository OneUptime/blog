# Validation Summary: How to Trace Multi-Currency Pricing and Tax Calculation Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python
- Distributed e-commerce pricing services
- Currency conversion
- Tax calculation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/specs/semconv/

## Issues Found
- The currency conversion example inferred `currency.rate_source` from `rate_age < 300`, which mislabeled a freshly fetched API rate as coming from cache because the API path returned an age of `0`. Changed `_get_rate` to return the rate source explicitly and set `currency.rate_source` from that value.
- The histogram named `currency.conversion.duration` measured only external provider fetch latency, not the full conversion duration. Renamed it to `currency.rate_fetch.duration`, updated the variable name, and changed the description so the metric matches the recorded operation.
- The orchestrator converted `base_price * quantity` and then passed that converted total as an item price with the same `quantity` into tax calculation, causing tax to be calculated as if quantity were applied twice. Changed the orchestrator to convert the unit price, pass that unit price into tax calculation, compute a subtotal separately, and add tax to the subtotal.

## Review Notes
The OpenTelemetry Python API usage for creating spans, setting span attributes, creating histograms, and recording histogram measurements with attributes is current. The custom pricing, currency, and tax attribute names are acceptable as application-specific attributes; no official OpenTelemetry semantic convention currently standardizes this domain-specific pricing vocabulary.
