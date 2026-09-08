# Validation Summary: How to Plan Capacity for Heavy and Light Requests

## Status
validated

## Post Type
Technical capacity-planning guide. The post contains resource-demand equations, concurrency calculations, and implementation guidance for admission control and load testing, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Resource-based capacity planning for CPU, memory, I/O, and connection pools
- Queueing theory and Little's Law
- Request classification, weighted demand, and autoscaling signals
- Admission control, worker pools, deadlines, and tenant quotas
- Grafana k6 open and closed workload models
- Prometheus duration histograms and summaries

## Sources Consulted
- Google SRE Book, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/ — resource exhaustion, retries, queue limits, deadlines, degraded service, and failure testing.
- Google SRE Book, Reliable Product Launches at Scale: https://sre.google/sre-book/reliable-product-launches/ — capacity planning and load testing near overload.
- Google SRE Book, Handling Overload: https://sre.google/sre-book/handling-overload/ — variable request cost, resource-based provisioning, rejection overhead, quotas, and request criticality.
- Grafana k6, Open and closed models: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/ — arrival scheduling independent of iteration duration.
- Prometheus, Histograms and summaries: https://prometheus.io/docs/practices/histograms/ — arithmetic means from observation sums and counts, distinct from quantiles.
- MIT OpenCourseWare, Queueing systems lecture resource: https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/ — verified the resource and its linked lecture PDF.
- MIT lecture PDF: https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/a9235f5e4e0aee12a55778e5beaf0ddb_lec5.pdf — mean occupancy, arrival rate, mean residence time, and steady-state assumptions.
- Author profile: https://github.com/nawazdhandala — verified the original www.github.com link redirects to the intended profile.

## Issues Found
1. The resource equation paired all arrivals with cost per successful request. This can misstate demand when failed attempts, timeouts, rejections, or retries consume resources. Changed the measurement list to capture attempt costs and service times by outcome, defined demand using mean cost per attempt and arrival rates including retries, and made the successful-attempt assumption explicit for the examples. Google SRE documents resource use by rejected and failed requests and retry amplification.
2. Little's Law lacked explicit stability and population assumptions. Clarified that the calculation uses stable long-run averages, arrivals entering the measured boundary, and mean residence time including queueing and all outcomes. Requests rejected before entry are excluded. This prevents combining offered traffic with latency measured only for an admitted or successful subset.

## Review Notes
- Verified the arithmetic: light demand is 4.75 cores, heavy demand is 6 cores, total demand is 10.75 cores, and heavy requests contribute 55.81% of CPU demand at 5% of arrivals.
- Dividing by the illustrative 65% utilization target gives 16.53846 cores, correctly rounded to 16.54. The target is a planning assumption, not a universal guarantee of latency or resilience.
- Mean concurrency is 76 light requests plus 45 heavy requests, totaling 121. Multiplying by p99 latency does not yield mean concurrency. End-to-end concurrency is an input to resource-budget testing; individual pool occupancy depends on time holding that pool's resources.
- Increasing heavy traffic to 10% yields 16.5 busy cores, a 53.488% increase, correctly summarized as 53%.
- Class-based resource accounting, recalibration as bottlenecks change, shared-pool contention, workload-mix testing, and resource-oriented scaling signals are consistent with the consulted sources.
- The open-model recommendation is correct for testing externally driven arrivals. A real generator still needs adequate capacity to sustain the scheduled load.
- All five documentation links resolve to the intended resources; the author link also resolves. No version-specific APIs, executable programs, CLI commands, or configuration files require runtime testing or deprecation fixes.
- Only the two technical clarifications above were made to the post; its structure and numerical examples were preserved.
