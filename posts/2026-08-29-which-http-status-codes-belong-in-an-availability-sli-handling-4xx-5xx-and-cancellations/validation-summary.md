# Validation Summary: Which HTTP Status Codes Belong in an Availability SLI? Handling 4xx, 5xx, and Cancellations

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- HTTP status-code semantics
- Availability SLIs, SLOs, and error budgets
- Prometheus metrics and PromQL
- gRPC status codes, deadlines, and cancellation
- Load balancers, proxies, and client-side telemetry

## Sources Consulted

- [RFC 9110: HTTP Semantics, Section 15](https://www.rfc-editor.org/rfc/rfc9110.html#section-15), including the definitions of `202`, `304`, `400`, `401`, `403`, `404`, `408`, `409`, and `412`
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Prometheus query functions: `rate()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus instrumentation best practices](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC deadlines](https://grpc.io/docs/guides/deadlines/)
- [gRPC cancellation](https://grpc.io/docs/guides/cancellation/)
- [gRPC error handling](https://grpc.io/docs/guides/error/)

## Issues Found

- The `3xx` guidance treated the whole class like URI redirects. Updated it to distinguish redirects from `304 Not Modified`, which represents successful cache revalidation when intended.
- The `401`/`403` bullet conflated authentication and authorization. Updated it to reflect that `401` means valid authentication credentials are lacking, while `403` means the server understood the request but refuses to fulfill it.
- The PromQL example did not mention the missing-series case. Added an instruction to initialize expected bounded label combinations so an interval containing eligible requests but no good outcomes evaluates to zero instead of no data.
- The gRPC deadline explanation did not distinguish the client-visible `DEADLINE_EXCEEDED` result from server-side cancellation and omitted that a state-changing operation can still complete successfully. Corrected both points.
- The cancellation guidance could imply that a client-provided cancellation reason is available at the server. Clarified that gRPC does not transmit that reason to the server and that client outcomes should be correlated with server timestamps.
- The proxy example could imply that a vendor-specific client-closed code is an HTTP response sent on the wire. Changed it to say the proxy records the code.
- The measurement guidance could imply that a load balancer observes failures that happen before traffic reaches it. Clarified that client-side measurement is required for those attempts and described the load balancer's narrower coverage.

## Review Notes

The PromQL syntax and rate-before-sum ordering are correct for a counter. The bounded-label and high-cardinality guidance is consistent with Prometheus best practices. The Google SRE example does count non-5xx responses as successful, and the post correctly presents that as a starter policy rather than a universal definition. All referenced links resolve to the intended authoritative resources. No version-specific or deprecated APIs are used.
