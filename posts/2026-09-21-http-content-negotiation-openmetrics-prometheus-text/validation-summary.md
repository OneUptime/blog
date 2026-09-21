# Validation Summary: How to Negotiate HTTP OpenMetrics and Prometheus Text Formats

## Status
validated

## Post Type
Technical implementation guide with a runnable Go example and HTTP verification commands.

## Technologies Covered
- Prometheus metrics and the Go client library (`client_golang`, `promhttp`).
- OpenMetrics text format 1.0.0 and Prometheus text format 0.0.4.
- Go metric registries, counters, and HTTP handlers.
- HTTP content negotiation, quality weights, media-type parameters, caching, and compression.
- curl and Prometheus 3 name-escaping negotiation.

## Sources Consulted
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/) — media types, versions, weights, escaping parameters, and text fallback.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/) — text representations and response content types.
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — counter family/sample naming and the terminal EOF marker.
- [Go client promhttp documentation](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp) — HandlerFor and EnableOpenMetrics.
- [Go client prometheus documentation](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus) — registries, CounterOpts, CounterVec, registration, and counter updates.
- [Prometheus common encoder implementation](https://github.com/prometheus/common/blob/v0.70.1/expfmt/encode.go) — negotiation implementation; the corresponding downloaded module was used in runtime verification.
- [Go net/http documentation](https://pkg.go.dev/net/http) — handler registration, response headers, and ListenAndServe.
- [curl manual](https://curl.se/docs/manpage.html) — silent/show-error flags, fail-with-body, dump-header, request headers, and output files.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — Content-Type, Accept, quality values, Vary, and content coding.
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5) — response no-store semantics.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link resolves to the intended profile.

## Issues Found
No technical issues found.

The README required no edits during this review.

## Review Notes
- Extracted the exact Go example into an isolated temporary module and successfully built it with Go 1.25.3, client_golang v1.24.1, and its resolved prometheus/common v0.70.1 dependency. The APIs used are supported and not marked deprecated.
- Ran the example on its documented loopback address and exercised the curl commands with curl 8.7.1. Header and body files were written separately as described. The fail-with-body option requires curl 7.76.0 or later.
- Eight request cases passed: explicit OpenMetrics, explicit Prometheus text, OpenMetrics preferred by quality, text preferred by quality, OpenMetrics excluded with q=0 while text is acceptable, no Accept header, unsupported application/json only, and a Prometheus 3-style header containing escaping parameters.
- Both representations returned the success counter value 12 and failure counter value 2. OpenMetrics used worker_jobs for HELP/TYPE metadata, worker_jobs_total for samples, and a final # EOF line. Prometheus text retained worker_jobs_total in metadata and omitted that marker. OpenMetrics rendered these values as 12.0 and 2.0, confirming why byte comparison is unsuitable.
- Every tested response carried Vary: Accept and Cache-Control: no-store. The no-Accept and unsupported-only requests returned Prometheus text 0.0.4. The escaping request returned OpenMetrics with escaping=allow-utf-8. These observations apply to the tested dependency versions; pinning and testing the deployed version remains appropriate.
- The shared registry avoids independent metric state for each format. Separate scrapes can still observe different values when application metrics change between requests.
- Parsed sample comparisons are appropriate for this counter example. Broader comparisons involving histograms or summaries must account for format-specific le/quantile label rendering, as noted in the handler documentation.
- All referenced post links resolved to the expected resources. No configuration snippets required separate validation.
- Ingress, authentication middleware, service mesh behavior, and live Prometheus target health were not tested because no deployment was supplied. The post correctly treats these as deployment-specific checks.
