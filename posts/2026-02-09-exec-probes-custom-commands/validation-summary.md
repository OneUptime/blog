# Validation Summary: Use Exec Probes with Custom Commands for Application-Specific Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness and readiness probes
- Kubernetes exec probes and probe metrics
- PostgreSQL `pg_isready` and `psql`
- Redis `redis-cli`, `PING`, and `INCR`
- MongoDB `mongosh` replica set status checks
- RabbitMQ CLI diagnostics
- Bash and Python health check scripts
- Prometheus queries for kubelet probe metrics

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes task documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- PostgreSQL documentation: `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html
- Redis command documentation: `PING`: https://redis.io/docs/latest/commands/ping/
- Redis command documentation: `INCR`: https://redis.io/docs/latest/commands/incr/
- MongoDB documentation: `rs.status()` mongosh method: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- RabbitMQ documentation: Monitoring and health checks: https://www.rabbitmq.com/docs/4.1/monitoring
- RabbitMQ documentation: `rabbitmq-diagnostics`: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- RabbitMQ documentation: `rabbitmqctl`: https://www.rabbitmq.com/docs/next/man/rabbitmqctl.8

## Issues Found
- The post stated that an exec probe runs commands using the container's default shell. Kubernetes executes the specified command directly; shell behavior is only available when a shell is explicitly invoked. Updated the explanation to clarify this.
- The PostgreSQL bash script used `set -e` and then checked `$?` after `psql` commands. With `set -e`, those checks would not run after a failed `psql` command. Replaced them with `if ! command; then ... fi` blocks.
- The multiple-dependency script used `rabbitmqctl status`, which targets the local default RabbitMQ node unless a node is specified. Replaced it with `rabbitmq-diagnostics -q ping -n rabbit@rabbitmq` to make the target explicit and use RabbitMQ's documented health check command.
- The timeout example used `timeout $TIMEOUT check_external_service`, but `timeout` executes an external command and cannot directly run a shell function. Updated it to run the function through `bash -c` after exporting the timeout variable and function definition into the child shell.

## Review Notes
- The examples assume the relevant CLI tools and credentials are present in the container image. In production, prefer purpose-built lightweight health endpoints or minimal probe commands where possible.
- Kubernetes kubelet probe metrics are exposed from the kubelet `/metrics/probes` endpoint, and `prober_probe_total` is documented with `probe_type` and `result` labels. Access depends on cluster monitoring configuration.
