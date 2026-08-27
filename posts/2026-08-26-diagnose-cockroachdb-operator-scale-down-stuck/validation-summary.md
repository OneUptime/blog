# Validation Summary: How to Diagnose a Stuck CockroachDB Operator Scale-Down

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- CockroachDB self-hosted clusters
- Kubernetes
- Deprecated CockroachDB Public operator (`crdb.cockroachlabs.com/v1alpha1`)
- Current CockroachDB Operator (`crdb.cockroachlabs.com/v1beta1`)
- `CrdbCluster` and `CrdbNode` custom resources
- Kubernetes StatefulSets, Pods, Services, Events, and PersistentVolumeClaims
- `kubectl`
- CockroachDB `node status`, `node decommission`, and `node recommission` CLI commands

## Sources Consulted

- [CockroachDB Public operator README and deprecation notice](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/README.md)
- [Public operator scale-down implementation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/scale.go)
- [Public operator decommission status, drain, and finalization implementation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/drainer.go)
- [Public operator decommission actor and entry guard](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/decommission.go)
- [Public operator action selection](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/director.go)
- [Public operator StatefulSet readiness and replica handling](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/cockroach_statefulset.go)
- [Public operator StatefulSet pod and readiness-probe definition](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/statefulset.go)
- [Public operator installation manifest](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/install/operator.yaml)
- [CockroachDB Operator overview](https://docs.cockroachlabs.com/docs/v26.3/cockroachdb-operator-overview)
- [Migration from the Public operator](https://docs.cockroachlabs.com/docs/v26.3/migrate-cockroachdb-kubernetes-operator)
- [CockroachDB node shutdown, decommissioning, dead-node removal, and recommissioning](https://docs.cockroachlabs.com/docs/v26.3/node-shutdown)
- [CockroachDB `node` CLI reference](https://docs.cockroachlabs.com/docs/v26.3/cockroach-node)
- [CockroachDB essential replication alerts](https://docs.cockroachlabs.com/docs/v26.3/essential-alerts-self-hosted)
- [Kubernetes StatefulSet concepts](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/)
- [Kubernetes custom-resource version conversion](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
- [`kubectl api-resources`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and the [`kubectl` quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)

## Issues Found

- The post used one namespace variable for both CockroachDB resources and the operator Deployment. The stock operator runs in `cockroach-operator-system`, while the `CrdbCluster` and StatefulSet commonly run in another namespace. Added separate cluster and operator namespace variables and corrected the log commands.
- The generation check called `.apiVersion` the stored API version and treated it as ownership evidence. A conversion webhook can serve the same object as either API version during migration. Reworded the check, added the `crdb.io/skip-reconcile` label and migration phase, and made workload topology the deciding evidence.
- `kubectl get statefulset,crdbnode` can fail on a Public-operator-only installation where the `CrdbNode` resource is not installed. Replaced it with API discovery, an unconditional StatefulSet query, and a conditional `CrdbNode` query.
- The scale-down sequence implied that the operator polls leases and omitted its post-reduction readiness wait. The implementation polls the target's remaining replica count, performs a final blocking decommission, reduces the StatefulSet, and then waits for the remaining replicas to be Ready. Corrected the sequence.
- The post said a decommissioning pod can remain Running and Ready. Current CockroachDB returns HTTP 503 from `/health?ready=1` during decommissioning, and that endpoint is the Public operator's readiness probe. Corrected the text to distinguish a Running process from a NotReady pod.
- The StatefulSet command labeled `.spec.replicas` as the replica count and `.status.currentReplicas` as current/actual replicas. Added `.status.replicas` for actual Pods and relabeled `currentReplicas` as the count at `currentRevision`.
- Event sorting used `.lastTimestamp`, which can be unset on newer event records. Changed it to `.metadata.creationTimestamp`, the current Kubernetes-documented form for chronological event listing.
- The post claimed a forced StatefulSet scale would simply be reconciled back. Scaling directly to the already-lower `CrdbCluster.spec.nodes` can instead bypass the operator's database decommission sequence. Corrected the warning and clarified that deleting a StatefulSet Pod recreates the same ordinal and PVC but interrupts the Public operator's live-node check.
- The pre-decommission wait was described as an all-Ready-replicas check. The operator actually compares `status.currentReplicas` with `status.replicas` before entering decommission and checks Ready replicas after each controlled reduction. Corrected the diagnostic pattern.
- The text referred to a restarted leader pod, although leader election is not enabled by default in the released Public operator. Changed this to the operator pod.
- `node status --decommission` was said to expose lease values. It exposes decommissioning and replica fields; leaseholder counts require `--ranges` or `--all`. Corrected the monitoring guidance.
- The commands did not distinguish the Public operator's SQL port (`spec.sqlPort`, default `26257`) from its RPC/gRPC port (`spec.grpcPort`, default `26258`). Made the SQL port explicit for status queries and fixed `node recommission` to use the RPC port.
- The dead-node paragraph described CockroachDB's general capability without noting that this Public operator's polling code requires `is_live=true`. Added that implementation-specific limitation and directed unrecoverable-pod cases to release-specific manual recovery guidance.
- The recommission procedure omitted the documented possibility that a node already in the draining stage may require a restart. Added the caveat.

## Review Notes

- The guide intentionally targets a deprecated controller. Its behavior was checked against Public operator v2.18.4 and the matching current repository source as of the validation date; operators should still consult guidance for their exact installed release.
- The current `v1beta1` CockroachDB Operator uses `CrdbNode` resources rather than StatefulSets. Dual-version conversion and mixed workloads are valid only in the migration workflow, so returned `apiVersion` is not sufficient ownership evidence.
- The Bash snippets passed a syntax-only shell check. All six links in the post's Official Documentation section resolved successfully during review.
