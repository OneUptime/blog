# Validation Summary: How to Configure Dapr Control Plane HA with 3 Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (control plane components: operator, placement, sentry, scheduler)
- Kubernetes (Deployments, StatefulSets, rolling updates)
- Helm (chart values, upgrade/install)
- Raft consensus algorithm (placement service)

## Sources Consulted
- Dapr Helm Chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Helm Chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Production Guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Scheduler Service Overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Operator Source Code (leader election): https://github.com/dapr/dapr/blob/master/pkg/operator/operator.go
- Dapr v1.13 Release Blog (scheduler introduction): https://blog.dapr.io/posts/2024/03/05/dapr-v1.13-is-now-available/

## Issues Found

1. **Invalid Helm value `dapr_placement.replicaCount`**: The placement service is a StatefulSet whose replica count is not configurable via a `replicaCount` parameter. Instead, it is controlled by `global.ha.enabled` (or `dapr_placement.ha`), which fixes replicas at 3 when enabled. Removed `dapr_placement.replicaCount=3` from both the Helm command and values file, and added clarifying text.

2. **Invalid Helm value `dapr_scheduler.replicaCount`**: The scheduler service is also a StatefulSet and does not accept a `replicaCount` parameter. Its HA mode is controlled by the global HA flag. Removed `dapr_scheduler.replicaCount=3` from both the Helm command and values file, and added clarifying text.

3. **Scheduler is also a StatefulSet**: The post only mentioned placement as using a StatefulSet. The scheduler (introduced in Dapr v1.13) is also deployed as a StatefulSet. Updated the verification section to mention both services.

4. **Incorrect leader election log message**: The post said to look for "became leader" in operator logs. The actual message from the underlying Kubernetes client-go leader election library is "successfully acquired lease". Corrected the log message reference.

## Review Notes
- The `global.ha.enabled=true` flag already sets `global.ha.replicaCount` to 3 by default, which applies to operator and sentry as well. The explicit `replicaCount=3` settings for operator and sentry in the post are technically redundant but not incorrect -- they make the configuration explicit, which is appropriate for a tutorial.
- The rolling update strategy snippet shown in the post is a general Kubernetes concept and is accurate, though the exact default values in Dapr's Helm chart may differ across versions.
- The resource requests/limits example is reasonable guidance but values will vary significantly based on workload; the post correctly notes this.
