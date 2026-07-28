# Validation Summary: How to Choose Production HTTP Timeouts from Latency Percentiles Instead of Guesswork

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP client timeouts and end-to-end deadlines
- Caller-side latency measurement and percentile analysis
- Service level indicators, service level objectives, and error budgets
- Prometheus histograms and metric-label cardinality
- Retries, exponential backoff, jitter, retry budgets, and token buckets
- gRPC deadline propagation and cancellation
- curl connection timeouts
- Python Requests connect and read timeouts

## Sources Consulted
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Prometheus: Histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [gRPC: Deadlines](https://grpc.io/docs/guides/deadlines/)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Python Requests: Timeouts](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [RFC 9110, Section 15.6.4: 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable)
- [Python documentation: `time.monotonic`](https://docs.python.org/3/library/time.html#time.monotonic)
- [OpenTelemetry semantic conventions for HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)

## Issues Found
- The post described a fast HTTP 503 response only as overload evidence. RFC 9110 defines 503 as temporary unavailability caused by overload or scheduled maintenance, so the text now names both possibilities.
- The post stated that a successful-request latency percentile is not a service objective. A latency measure can be used as an SLI and targeted by an SLO, but filtering to successful requests hides availability. The text now states the precise limitation.
- The sequential child-call formula did not say what to do when the parent has no usable time remaining, and it labeled a relative duration as a deadline. The snippet now calls the value a child budget and explicitly says not to start the call when the result is zero or negative.

## Review Notes
- The 100-call fan-out calculation is correct: `1 - (1 - 0.001)^100` is approximately 9.52%.
- The timeout values and retry allocation are clearly illustrative rather than universal configuration recommendations.
- The distinction between curl's connection phase and Python Requests' connect/read controls matches the current official documentation.
- All external links listed in the post resolved successfully during validation.
