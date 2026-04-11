# Validation Summary: How to Configure Redis Resource Limits in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7
- Kubernetes (StatefulSets, LimitRange, QoS classes, resource requests/limits)
- kubectl CLI
- Transparent Huge Pages (THP) kernel tuning

## Sources Consulted
- Kubernetes official documentation on Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes official documentation on Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes official documentation on LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Redis official documentation on memory optimization and maxmemory configuration: https://redis.io/docs/management/optimization/memory-optimization/
- Redis official documentation on maxmemory-policy: https://redis.io/docs/reference/eviction/
- Kubernetes documentation on container command/args variable expansion: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found

1. **Incorrect Guaranteed QoS class claim (multiple locations)**: The post claimed that setting memory request = memory limit yields Guaranteed QoS class. This is incorrect. Kubernetes Guaranteed QoS requires ALL containers to have requests equal to limits for ALL specified resources (both CPU and memory). The original example had CPU request=250m and CPU limit=1000m, which would result in Burstable QoS, not Guaranteed. Fixed by setting CPU request = CPU limit = 1000m in the example and updating the best practices text to clarify that both CPU and memory must have request = limit for Guaranteed QoS.

2. **Non-functional shell command substitution in Kubernetes command array**: The post included a command example using `$(echo "$(MEMORY_LIMIT_BYTES) * 75 / 100" | bc)mb` within a Kubernetes `command` array. Kubernetes does not execute shell command substitution in the `command` field — it only supports simple environment variable substitution via `$(VAR_NAME)`. This command would be passed as a literal string and fail. Removed this broken example since the post already recommends the ConfigMap approach immediately after.

3. **Monitoring section QoS comment**: The comment said "Guaranteed (if requests == limits for memory)" — corrected to "for all resources" to match the actual Kubernetes QoS requirement.

## Review Notes
- The StatefulSet YAML is intentionally a partial snippet (missing required fields like `serviceName`, `replicas`, and `selector`). This is acceptable since the post focuses on resource configuration, not complete StatefulSet specs.
- The post mentions `volatile-lru` as the maxmemory policy. This is a valid choice but only evicts keys with an expiry set. If the workload has mostly non-expiring keys, `allkeys-lru` may be more appropriate. This is not an error — just a consideration for readers.
- The rule-of-thumb "maxmemory = container_limit * 0.75" is sound advice for deployments using RDB persistence or replication (which trigger fork()). For append-only workloads without RDB saves, the headroom can be smaller.
