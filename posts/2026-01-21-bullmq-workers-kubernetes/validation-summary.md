# Validation Summary: How to Deploy BullMQ Workers on Kubernetes

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- BullMQ
- Kubernetes Deployments, probes, Services, HPA, and PodDisruptionBudget
- Node.js and TypeScript
- Redis and ioredis
- Docker
- KEDA Redis scaler
- Prometheus and Prometheus Operator ServiceMonitor
- Helm

## Sources Consulted
- BullMQ Connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ Graceful Shutdown documentation: https://docs.bullmq.io/guide/workers/graceful-shutdown
- BullMQ Pausing Queues documentation: https://docs.bullmq.io/guide/workers/pausing-queues
- BullMQ Job Getters documentation: https://docs.bullmq.io/guide/jobs/getters
- BullMQ Worker API reference: https://api.docs.bullmq.io/classes/v5.Worker.html
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- KEDA Redis Lists scaler documentation: https://keda.sh/docs/2.20/scalers/redis-lists/
- Prometheus scrape protocol/content negotiation documentation: https://prometheus.io/docs/instrumenting/content_negotiation/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The worker code imported `QueueEvents` but did not use it, and the metrics endpoint referenced `worker.queue`, which is not a public property on the current BullMQ `Worker` type. I changed the code to create an explicit `Queue` instance and use `queue.getJobCounts()`, matching BullMQ's documented queue getter pattern.
- The readiness check called `connection.ping()` after changing the BullMQ connection to plain connection options. I added a separate `IORedis` health connection for Redis pings, while passing typed connection options to BullMQ.
- The `/metrics` endpoint returned JSON while the surrounding Kubernetes Service and ServiceMonitor examples described Prometheus scraping. Prometheus expects a supported scrape exposition format, so I changed the endpoint to return Prometheus text format with `text/plain; version=0.0.4`.
- The shutdown flow called `worker.pause()` before its custom timeout loop. BullMQ documents that `worker.pause()` waits for active jobs by default, so the timeout loop could be bypassed by a long-running job. I changed this to `worker.pause(true)` and made `worker.close(activeJobs > 0)` honor the configured timeout by forcing close only when jobs remain active.
- The new queue and health Redis resources needed explicit cleanup. I added `queue.close()` and `healthConnection.quit()` during graceful shutdown.

## Review Notes
The KEDA Redis list scaler example is valid for monitoring BullMQ's waiting list key, but teams using prioritized, delayed, scheduled, or custom-prefixed queues should confirm that the selected Redis key matches the backlog they intend to scale on.
