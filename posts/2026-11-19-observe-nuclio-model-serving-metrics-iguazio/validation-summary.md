# Validation Summary: Nuclio in Iguazio: Monitor Serving Latency, Errors, Throughput, and Saturation

## Status

validated

## Post Type

Technical monitoring and troubleshooting guide with PromQL queries, a Python HTTP probe, and a Kubernetes inspection command.

## Technologies Covered

- Iguazio 3.7 monitoring services and Grafana dashboards
- Nuclio synchronous HTTP serving, worker allocation, autoscaling, and Python async mode
- MLRun serving activity metrics
- Prometheus metric discovery, counters, gauges, histograms, summaries, and PromQL
- Python standard-library HTTP clients, concurrency, and timing
- Kubernetes, kubectl, and jq

## Sources Consulted

- [Iguazio monitoring services](https://www.iguazio.com/docs/latest-release/services/monitoring-services/): version 3.7 dashboard names, tenant scope, and monitoring dependencies for autoscaling.
- [Nuclio platform configuration](https://docs.nuclio.io/en/stable/tasks/configuring-a-platform.html#metric-sinks-metrics): push and pull sinks and the separate pull listener.
- [MLRun cheat sheet](https://docs.mlrun.org/en/stable/cheat-sheet.html#scale-to-zero): handled-event metric in the scale-to-zero example.
- [Nuclio platform configuration source](https://github.com/nuclio/nuclio/blob/development/pkg/platformconfig/platformconfig.go): both optional worker metrics were confirmed by retrieving the raw upstream source.
- [Nuclio worker guidance](https://docs.nuclio.io/en/stable/concepts/best-practices-and-common-pitfalls.html#tweak-worker-configurations-to-resolve-unavailable-server-errors): immediate versus delayed HTTP 503 responses and worker resource costs.
- [Nuclio function configuration](https://docs.nuclio.io/en/stable/reference/function-configuration/function-configuration-reference.html): trigger, worker, timeout, replica, resource, and mode fields.
- [Nuclio async mode](https://docs.nuclio.io/en/stable/reference/function-configuration/async-mode.html): Python HTTP concurrency within workers and connection limits.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): target labels and exported-label conflicts.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/), [functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate), and [operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators): selectors, metric-name discovery, rate, sum, and grouping syntax.
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/): mean durations, histogram aggregation, and non-aggregatable summary quantiles.
- [Python urllib.request](https://docs.python.org/3/library/urllib.request.html): request construction, POST bodies, timeout semantics, response objects, and automatic redirect handling.
- [Python urllib.error](https://docs.python.org/3/library/urllib.error.html) and [http.client](https://docs.python.org/3/library/http.client.html): exception hierarchy and protocol/read errors.
- [Python concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html) and [time](https://docs.python.org/3/library/time.html#time.perf_counter): thread-pool execution and elapsed-time measurement.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): resource/name lookup, namespace flag, and JSON output.
- [jq manual](https://jqlang.org/manual/): field selection, pipes, and shorthand object construction.

## Issues Found

1. The description broadly said the probe handles truncated or malformed responses. The code reads bytes without validating JSON or prediction content, and it only detects protocol failures surfaced by the HTTP client. Narrowed the statement to incomplete reads and malformed HTTP status lines detected by Python. The existing instruction to validate prediction content remains.
2. The description could imply exactly 50 wire requests and direct endpoint status codes. The default urllib opener follows supported redirects, potentially making additional requests and reporting the final response status. Clarified redirect behavior and changed the count to 50 invocations. The code itself remains unchanged.

## Review Notes

- The PromQL examples are syntactically consistent with official documentation. The rate is applied before aggregation, preserving counter-reset handling. Placeholder selectors must be replaced using the deployment's actual labels, as the post explicitly requires.
- The nearest-rank p95 is calculated over successful responses only; zero successes produce None. Throughput uses successful responses divided by the complete run duration. These are small closed-loop probe measurements, not maximum-capacity estimates.
- HTTP error bodies are closed without reading; successful-response timing includes the body read. The probe does not measure full error-body latency or validate prediction semantics.
- Iguazio dashboard claims are scoped to the documented 3.7 release. Nuclio stable documentation and development-branch source do not establish feature availability in every bundled Iguazio release. The post correctly requires local version and metric discovery.
- The Kubernetes command is a read-only inspection of a deployed Nuclio custom resource; its flags and jq expression were reviewed against official references.
- No live Iguazio, Nuclio, Kubernetes, or Prometheus deployment was available for end-to-end validation. Query results, metric labels, exporter metadata, and actual serving capacity remain deployment-specific.
- Referenced documentation links were checked for relevant content. Some web-index results omitted code matches; direct upstream retrieval confirmed the optional autoscaling metric names.
- Compiled and executed the unchanged Python snippet against a local HTTP fixture for five cases, with 50 invocations each: HTTP 200, HTTP 503, a truncated Content-Length body, an invalid HTTP status line, and HTTP 200 containing invalid JSON. All expected classifications passed; invalid JSON remained a 200 success, confirming the wording correction.
