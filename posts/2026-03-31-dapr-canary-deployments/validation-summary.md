# Validation Summary: How to Implement Dapr Canary Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, sidecar injection)
- Kubernetes (Deployments, Ingress, kubectl)
- Nginx Ingress Controller (canary annotations)
- Argo Rollouts (canary strategy, analysis)
- Prometheus (PromQL for error rate monitoring)

## Sources Consulted
- Kubernetes Ingress API documentation (networking.k8s.io/v1)
- Nginx Ingress Controller canary annotations documentation (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)
- Dapr sidecar annotations documentation (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr pub/sub overview and competing consumers documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/)
- Argo Rollouts canary strategy documentation, specifically `canaryMetadata` vs `template.metadata` (https://argoproj.github.io/argo-rollouts/features/canary/)
- kubectl top pods documentation (https://kubernetes.io/docs/reference/kubectl/)

## Issues Found

### 1. Incorrect comment on `kubectl top pods` command
- **What was wrong:** The comment said "Watch error rate by deployment track" but `kubectl top pods` shows CPU and memory usage, not error rates.
- **What was changed:** Updated the comment to "Watch resource usage by deployment track".
- **Why:** `kubectl top pods` queries the Kubernetes Metrics API which only exposes CPU and memory metrics. Error rates require application-level metrics (e.g., Prometheus).

### 2. Dapr annotations misplaced in Argo Rollouts spec
- **What was wrong:** Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`) were placed in `canaryMetadata.annotations` instead of `template.metadata.annotations`. This means only canary pods would receive Dapr sidecars — stable pods would have no Dapr sidecar and would fail.
- **What was changed:** Moved Dapr annotations from `canaryMetadata` to `template.metadata.annotations` and added the missing `dapr.io/app-port` annotation for consistency with the earlier deployment example.
- **Why:** `canaryMetadata` only applies to canary ReplicaSet pods. Dapr annotations must be on the pod template so both stable and canary pods get sidecar injection.

### 3. Incorrect explanation of Dapr pub/sub message delivery
- **What was wrong:** The post stated "messages are delivered to all consumers with the same app ID," implying broadcast delivery. This is incorrect — Dapr pub/sub uses the competing consumers pattern where each message is delivered to only one instance sharing the same app-id.
- **What was changed:** Rewrote the pub/sub canary section to correctly explain that ingress-based traffic splitting doesn't apply to pub/sub (broker-pushed, not HTTP-routed), and that Dapr uses competing consumers with the same app-id.
- **Why:** The competing consumers pattern is fundamental to Dapr pub/sub. The consumer group is derived from the app-id, so all instances with the same app-id share a consumer group and each message goes to exactly one instance.

## Review Notes
- The post correctly notes that sharing the same Dapr app-id between stable and canary means internal service-to-service calls load balance across both. This is accurate but worth noting that the canary traffic percentage for internal calls will be proportional to pod count (not the ingress weight), which could differ from the intended canary percentage.
- The separate canary app-id approach for pub/sub means the canary consumer group receives all messages independently (duplicate processing). The post should ideally mention this caveat, but it's not strictly an error.
- The Nginx Ingress canary annotations and Kubernetes Ingress v1 YAML are correct and current.
- The Argo Rollouts abort/undo commands are correct.
