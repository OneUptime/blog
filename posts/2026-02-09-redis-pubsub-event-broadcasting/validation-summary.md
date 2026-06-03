# Validation Summary: How to Implement Redis Pub/Sub Patterns for Real-Time Event Broadcasting

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis Pub/Sub
- redis-py
- go-redis
- Go
- Python
- Kubernetes Deployments
- Gorilla WebSocket
- Prometheus Operator / PrometheusRule
- Redis exporter metrics

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis PUBSUB CHANNELS documentation: https://redis.io/docs/latest/commands/pubsub-channels/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis pub/sub with redis-py documentation: https://redis.io/docs/latest/develop/use-cases/pub-sub/redis-py/
- Redis pub/sub with go-redis documentation: https://redis.io/docs/latest/develop/use-cases/pub-sub/go/
- go-redis official repository: https://github.com/redis/go-redis
- Kubernetes Deployment API documentation: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Prometheus Operator PrometheusRule CRD documentation: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1
- Gorilla WebSocket package documentation: https://pkg.go.dev/github.com/gorilla/websocket
- redis_exporter metrics reference/examples: https://github.com/oliver006/redis_exporter

## Issues Found
- The Go examples used the old `github.com/go-redis/redis/v8` import path. Updated them to the current official `github.com/redis/go-redis/v9` module path.
- The notification service Deployment used `replicas: 3` even though Redis Pub/Sub broadcasts each message to every active subscriber. Updated the example to `replicas: 1` and added a caveat that multiple replicas require distinct local clients or idempotent handlers to avoid duplicate side effects.
- The WebSocket example ignored the error returned by `upgrader.Upgrade`, which could cause a nil connection panic on upgrade failure. Added a minimal error check.
- The PrometheusRule referenced `redis_pubsub_channels_subscribers`, which is not the standard Redis exporter metric. Updated it to `redis_pubsub_channels` and adjusted the alert name and summary to match the metric.

## Review Notes
The Redis Pub/Sub claims about fire-and-forget delivery, active subscribers only, pattern matching, lack of persistence, and Redis Streams as the better option for persistent critical messages are accurate. The monitoring rule checks whether there are active Pub/Sub channels; per-channel subscriber counts still require `PUBSUB NUMSUB` or custom exported metrics if per-channel alerting is needed.
