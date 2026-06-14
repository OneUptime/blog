# Validation Summary: How to Get Started with Chaos Engineering

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- Chaos Engineering
- Python
- Prometheus and PromQL
- prometheus-api-client
- Kubernetes and kubectl
- Linux traffic control (`tc`, `netem`, `u32`)
- psutil
- Chaos Mesh
- Mermaid diagrams

## Sources Consulted
- Principles of Chaos Engineering: https://principlesofchaos.org/
- Prometheus `histogram_quantile` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- prometheus-api-client `custom_query_range` documentation: https://prometheus-api-client-python.readthedocs.io/en/latest/source/prometheus_api_client.html
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh scheduling documentation: https://chaos-mesh.org/docs/define-scheduling-rules/
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- psutil documentation: https://psutil.readthedocs.io/
- Linux `tc-netem` man page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux `tc-u32` man page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- Netflix Chaos Monkey documentation: https://netflix.github.io/chaosmonkey/

## Issues Found
- The Prometheus range query used Unix timestamp floats for `custom_query_range`, but the prometheus-api-client documentation specifies `datetime` objects for `start_time` and `end_time`. Updated the snippet to use timezone-aware `datetime` values.
- The PromQL latency query used `histogram_quantile()` directly over classic histogram bucket rates. Prometheus documentation says aggregated classic histogram queries must preserve the `le` label with `sum by (le)`. Updated the query accordingly.
- The experiment runner called `time.sleep()` without importing `time`. Added the missing import.
- The pod-kill command used `kubectl delete pod -l app=...`, which deletes all pods matching the selector even though the text and hypothesis describe killing one pod. Updated it to select one pod name with `kubectl get pod ... -o jsonpath=...` and delete only that pod.
- The experiment runner used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated timestamps to `datetime.now(timezone.utc)`.
- Some metric handling assumed Prometheus always returned data and would fail when a query returned no series. Added small guard checks around optional metric dictionaries.
- The post described the list as "four core principles," while the published Principles of Chaos Engineering also names continuous automation as an advanced principle. Changed the section wording to avoid an inaccurate count without restructuring the post.

## Review Notes
- The examples are illustrative and assume conventional Prometheus metric names such as `http_requests_total` and `http_request_duration_seconds_bucket`; real systems may use different labels or metric names.
- The `tc` example is valid for Linux egress traffic shaping and requires root privileges plus an interface name that exists on the target host.
