# Validation Summary: How to Set Up Redis Readiness and Liveness Probes in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7
- Kubernetes (StatefulSet, Probes: liveness, readiness, startup)
- redis-cli
- kubectl

## Sources Consulted
- Kubernetes official documentation: Configure Liveness, Readiness and Startup Probes (https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- Kubernetes API reference: Pod spec probe fields (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#Probe)
- Kubernetes API reference: StatefulSet spec (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/)
- Redis CLI documentation: PING command (https://redis.io/docs/latest/commands/ping/)
- Redis CLI documentation: INFO replication (https://redis.io/docs/latest/commands/info/)

## Issues Found

1. **Filename comment mismatch**: The YAML comment said `# redis-deployment.yaml` but the resource kind was `StatefulSet`. Changed to `# redis-statefulset.yaml` to avoid confusion between Deployment and StatefulSet resource types.

2. **Missing required `serviceName` field**: The StatefulSet spec was missing the `serviceName` field, which is required by the Kubernetes API for StatefulSets. Without it, `kubectl apply` will reject the manifest with a validation error. Added `serviceName: redis`.

3. **Missing pod template labels**: The `template` section was missing `metadata.labels` matching the `selector.matchLabels`. Without these labels on the pod template, the StatefulSet selector cannot match pods and the controller will not create or manage any pods. Added `metadata.labels.app: redis` to the pod template.

## Review Notes
- The probe configurations (field names, values, behavior descriptions) are all correct per the Kubernetes API.
- The `redis-cli ping` approach is the standard and recommended method for Redis health checks.
- The `-a` flag for authentication will produce a stderr warning ("Using a password with '-a' option on the command line interface may not be safe"), but this does not affect probe functionality since the warning goes to stderr and the grep operates on stdout. An alternative would be using the `REDISCLI_AUTH` environment variable, but the current approach works correctly.
- The startup probe calculation comment "Allow up to 150 seconds (30 x 5s)" is correct per Kubernetes documentation convention (`failureThreshold * periodSeconds`).
- The replication-aware readiness script correctly parses `INFO replication` output and checks `master_link_status` for replicas.
- All kubectl verification commands are correct and useful for debugging probe issues.
