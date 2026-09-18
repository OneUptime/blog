# Validation Summary: How to Perform a Planned PostgreSQL Operator Switchover Without Dropping Client Traffic

## Status
validated

## Post Type
Technical operations guide with Kubernetes commands and PostgreSQL/PgBouncer administrative SQL.

## Technologies Covered
- CloudNativePG 1.30 and its kubectl plugin
- PostgreSQL replication, transactions, recovery, and activity statistics
- Kubernetes custom resources, Services, pods, and EndpointSlices
- PgBouncer connection pooling, administrative commands, and timeouts
- Application transaction retries and idempotency

## Sources Consulted
- [CloudNativePG 1.30 connection pooling](https://cloudnative-pg.io/docs/1.30/connection_pooling/): managed Pooler architecture, local peer-authenticated administration, and declarative pause/resume sequence.
- [CloudNativePG 1.30 API reference](https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/): PoolerSpec and the boolean PgBouncerSpec.paused field.
- [CloudNativePG 1.30 kubectl plugin](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/): status and promote syntax.
- [CloudNativePG 1.30 failover](https://cloudnative-pg.io/docs/1.30/failover/): shutdown behavior and switchoverDelay tradeoffs.
- [CloudNativePG 1.30 service management](https://cloudnative-pg.io/docs/1.30/service_management/): primary routing through the rw Service.
- [CloudNativePG 1.30 labels and annotations](https://cloudnative-pg.io/docs/1.30/labels_annotations/): cluster pod labels.
- [PgBouncer administrative commands](https://www.pgbouncer.org/usage.html): SHOW STATE, SHOW DATABASES, SHOW POOLS, SHOW SERVERS, PAUSE, RESUME, and mode-dependent draining.
- [PgBouncer 1.25.1 administrative command implementation](https://github.com/pgbouncer/pgbouncer/blob/pgbouncer_1_25_1/src/admin.c): confirmed the distinction between global pause state and per-database pause flags, including SHOW STATE output values.
- [PgBouncer configuration](https://www.pgbouncer.org/config.html#query_wait_timeout): waiting-query timeout and disconnect behavior.
- [PostgreSQL activity statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW): pg_stat_activity fields and transaction timestamps.
- [PostgreSQL date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html): clock_timestamp and timestamp subtraction.
- [PostgreSQL recovery functions](https://www.postgresql.org/docs/current/functions-admin.html): pg_is_in_recovery.
- [PostgreSQL asynchronous command processing](https://www.postgresql.org/docs/current/libpq-async.html): sending commands and receiving results are separate operations; a connection failure can prevent receipt of a transaction outcome.
- [Kubernetes kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): namespace, selector, and output flags.
- [Kubernetes kubectl patch](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/): JSON merge patch syntax for custom resources.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/): Service association through the kubernetes.io/service-name label.

## Issues Found
- **Global pause verification was incomplete.** The post instructed readers to verify a paused database using SHOW DATABASES, SHOW POOLS, and SHOW SERVERS. PgBouncer's global PAUSE changes process-wide state without setting the per-database paused flag displayed by SHOW DATABASES. Added SHOW STATE, required paused = yes on each instance together with an empty SHOW SERVERS result, and explained why neither the per-database flag nor global state alone proves a completed drain. Also made the resume check explicit with active = yes and paused = no. This corrects the verification procedure without changing its structure.

## Review Notes
- The post is technically relevant and its remaining examples match the documented interfaces. Both merge patches contain valid JSON and use the correct boolean field. The promote command accepts the candidate pod name.
- The transaction-age query is valid PostgreSQL SQL; it measures elapsed transaction time rather than predicting completion. An administrative account needs sufficient statistics visibility to inspect other sessions.
- Transaction pooling drains at transaction boundaries; session pooling requires clients to disconnect. The post correctly calls for application cooperation and a bounded maintenance budget.
- A Kubernetes patch acknowledges desired state, not completion. Per-instance checks, primary verification, Service endpoint inspection, and application-path writes address different stages of the operation.
- The post correctly limits its traffic-preservation claim to measured deadlines and application behavior. A primary change cannot migrate open transactions, and an unacknowledged COMMIT must not be retried blindly.
- CloudNativePG claims were checked against the 1.30 documentation. The PostgreSQL current links resolved to version 18 during review. PgBouncer commands and actual image/client availability should be checked during the requested deployment rehearsal.
- Referenced technical documentation links resolve to the intended resources. No deprecated interface was identified in the examples.
- This was a documentation and source-code review with local syntax checks, not a live switchover test. No Kubernetes cluster or application workload was exercised; zero failed requests and maintenance timing remain deployment-specific properties to measure.
