# Validation Summary: How to Size Worker Pools and Queues for a Latency SLO

## Status
validated

## Post Type
Technical capacity-planning guide with sizing formulas and operational implementation details. Qualifies for technical review despite containing no executable code, CLI commands, or configuration snippets.

## Technologies Covered
- Worker pools, concurrency, and downstream database capacity
- Queueing theory, Little's Law, utilization, and backlog recovery
- Latency SLOs and percentile distributions
- RabbitMQ consumer prefetch, acknowledgements, and redelivery
- Admission control, retries, message TTL, and dead-lettering

## Sources Consulted
- MIT OpenCourseWare, Queueing Systems lecture: https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/
- MIT lecture PDF, especially steady-state relationships on pages 4–5: https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/a9235f5e4e0aee12a55778e5beaf0ddb_lec5.pdf
- RabbitMQ consumer prefetch: https://www.rabbitmq.com/docs/consumer-prefetch
- RabbitMQ consumers and consumer capacity: https://www.rabbitmq.com/docs/consumers
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ TTL and expiration: https://www.rabbitmq.com/docs/ttl
- RabbitMQ dead-letter exchanges: https://www.rabbitmq.com/docs/dlx
- Google SRE Book, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. The opening required actual completion throughput to exceed arrivals. In steady state, throughput matches arrivals; spare capacity is the requirement. Changed the wording to refer to completion capacity.
2. The completion metric did not specify acknowledgement semantics. Clarified that acknowledgements must follow successful processing; automatic acknowledgements and publisher confirms do not establish processing completion.
3. Worker sizing left retry accounting ambiguous. Made the steady-state assumption explicit and specified attempt arrival rate paired with mean service time across successful and failed attempts, preventing underestimation of occupied workers.
4. Drain estimation mixed ready backlog, successful completions, and potentially retry-inclusive arrivals without explicit accounting assumptions. Specified logical-job units, retry costs embedded in measured successful capacity, approximately constant in-flight work, and separate accounting for expiry/dead-letter removals. Required capacity measurement under sustained backlog and qualified the no-drain statement as a constant-rate result.
5. The prefetch formula was unconditional. Scoped it to AMQP 0-9-1 push consumers with manual acknowledgements and fixed, equal, positive per-consumer limits; expressed it as an upper bound and noted zero and additional-limit semantics. Clarified that prefetched client-side waiting contributes to queue latency.

## Review Notes
- Verified arithmetic: 800 × 0.040 = 32 busy slots; ceil(32 / 0.70) = 46 slots; 400 / 800 = 0.5 seconds; 60,000 / 200 = 300 seconds; 60,000 / 20 = 3,000 seconds.
- Little's Law concerns matching long-run means across a consistent boundary. It does not derive a p99 queue-depth limit. The article correctly calls for direct waiting-time measurements and joint end-to-end validation.
- Checked percentile-budget reasoning mathematically: two components each meeting a 99th-percentile budget can have disjoint 1% exceedance events, so their summed budgets do not guarantee 99% end-to-end compliance.
- The 70% utilization target and 1,000 jobs/second capacity are illustrative assumptions requiring workload measurements, not universal recommendations or benchmark results. No production performance test was available or claimed.
- The idealized drain formula follows backlog conservation with constant net departure rate. Empty ready backlog does not establish that all in-flight work has completed.
- RabbitMQ message TTL limits queue residence; it does not cancel processing already delivered to a consumer or independently enforce an end-to-end deadline. Expired messages require configured dead-letter routing if they should be retained elsewhere.
- All post links resolved to the intended resources, including the author profile redirect. The post does not pin a RabbitMQ version; consulted live documentation displayed version 4.3. No executable API or configuration examples require deprecation changes.
- Retained the original structure and numerical examples. Validation consisted of source review, mathematical checks, and artifact verification; no runtime code tests were applicable.
