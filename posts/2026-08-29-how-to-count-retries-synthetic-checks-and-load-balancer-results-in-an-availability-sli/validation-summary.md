# Validation Summary: How to Count Retries, Synthetic Checks, and Load-Balancer Results in an Availability SLI

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Availability service level indicators (SLIs) and service level objectives (SLOs)
- Logical client operations, retry attempts, deadlines, and idempotency
- Load-balancer, edge, and application telemetry correlation
- Synthetic monitoring and low-traffic service coverage
- Prometheus counters, labels, and metric cardinality
- HTTP status codes, including `429` and `502`

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Generating Artificial Traffic](https://sre.google/workbook/alerting-on-slos/#generating-artificial-traffic)
- [Prometheus: Instrumentation Best Practices](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Data Model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus: Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [Prometheus: Writing Client Libraries](https://prometheus.io/docs/instrumenting/writing_clientlibs/)
- [RFC 9110 Section 9.2.2: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Section 15.6.3: 502 Bad Gateway](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.3)
- [RFC 6585 Section 4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [OpenTelemetry HTTP Semantic Conventions: Retry and Resend Attempts](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)

## Issues Found

- The edge/application reconciliation equation did not explicitly deduplicate application observations. Backend or intermediary retries can produce multiple application attempts for one edge request, making raw-total subtraction misleading or negative. The equation now compares distinct eligible edge request IDs correlated to one or more application attempts, and the text separately calls out multiple attempts per edge request.
- The counter examples looked like Prometheus syntax even though `+=` operations and placeholder label alternatives are pseudocode. The text now labels both examples as pseudocode, supplies bounded placeholder values for every label, and defines `reason="none"` for good outcomes so every counter series has a consistent label schema.
- The SLI ratio wording did not explicitly state that counter values must be evaluated over the SLO window. It now says the good-to-eligible-outcome ratio is calculated over that window.

## Review Notes

- The post correctly treats the load balancer as a strong server-side proxy rather than a complete view of DNS, network, client, or rendering failures.
- The recommendation to keep synthetic outcomes separate from the real-user SLI is consistent with Google SRE's warning that successful artificial traffic can hide failures affecting real users.
- Cancellation and quota eligibility remain service-contract decisions and should be documented in the reviewed eligibility policy.
- Prometheus counters are cumulative telemetry rather than a durable exactly-once event store. The post appropriately recommends durable event correlation when no single observer can classify the full journey.
