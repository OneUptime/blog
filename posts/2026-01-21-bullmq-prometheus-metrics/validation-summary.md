# Validation Summary: How to Export BullMQ Metrics to Prometheus

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- BullMQ
- Node.js
- TypeScript
- ioredis
- prom-client
- Prometheus
- PromQL alerting rules
- Grafana dashboard JSON
- Docker Compose
- Redis

## Sources Consulted
- BullMQ QueueEvents API documentation: https://api.docs.bullmq.io/interfaces/v5.QueueEventsListener.html
- BullMQ Queue getters documentation: https://docs.bullmq.io/guide/jobs/getters
- BullMQ connection documentation: https://docs.bullmq.io/guide/connections
- BullMQ Worker events API documentation: https://api.docs.bullmq.io/interfaces/v5.WorkerListener.html
- ioredis README: https://github.com/redis/ioredis
- prom-client README: https://github.com/siimon/prom-client
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The BullMQ metrics collector snippet used the `Redis` type and exported metrics without importing them. Added the missing imports so the TypeScript example is complete.
- The Express metrics endpoint created a Redis connection without importing `Redis` from `ioredis`. Added the missing import.
- The enhanced collector and worker integration snippets referenced BullMQ classes, the `Redis` type, and metric objects without showing their imports. Added the missing imports.
- The advanced metrics snippet imported `Summary` from `prom-client` but did not use it. Removed the unused import.
- The worker metric named `bullmq_workers_active` claimed to count active workers, but the code incremented and decremented it for active jobs. Renamed the metric to `bullmq_worker_active_jobs`, updated its help text, and updated all references.
- The worker active job gauge did not decrement on `stalled` events. Added a decrement when a job stalls because BullMQ moves stalled jobs out of active processing.
- The Grafana p95 query used `histogram_quantile()` directly on bucket rates without aggregating by `le`. Updated it to use `sum by (queue, le)` for classic Prometheus histograms.
- The high failure rate alert divided failed-job rate by per-status rates, which makes failed series divide by themselves instead of by all processed jobs. Updated it to aggregate numerator and denominator by queue.
- The slow processing alert used the same incorrect histogram quantile aggregation pattern as the dashboard. Updated it to aggregate by `queue` and `le`.
- The "No workers" alert used an active-job gauge as if it counted worker processes. Renamed the alert to `BullMQBacklogNotProcessing` and updated its expression and annotations to match the metric's meaning.
- The Prometheus config mounted `alerts.yml` in Docker Compose but did not load it. Added a `rule_files` entry for `/etc/prometheus/alerts.yml`.
- The Docker Compose example used the obsolete top-level `version` field. Removed it.
- The best practice recommending summaries for unclear bucket sizes was too broad for multi-worker BullMQ deployments because Prometheus summaries cannot be meaningfully aggregated across instances. Updated the note to recommend summaries only for non-aggregated percentiles.

## Review Notes
- The examples are now technically consistent with current BullMQ, prom-client, Prometheus, Grafana, ioredis, and Docker Compose documentation.
- The memory estimation example uses Redis `KEYS`, which is valid but can be expensive in production on large keyspaces. A future improvement would be to show a `SCAN`-based implementation.
