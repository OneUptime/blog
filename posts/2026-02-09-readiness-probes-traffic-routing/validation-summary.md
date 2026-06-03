# Validation Summary: How to Implement Readiness Probes to Control Traffic Routing to Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes readiness, liveness, and startup probes
- Kubernetes Deployments and rolling updates
- kubectl debugging commands
- Go HTTP readiness endpoints
- Python Flask readiness endpoints
- Node.js Express readiness endpoints
- PostgreSQL, Redis, MongoDB, and RabbitMQ dependency checks
- Prometheus, kubelet probe metrics, and kube-state-metrics

## Sources Consulted
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Go context package documentation: https://pkg.go.dev/context
- Go net/http package documentation: https://pkg.go.dev/net/http
- psycopg2 connection pool documentation: https://www.psycopg.org/docs/pool.html
- Redis PING command documentation: https://redis.io/docs/latest/commands/ping/
- node-redis connection documentation: https://redis.io/docs/latest/develop/clients/nodejs/connect/
- Express routing documentation: https://expressjs.com/en/guide/routing.html
- Mongoose connection documentation: https://mongoosejs.com/docs/connections.html
- RabbitMQ amqp091-go documentation: https://pkg.go.dev/github.com/rabbitmq/amqp091-go

## Issues Found
- The first Go example used `context.WithTimeout` without importing `context`. Added the missing import.
- The first Go example opened a PostgreSQL `database/sql` connection using the `postgres` driver name without registering a driver. Added the `github.com/lib/pq` blank import.
- The first Go example called an undefined `checkRedis()` function. Added a small placeholder function so the snippet is syntactically complete while preserving the article's intent.
- The Python Flask example referenced `psycopg2.pool` without importing the `psycopg2.pool` module. Added the import.
- The Python Flask example used `SimpleConnectionPool`, which psycopg2 documents as single-threaded only. Changed it to `ThreadedConnectionPool` for a web server example.
- The Python database readiness check could fail to return a checked-out connection to the pool if cursor creation or query execution raised an exception. Added a `finally` block to return the connection.
- The Node.js startup example called `warmupCaches()` and `loadConfiguration()` without defining them. Added small async placeholder functions so the snippet is runnable.
- The rolling update comment for `maxUnavailable: 0` understated the setting. Updated the comment and following sentence to reflect that it keeps the desired number of replicas available during rollout.
- The multi-dependency Go example used undeclared `db`, `redisClient`, and `mqConn` identifiers. Added explicit placeholder declarations and imports for the relevant client types.
- The RabbitMQ readiness check inverted `IsClosed()` and marked an open connection unhealthy. Changed it to fail when `mqConn.IsClosed()` is true.
- The external API readiness check did not close the HTTP response body. Added `defer resp.Body.Close()` when a response is returned.
- The PromQL query grouped `kube_pod_status_ready` by `deployment`, but kube-state-metrics does not expose a default `deployment` label on that metric. Changed the example to group by `namespace`.

## Review Notes
- The Kubernetes probe behavior, probe timing fields, rolling update fields, kubectl commands, kubelet `prober_probe_total` metric, and kube-state-metrics readiness/deployment metrics were checked against official documentation.
- `kubectl` was not installed in the local environment, so CLI command validation was performed against the official Kubernetes command reference rather than local help output.
