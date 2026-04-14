# Validation Summary: How to Scale the Dapr Placement Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor framework, Raft consensus)
- Kubernetes (StatefulSet, PodDisruptionBudget, topology spread constraints)
- Helm (Dapr Helm chart configuration)
- Prometheus (metrics monitoring)

## Sources Consulted
- Dapr Helm chart placement subchart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml
- Dapr Helm chart README (placement options table): https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr production deployment guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr placement service concept docs: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr placement monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/placement/monitoring/metrics.go
- Dapr StatefulSet template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/templates/dapr_placement_statefulset.yaml

## Issues Found

### 1. Non-existent `dapr_placement.replicaCount` Helm value
- **What was wrong:** The Helm command included `--set dapr_placement.replicaCount=3`, but the placement subchart has no `replicaCount` value. When HA mode is enabled (`dapr_placement.ha=true` or `global.ha.enabled=true`), the replica count is hardcoded to 3 in the StatefulSet template and cannot be configured. The Dapr Helm chart README explicitly states: "Note that in HA mode, Dapr Placement has 3 replicas and that cannot be configured."
- **What was changed:** Removed `--set dapr_placement.replicaCount=3` from the Helm command.
- **Why:** Using a non-existent Helm value would silently do nothing, misleading readers into thinking they are controlling the replica count.

### 2. Incorrect claim about 5 replicas for multi-zone deployments
- **What was wrong:** The post stated "Scale the placement service to 3 replicas for single-zone HA, or 5 replicas for multi-zone deployments." Since the replica count is hardcoded to 3 in HA mode and cannot be changed, the 5-replica recommendation is impossible to implement and incorrect.
- **What was changed:** Updated the text to state that HA mode scales to 3 replicas (hardcoded) and removed the 5-replica claim.
- **Why:** Readers would not be able to follow this advice, and it contradicts Dapr's actual behavior.

### 3. Incorrect Prometheus metric names
- **What was wrong:** The post listed `dapr_placement_runtimehosts_total` and `dapr_placement_actortypes_total` as key metrics. The actual metric names in the Dapr source code (`pkg/placement/monitoring/metrics.go`) are `dapr_placement_runtimes_total` and `dapr_placement_actor_runtimes_total`.
- **What was changed:** Corrected the metric names and their descriptions to match the source code.
- **Why:** Readers grepping for the wrong metric names would find nothing, making the monitoring advice useless.

### 4. Removed `dapr_placement.replicaCount` from summary
- **What was wrong:** The summary paragraph referenced `dapr_placement.replicaCount` as a documented Helm value.
- **What was changed:** Removed the reference and reworded to accurately describe enabling HA mode.
- **Why:** Consistency with the fix in issue #1.

## Review Notes
- The metrics endpoint URL `http://dapr-placement-server-0.dapr-system:9090/metrics` may be incomplete. Kubernetes StatefulSet pod DNS follows the format `<pod-name>.<headless-service-name>.<namespace>`. The correct URL may need the headless service name (e.g., `dapr-placement-server-0.dapr-placement-server.dapr-system:9090/metrics`), depending on the Helm chart's headless service naming. This was not changed because the exact service name varies by chart version.
- The PodDisruptionBudget and topology spread constraint examples use standard Kubernetes constructs and are technically correct. However, when `global.ha.enabled=true` is set, the Dapr Helm chart already configures disruption budgets via `global.ha.disruption` values, so readers may get duplicate PDBs if they apply the manual PDB on top of the chart's built-in one.
- The `keepAliveTime` and `keepAliveTimeout` values shown (2s and 3s respectively) match the Helm chart defaults, so the "tuning" section is essentially showing default values rather than tuned values.
- The Dapr placement service also exposes `dapr_placement_leader_status` and `dapr_placement_raft_leader_status` metrics which are useful for monitoring but not mentioned in the post.
