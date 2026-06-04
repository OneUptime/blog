# Validation Summary: How to Configure Probe timeoutSeconds to Handle Slow Health Check Responses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes HTTP, TCP, and exec probes
- Prometheus / PromQL
- Go HTTP handlers and context timeouts
- Python Flask, psycopg2, redis-py, and Requests timeout usage
- Bash health-check scripts
- kubectl
- curl

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes API reference: Pod v1 Probe fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes source / issue examples for `prober_probe_total` result labels: https://github.com/kubernetes/kubernetes/issues/115766
- Prometheus documentation: Query functions and `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Histograms and summaries: https://prometheus.io/docs/practices/histograms/
- curl manual for `--max-time`: https://curl.se/docs/manpage.html
- Go `context` package documentation: https://pkg.go.dev/context
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- Requests documentation: Timeouts: https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts
- psycopg2 documentation: connection parameters / `connect_timeout`: https://www.psycopg.org/docs/module.html#psycopg2.connect
- redis-py documentation: Redis client parameters including socket timeouts: https://redis.readthedocs.io/en/stable/connections.html

## Issues Found
- The Python readiness example used a 3-second timeout for each of three sequential dependency checks while the Kubernetes probe timeout was 5 seconds. This could exceed the probe timeout even when each individual dependency stayed within its own timeout. Changed the per-call timeout to 1 second and clarified that cumulative check time must stay below the probe timeout.
- The TCP probe explanation said TCP connection attempts either succeed immediately or fail. This was too absolute because dropped packets or network filtering can make connection attempts wait until timeout. Reworded the sentence to state that TCP often succeeds or fails quickly, but dropped packets can wait until timeout.
- The Bash health-check script used an 8-second timeout for each of three sequential commands while the Kubernetes exec probe timeout was 10 seconds. This could exceed the probe timeout. Changed the per-command timeout to 3 seconds and clarified that total script time must remain below the Kubernetes timeout.
- The monitoring examples used `prober_probe_total{result="timeout"}`. Kubernetes kubelet probe metrics use result labels such as `successful`, `failed`, and `unknown`; there is not a separate `timeout` result label. Changed the examples and alert to use `result="failed"`.
- The PromQL example queried `prober_probe_duration_seconds > 5`, but kubelet exposes probe duration as a histogram with `_bucket`, `_sum`, and `_count` series. Replaced it with a `histogram_quantile` expression over `prober_probe_duration_seconds_bucket` and included `le` in the aggregation, as required for classic histograms.
- The curl timeout test said a 6-second delayed response should time out with a 5-second timeout, but the shown curl command did not set a client timeout. Added `--max-time 5`.

## Review Notes
- Kubernetes `timeoutSeconds` defaults to 1 second and has a minimum value of 1, which matches the post.
- The Kubernetes probe YAML fields used in the post are valid v1 fields.
- The Go, Python, and shell snippets are illustrative and omit surrounding application setup, but the APIs and options shown are current and appropriate for the described use.
