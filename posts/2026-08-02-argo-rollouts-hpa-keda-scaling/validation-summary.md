# Validation Summary: Argo Rollouts with HPA or KEDA: Preventing Unexpected Replica Scale-Ups and Scale-Downs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Rollouts
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- KEDA
- Prometheus
- Argo CD and GitOps
- Canary and blue-green deployment strategies
- Traffic routers and progressive delivery
- `kubectl` and the Argo Rollouts kubectl plugin

## Sources Consulted
- Argo Rollouts HPA support: https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/
- Argo Rollouts canary strategy: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/
- Argo Rollouts specification: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts controller replica-allocation source: https://github.com/argoproj/argo-rollouts/blob/62aa6d9241cd04eace6a8b9ee191e730152df162/utils/replicaset/canary.go
- Argo Rollouts `get rollout` command reference: https://argo-rollouts.readthedocs.io/en/latest/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Kubernetes Horizontal Pod Autoscaling concepts and algorithm: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes `autoscaling/v2` HPA API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- KEDA scaling of Deployments, StatefulSets, and custom resources: https://keda.sh/docs/latest/concepts/scaling-deployments/
- KEDA ScaledObject specification: https://keda.sh/docs/latest/reference/scaledobject-spec/
- KEDA Prometheus scaler specification: https://keda.sh/docs/latest/scalers/prometheus/
- KEDA v2.20 Prometheus scaler implementation: https://github.com/kedacore/keda/blob/v2.20.0/pkg/scalers/prometheus_scaler.go
- KEDA v2.20 typed scaler configuration handling: https://github.com/kedacore/keda/blob/v2.20.0/pkg/scalers/scalersconfig/typed_config.go
- KEDA admission-webhook autoscaling ownership checks: https://keda.sh/docs/latest/concepts/admission-webhooks/
- Argo CD `RespectIgnoreDifferences` sync option: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/#respect-ignore-difference-configs

## Issues Found
- The KEDA Prometheus trigger included `metricName`, which is not part of the current Prometheus scaler metadata and is ignored by current KEDA. I removed the no-op field so the example contains only supported trigger parameters; KEDA generates the external metric name itself.
- The resource-request guidance described utilization as merely unreliable when requests are missing. Kubernetes defines a Pod's resource utilization as undefined when a container lacks the relevant request, and HPA does not act on that metric. I updated the wording to state the requirement and behavior accurately.

## Review Notes
- The KEDA example's `cooldownPeriod` is valid, but with `minReplicaCount: 4` it does not control ordinary downscaling. KEDA applies `cooldownPeriod` only when scaling to zero; the generated HPA's `behavior.scaleDown` controls downscaling among nonzero replica counts.
- The post's explanation that a traffic-routed canary is additive when `dynamicStableScale` is false was verified against the current Argo Rollouts traffic-management documentation, specification, and controller source. With the default setting, the stable ReplicaSet remains at the full Rollout replica count while canary replicas are additional; enabling `dynamicStableScale` changes that allocation.
