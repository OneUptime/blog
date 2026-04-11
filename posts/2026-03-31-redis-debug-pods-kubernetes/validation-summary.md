# Validation Summary: How to Debug Redis Pods in Kubernetes

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Redis (CLI commands: ping, info, config get/set)
- Kubernetes (kubectl: get pods, describe, logs, exec, top, get events, run, debug)
- Kubernetes Persistent Volume Claims (PVC/PV)
- Kubernetes Ephemeral Debug Containers

## Sources Consulted
- Kubernetes official documentation: kubectl reference for get, describe, logs, exec, top, run, debug commands (https://kubernetes.io/docs/reference/kubectl/)
- Kubernetes documentation: Ephemeral Containers (https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- Kubernetes documentation: Pod lifecycle and status conditions (https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- Kubernetes documentation: Persistent Volume Claims (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- Redis documentation: CONFIG GET/SET commands (https://redis.io/docs/latest/commands/config-set/)
- Redis documentation: INFO command sections (https://redis.io/docs/latest/commands/info/)
- Redis documentation: maxmemory configuration (https://redis.io/docs/latest/develop/reference/eviction/)

## Issues Found
No technical issues found.

## Review Notes
- The ephemeral containers feature is listed as "Kubernetes 1.23+" which is when the feature gate became beta (enabled by default). It reached GA in Kubernetes 1.25. The "1.23+" claim is accurate for practical usability but readers on older clusters may need to enable the feature gate explicitly.
- The `kubectl get events --sort-by='.lastTimestamp'` command uses the core/v1 Events API field. The newer events.k8s.io/v1 API uses different field names, but kubectl get events defaults to core/v1 where `lastTimestamp` remains valid.
- The `redis-cli config set maxmemory 512mb` command applied via exec is ephemeral — it won't survive a pod restart unless the Redis ConfigMap or StatefulSet is also updated. The post doesn't mention this, but for a debugging-focused guide this is acceptable.
