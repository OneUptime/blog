# Validation Summary: How to Use Init Containers to Wait for Service Dependencies Before App Startup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes init containers
- Kubernetes Pods and Deployments
- ConfigMaps and ConfigMap volume permissions
- PostgreSQL and `pg_isready`
- Redis and `redis-cli`
- RabbitMQ Management HTTP API
- `curl`, `nc`, and shell scripting
- Go dependency-checker implementation
- Docker multi-stage builds
- Alpine Linux container images

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Pod API reference for ConfigMap `defaultMode`: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- PostgreSQL 16 `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli
- Redis `PING` command documentation: https://redis.io/docs/latest/commands/ping/
- RabbitMQ Management HTTP API reference: https://www.rabbitmq.com/docs/4.1/http-api-reference
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- Docker Official Image packaging for PostgreSQL: https://github.com/docker-library/postgres
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Alpine Linux `postgresql16-client` package: https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/postgresql16-client
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The post said Kubernetes restarts the whole Pod when an init container fails. Updated this to match Kubernetes documentation: the kubelet repeatedly restarts the failed init container until it succeeds, except that a Pod with `restartPolicy: Never` is treated as failed.
- The RabbitMQ example used `http://rabbitmq-service:15672/api/healthchecks/node`, which is not the documented RabbitMQ Management API health-check path. Updated it to `/api/health/checks/is-in-service` and added username/password environment variables from a Secret because RabbitMQ Management API requests require authenticated access in normal deployments.
- The custom script example used `postgres:16-alpine` with a comment claiming it includes `pg_isready`, `curl`, and `nc`. The PostgreSQL official image includes PostgreSQL tools such as `pg_isready`, but it does not include `curl` and `nc` by default. Updated the init container to use `alpine:3.23` and install `postgresql16-client`, `curl`, and `netcat-openbsd` before running the mounted script.
- The Dockerfile used `golang:1.21-alpine` and `alpine:3.19`, which are outdated as of 2026-06-04. Updated them to `golang:1.26-alpine` and `alpine:3.23` based on the current Go support policy and Alpine release support window.
- The Go database checker deferred `db.Close()` and `cancel()` inside a retry loop and logged the wrong error after `PingContext` failed. Updated it to close the database handle and cancel the context each attempt, and to preserve the `PingContext` error for accurate retry logging.

## Review Notes
- The examples intentionally check network or health endpoints before application startup. This is technically valid for init containers, but future revisions could mention that applications should still handle dependency loss after startup because init containers only gate initial startup.
- The RabbitMQ Management API example assumes the management plugin is enabled and available on port 15672.
