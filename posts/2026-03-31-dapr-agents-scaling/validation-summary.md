# Validation Summary: How to Scale AI Agents with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, actors, placement service, service invocation, Configuration resource)
- Kubernetes (Deployments, HorizontalPodAutoscaler v2)
- KEDA (ScaledObject, Redis trigger)
- Redis (as a queue backend for KEDA scaling)
- Python / FastAPI (concurrency limiting with asyncio.Semaphore)
- hey (HTTP load testing tool)
- Prometheus (monitoring, mentioned)
- kubectl CLI

## Sources Consulted
- Kubernetes HPA autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- KEDA ScaledObject specification: https://keda.sh/docs/latest/concepts/scaling-deployments/
- KEDA Redis scaler documentation: https://keda.sh/docs/latest/scalers/redis-lists/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr actor placement service: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Configuration resource and feature flags: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr source code (pkg/config/configuration.go) for feature flag verification
- hey load testing tool: https://github.com/rakyll/hey

## Issues Found

### 1. Fabricated Dapr feature flag `SchedulerHostedActors` (Section: "Configuring Actor Rebalancing")
**What was wrong:** The feature flag `SchedulerHostedActors` does not exist in Dapr. The section claimed it could be used to "tune actor rebalancing behavior," which is inaccurate.
**What was changed:** Replaced the feature flag with `SchedulerReminders`, which is a real Dapr feature flag (introduced in Dapr 1.14) that offloads actor reminders to the Scheduler service. Updated the section title and description to accurately reflect what this feature does.
**Why:** The original feature flag name appears to be hallucinated. The real feature flags in Dapr include `SchedulerReminders`, `ActorStateTTL`, `HotReload`, and others — but not `SchedulerHostedActors`.

### 2. Misleading description of load testing tool (Section: "Load Testing Your Scaled Agents")
**What was wrong:** The text said "Use the Dapr CLI to send concurrent requests" but the actual command uses `hey`, a standalone HTTP load testing tool that is not part of the Dapr CLI.
**What was changed:** Changed the text to "Use `hey` to load test your agents via the Dapr sidecar" to accurately describe the tool being used.
**Why:** `hey` (by Rakyll/Google) is a general-purpose HTTP load testing tool, not a Dapr CLI feature. The requests do target the Dapr sidecar endpoint, but the tool itself is independent.

### 3. Deprecated kubectl sort field (Section: "Monitoring Scale Events")
**What was wrong:** `--sort-by='.lastTimestamp'` uses the `lastTimestamp` field which was deprecated in Kubernetes 1.25 in favor of the `events.k8s.io/v1` API. For a 2026 blog post, readers will be on Kubernetes versions where this field may be empty.
**What was changed:** Replaced with `--sort-by='.metadata.creationTimestamp'` which works reliably across all Kubernetes versions.
**Why:** On Kubernetes 1.25+, `lastTimestamp` may be null for events created through the newer events API, causing unreliable sort ordering.

## Review Notes
- The KEDA ScaledObject uses `activationListLength: "1"` alongside `minReplicaCount: 1`. Since `activationListLength` only governs the 0-to-1 scaling transition, it has no practical effect when `minReplicaCount` prevents scaling to zero. This is not incorrect, just redundant.
- Memory-based HPA autoscaling (the second metric in the HPA YAML) is technically valid but can be tricky in practice — many runtimes (JVM, Go) don't release memory back to the OS after load decreases, which can cause the HPA to scale up but not scale down. This is a well-known operational consideration, not a code error.
- The Python FastAPI semaphore example references `agent.run_async()` which is illustrative pseudocode. It demonstrates the pattern correctly but `agent` is not imported or defined — this is acceptable for a conceptual example.
