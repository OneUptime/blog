# Validation Summary: How to Scale Dapr Placement Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor model, sidecar architecture)
- Kubernetes (StatefulSets, annotations, resource limits, liveness probes)
- Helm (Dapr Helm chart configuration)
- Raft consensus protocol

## Sources Consulted
- Dapr Arguments and Annotations Overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Placement Service Overview — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Preview Features — https://docs.dapr.io/operations/support/support-preview-features/
- Dapr Helm Chart values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Placement Subchart values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml
- Dapr Placement StatefulSet Template — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/templates/dapr_placement_statefulset.yaml
- Dapr Injector Annotations Source Code — https://github.com/dapr/dapr/blob/master/pkg/injector/annotations/annotations.go

## Issues Found

1. **Incorrect Helm value for replica count**: The post used `--set dapr_placement.replicaCount=3` but the Dapr Helm chart does not have a `replicaCount` value for the placement service. The replica count is determined by the `ha` flag: 3 replicas when `dapr_placement.ha=true`, 1 otherwise. Changed to `--set dapr_placement.ha=true`.

2. **Incorrect ActorStateTTL configuration in "Tuning Actor Table Dissemination" section**: The post showed enabling the `ActorStateTTL` feature flag and claimed it reduces "dissemination overhead by increasing the update batching interval." This is completely wrong — `ActorStateTTL` enables TTL for actor state records in state stores and has nothing to do with placement table dissemination. Replaced with the correct `dapr_placement.disseminateTimeout` Helm value, which controls the placement service's dissemination timeout via the `--disseminate-timeout` flag.

3. **Incorrect placement service port**: The post used port `50006` in the `dapr.io/placement-host-address` annotation examples. The default Dapr placement service gRPC port in Kubernetes is `50005` (port 50006 is only used in certain Docker Compose self-hosted examples). Changed both occurrences from `50006` to `50005`.

4. **Incorrect sidecar annotation name**: The post used `dapr.io/sidecar-liveness-probe-failure-threshold` but the correct annotation is `dapr.io/sidecar-liveness-probe-threshold` (without the `failure-` prefix). Confirmed via the Dapr source code constant `KeyLivenessProbeThreshold`.

5. **Imprecise description of sidecar reconnection tuning**: The post described the liveness probe annotations as "increasing the heartbeat timeout." These annotations control the Kubernetes liveness probe for the sidecar, not a placement service heartbeat. Updated the description to accurately explain that making the Kubernetes liveness probe more tolerant reduces unnecessary sidecar restarts and reconnections.

## Review Notes
- The Raft consensus explanation and recommended replica count table are accurate. Raft does require odd numbers for quorum, and 3 replicas is the standard HA configuration.
- The resource limits section is technically sound — the placement service does hold the actor table in memory, and the `dapr_placement.resources.*` Helm values are valid.
- The monitoring commands use the correct label selector (`app=dapr-placement-server`) and are functional.
- The concept of separating actor workloads across different placement service instances via `dapr.io/placement-host-address` is architecturally valid.
