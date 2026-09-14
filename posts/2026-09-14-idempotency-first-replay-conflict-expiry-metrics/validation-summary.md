# Validation Summary: Monitor Idempotency Execution, Replay, Conflict, and Expiry Metrics

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

- [Stripe API v1 and v2 idempotency differences](https://docs.stripe.com/api-v2-overview#idempotency-differences-between-api-v1-and-api-v2)

## Issues Found
- Scoped the stored-response example to Stripe API v1. API v2 can re-execute failed requests and return an updated response, so the previous unqualified reference to Stripe was too broad.

## Review Notes
The decision names are correctly presented as an application-specific vocabulary rather than standardized Prometheus or HTTP outcomes. The PromQL examples correctly apply `rate` before aggregation, use an explicit replay-share denominator, and acknowledge extrapolation in `increase`. The expiry discussion correctly distinguishes retention processing from recognized late retries and from durable business uniqueness. The Stripe retention example is explicitly scoped to API v1; the metric vocabulary and PromQL examples do not depend on deprecated APIs.
