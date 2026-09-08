# Validation Summary: How to Convert Peak RPS and Latency into Concurrency with Little’s Law

## Status
validated

## Post Type
Technical guide with capacity calculations, instrumentation pseudocode, and an illustrative YAML checklist.

## Technologies Covered
- Little’s Law and queueing theory
- HTTP service concurrency and capacity planning
- Grafana k6 arrival-rate load testing
- Prometheus histograms and latency aggregation
- YAML

## Sources Consulted
- MIT OpenCourseWare, queueing systems and Little’s Law: https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/ (including the linked lecture PDF).
- MIT 1.041/1.200, Spring 2026 queueing models, especially stability and Little’s Law: https://web.mit.edu/1.041/www/lectures/L8-queuing-models-2026sp.pdf
- Grafana k6, open and closed workload models: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/
- Grafana k6, arrival-rate VU allocation: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/
- Prometheus, histograms and summaries, including aggregation of means and quantiles: https://prometheus.io/docs/practices/histograms/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The blanket warning against cluster RPS with per-instance latency was too broad. Clarified that an individual instance’s mean must represent the cluster’s request-weighted mean. A representative mean can produce a valid cluster estimate.
- Even traffic distribution does not imply equal concurrency when replica latencies differ. Clarified that 432 divided by 12 is an average across replicas, with possible individual variation.
- Timeout and cancellation accounting could imply work ends when the client stops waiting. Clarified that an exit occurs when work actually leaves the measured boundary, consistent with the law’s residence-time definition.
- Matching telemetry windows alone does not remove finite-window edge effects. Qualified the gauge cross-check for requests crossing window edges and windows short relative to request durations.
- The smallest raw resource limit cannot control frontend concurrency without accounting for differing resource units, usage, and holding times. Changed this to the smallest safe budget after conversion to frontend request concurrency.
- The load-test guidance omitted that k6 arrival-rate executors schedule iterations. Added the necessary iteration-to-request mapping and delivered-RPS verification.
- The statement that latency changes concurrency “immediately” incorrectly applied a long-run mean identity to transient behavior. Replaced it with the proportional relationship between matched means over a stable window.
- The Spring 2026 MIT course PDF was labeled OpenCourseWare despite being hosted on the course website. Corrected the link label without changing its URL.

## Review Notes
- Verified the numerical examples: 2,400 × 0.180 = 432; 432 / 12 = 36; read and write contributions are 200 and 232; writes are approximately 17 percent of RPS; 432 × 2 MiB = 864 MiB.
- The mean/percentile distinction, additive class means, and Prometheus histogram aggregation guidance are correct. Mean latency must be weighted by requests when aggregating instances.
- Official k6 documentation confirms coordinated omission in closed workloads, constant and ramping arrival-rate executors, and dropped iterations when available VUs cannot meet the iteration schedule. Dropped iterations can reflect system slowdown as well as insufficient initial allocation.
- The YAML block is an illustrative record with custom keys, not an application configuration schema. The value 510 is illustrative and was not independently load-tested.
- The text blocks are formulas and accounting pseudocode; there are no executable programs, shell commands, or version-pinned APIs to run.
- All external links resolved to their intended resources; the author URL redirects to the canonical GitHub profile.
- Changes were limited to technical corrections in existing paragraphs and a source label. No production load test was performed.
