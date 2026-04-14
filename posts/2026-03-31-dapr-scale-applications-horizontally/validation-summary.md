# Validation Summary: How to Scale Dapr Applications Horizontally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service discovery, pub/sub, actors, placement service)
- Kubernetes (Deployments, HPA, endpoints, resource management)
- Apache Kafka (topic partitioning for pub/sub consumers)
- Dapr Python SDK (actor implementation, state management)

## Sources Consulted
- Dapr Python SDK v1.16.2 source code (`dapr/actor/__init__.py`, `dapr/actor/runtime/actor.py`, `dapr/actor/runtime/state_manager.py`) — verified import paths and state manager API
- Dapr Kubernetes name resolution documentation — verified that Dapr creates headless services named `{app-id}-dapr`, not `{app-id}`
- Kubernetes `autoscaling/v2` HPA API reference — verified HPA spec fields and metric types
- Dapr service invocation API — verified URL format `http://localhost:3500/v1.0/invoke/{appId}/method/{methodName}`
- Kafka CLI documentation — verified `kafka-topics.sh` flags (`--create`, `--bootstrap-server`, `--topic`, `--partitions`, `--replication-factor`)

## Issues Found
1. **Description mentioned KEDA but post never covers it**: The post description referenced "Kubernetes HPA, KEDA, and Dapr-aware scaling patterns" but KEDA is never discussed in the post body. Removed "KEDA" from the description to avoid misleading readers.

2. **Incorrect Kubernetes endpoints command**: The post used `kubectl get endpoints api-service` to verify Dapr sees all replicas. However, Dapr's operator creates headless services with the naming pattern `{app-id}-dapr`, not `{app-id}`. Fixed to `kubectl get endpoints api-service-dapr`.

## Review Notes
- The Python actor code imports `ActorRuntime` which is unused in the snippet. This is acceptable since it's a common import needed for the full actor registration setup not shown in the excerpt.
- The Deployment YAML is intentionally partial (missing `selector`, `template.spec.containers`, etc.) which is standard practice for blog posts showing only the relevant fields.
- The resource calculation math is correct: 300m CPU and 384Mi memory per pod, totaling 6000m CPU and 7.5Gi memory for 20 replicas.
- The pub/sub scaling advice about matching consumer replicas to Kafka partitions is accurate — this is how Kafka consumer groups distribute work.
