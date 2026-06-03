# Validation Summary: How to Configure Redis Consumer Groups for Scalable Message Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Streams and consumer groups
- redis-cli
- redis-py
- go-redis
- Kubernetes Deployments and HorizontalPodAutoscaler
- Prometheus, Prometheus Operator, and redis_exporter

## Sources Consulted
- Redis command documentation: XGROUP CREATE, XREADGROUP, XPENDING, XCLAIM, XINFO GROUPS, XINFO CONSUMERS, and XACK: https://redis.io/docs/latest/commands/
- Redis Streams with redis-py guide: https://redis.io/docs/latest/develop/use-cases/streaming/redis-py/
- Redis Streams with go-redis guide: https://redis.io/docs/latest/develop/use-cases/streaming/go/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- oliver006/redis_exporter README and stream metric source: https://github.com/oliver006/redis_exporter

## Issues Found
- The post said messages remain until acknowledged. Redis Streams entries remain in the stream until deleted or trimmed; XACK removes entries from the consumer group's pending entries list. Updated the wording to distinguish stream persistence from pending-list acknowledgement.
- The redis-cli examples used unquoted `*` and `$` stream IDs. In a shell, `*` can be expanded by the shell before redis-cli receives it. Quoted both IDs.
- The Go snippets used the older `github.com/go-redis/redis/v8` import path. Updated them to the current `github.com/redis/go-redis/v9` path used by Redis documentation.
- The Go pending-message recovery snippet referenced `streamKey`, `groupName`, and `consumerName` without defining or passing them. Updated the function signature to accept these values.
- The autoscaling example used a non-existent `redis_stream_pending_messages` metric as a Pods metric. Updated it to use the redis_exporter stream group metric `redis_stream_group_messages_pending` through the external metrics API, and configured redis_exporter to collect the `orders` stream.
- The Prometheus alert examples used metric names and a lag expression that do not match redis_exporter stream metrics. Updated them to use `redis_stream_group_lag` and `redis_stream_group_messages_pending`.

## Review Notes
The HPA example assumes a Prometheus Adapter or equivalent custom/external metrics adapter is installed and configured to expose the redis_exporter metric to the Kubernetes external metrics API. The Redis consumer examples provide at-least-once processing; applications with side effects should make processing idempotent.
