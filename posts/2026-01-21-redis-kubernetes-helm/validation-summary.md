# Validation Summary: How to Deploy Redis on Kubernetes with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis Cluster
- Kubernetes
- Helm
- Bitnami Redis Helm charts
- Prometheus metrics and ServiceMonitor
- Python redis-py
- Node.js ioredis
- Go go-redis

## Sources Consulted
- Bitnami Redis Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Bitnami Redis Cluster Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster
- Helm install script and CLI documentation: https://helm.sh/docs/intro/install/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- redis-py connection and Sentinel documentation: https://redis.readthedocs.io/en/stable/connections.html
- ioredis Sentinel and Cluster documentation: https://github.com/redis/ioredis
- go-redis documentation: https://redis.uptrace.dev/
- redis_exporter metrics documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- The standalone Bitnami Redis values used a top-level `service` block with `port`. Current chart values use `master.service.type` and `master.service.ports.redis`, so the sample was updated.
- The Redis Sentinel examples referenced `my-redis-sentinel` and selected services with `app.kubernetes.io/component=sentinel`. Current Bitnami Redis Sentinel mode exposes a single service named after the Helm release, with Redis on 6379 and Sentinel on 26379, so the commands and client examples now use `my-redis`.
- The Redis Cluster values used `auth.password`, which is not the current Redis Cluster chart key. It was changed to top-level `password`.
- The Redis Cluster values used top-level `resources`; current chart values place Redis container resources under `redis.resources`. The sample was updated.
- The Redis Cluster client examples used pod names without the headless service name. They now use `my-redis-cluster-N.my-redis-cluster-headless`, matching the Bitnami StatefulSet DNS pattern.
- The production configuration used the deprecated top-level `pdb` value. It was replaced with `master.pdb` and `replica.pdb`.
- The production metrics port-forward command used `my-redis-metrics` even though the production release name in the post is `redis-prod`. It now uses `redis-prod-metrics`.
- The Kubernetes Python deployment used the `python:3.11-slim` image but did not install the `redis` package before importing it. The command now installs `redis` before running the example script.
- The Go example built Redis and Sentinel addresses directly from environment variables, producing `:6379` or `:26379` when variables were unset. Defaults for `REDIS_HOST` and `SENTINEL_HOST` were added.

## Review Notes
- YAML snippets were parsed successfully after edits.
- Python and JavaScript code blocks passed local syntax parsing. Go tooling is not installed in this environment, so the Go snippet was reviewed manually against the go-redis API.
