# Validation Summary: How to Monitor Idempotency: First-Execution, Replay, Conflict, and Expired-Key Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- API idempotency
- Prometheus metrics and exposition format
- PromQL
- Stripe API idempotent requests
- Observability and alerting

## Sources Consulted

- [Prometheus instrumentation best practices](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus client library guidelines](https://prometheus.io/docs/instrumenting/writing_clientlibs/)
- [Stripe API: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Issues Found
No technical issues found.

## Review Notes
The decision names are correctly presented as an application-specific vocabulary rather than standardized Prometheus or HTTP outcomes. The PromQL examples correctly apply `rate` before aggregation, use an explicit replay-share denominator, and acknowledge extrapolation in `increase`. The expiry discussion correctly distinguishes retention processing from recognized late retries and from durable business uniqueness. No version-specific or deprecated APIs are used.
