# Validation Summary: How to Create Failover Testing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL streaming replication and failover checks
- Patroni `patronictl` switchover
- Kubernetes Jobs
- Chaos Mesh workflows and PodChaos
- LitmusChaos ChaosEngine probes
- Gremlin API
- Prometheus, Prometheus Operator, and PromQL
- PgBouncer Prometheus exporter metrics
- Grafana dashboard JSON
- Python and Bash automation

## Sources Consulted
- PostgreSQL documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- EDB Patroni documentation: Managing a cluster - https://www.enterprisedb.com/docs/supported-open-source/patroni/cluster_management/
- Kubernetes documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: Automatic Cleanup for Finished Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Chaos Mesh documentation: Create Chaos Mesh Workflow - https://chaos-mesh.org/docs/create-chaos-mesh-workflow/
- LitmusChaos documentation: Resilience Probes - https://docs.litmuschaos.io/docs/concepts/probes
- LitmusChaos experiment documentation: HTTP Probe - https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/httpProbe/
- Gremlin documentation: API examples - https://www.gremlin.com/docs/api-reference-examples
- Gremlin Python SDK README - https://github.com/gremlin/gremlin-python
- Prometheus documentation: Querying operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Recording rules - https://prometheus.io/docs/practices/rules/
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus community PgBouncer exporter metrics - https://github.com/prometheus-community/pgbouncer_exporter
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The Bash preflight replica lag check queried `pg_last_xact_replay_timestamp()` on the primary. PostgreSQL returns NULL for this function on a normally running primary, so the comparison could fail or produce meaningless lag. Changed the query to run against the replica and use `COALESCE(..., 0)`.
- The Chaos Mesh workflow put `duration: "30s"` inside the `podChaos` object. Chaos Mesh workflow documentation requires chaos duration to be expressed with the template-level `deadline` field. Moved the value to `deadline: 30s`.
- The LitmusChaos HTTP probe used numeric `runProperties` durations and targeted `http://postgres-service.database.svc:5432/health`, which treats a PostgreSQL TCP port as an HTTP endpoint. Updated durations to Litmus duration strings and pointed the probe at an HTTP health endpoint.
- The Gremlin Python example imported a non-existent `gremlin` SDK API shape with `attacks.StateAttack` and `client.attacks.create`. Replaced it with a Gremlin API `/v1/attacks/new` request matching the official API examples.
- The Prometheus/PgBouncer recording rule was named `failover:connection_pool:available` but calculated active server connections divided by total active-plus-idle connections, which is utilization rather than availability. Changed it to use idle server connections over active-plus-idle connections.
- The improvement tracking YAML had a test ID dated `20261215` while the test date and related references were `2025-12-15`. Corrected the test ID to `failover-20251215-030000`.

## Review Notes
The remaining custom `testing.sre/v1` and `tracking.sre/v1` YAML snippets are illustrative CRD examples, not standard Kubernetes APIs. The Bash, Python, and YAML snippets were syntax-checked locally after edits.
