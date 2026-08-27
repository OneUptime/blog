# Validation Summary: Why CockroachDB Upscaling Can Leave a Node `DECOMMISSIONING`

## Status

validated

## Post Type

Incident recovery guide

## Technologies Covered

- CockroachDB node decommissioning, draining, membership, and recommissioning
- Deprecated CockroachDB public operator and the `crdb.cockroachlabs.com/v1alpha1` `CrdbCluster` API
- Current `v1beta1` CockroachDB Operator and `CrdbNode` resources
- Kubernetes StatefulSets, Pods, PersistentVolumeClaims, PersistentVolumes, and StorageClasses
- `kubectl` resource selection, JSONPath, patch, exec, and logs commands

## Sources Consulted

- [CockroachDB public operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public operator v2.18.4 scale sequencing](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/scale.go)
- [Public operator v2.18.4 decommission implementation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/scale/drainer.go)
- [Public operator v2.18.4 decommission actor](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/decommission.go)
- [Public operator v2.18.4 action status definitions](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/apis/v1alpha1/action_status.go)
- [Public operator port defaults](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/apis/v1alpha1/webhook.go)
- [Public operator StatefulSet construction and probe configuration](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/statefulset.go)
- [Public operator PVC pruning feature gates](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/features/operator_features.go)
- [CockroachDB `cockroach node` command reference](https://www.cockroachlabs.com/docs/stable/cockroach-node)
- [CockroachDB node shutdown, decommissioning, and recommissioning guide](https://www.cockroachlabs.com/docs/stable/node-shutdown?filters=decommission)
- [CockroachDB Operator migration controller documentation](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [Kubernetes CRD version conversion documentation](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
- [Kubernetes StatefulSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Pod lifecycle documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes PersistentVolume reclaim policy documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming)
- [Kubernetes StorageClass reclaim policy documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/#reclaim-policy)
- [Kubernetes JSONPath documentation](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The original timing explanation implied that changing `spec.nodes` could cancel or redirect a scale-down reconciliation already in progress. The public operator's active `EnsureScale` operation continues using the node-count decision it started with and does not re-read the custom resource to implement rollback. The post now explains that the persistent five-Pod/`DECOMMISSIONING` state requires the reconciliation to stall, fail, time out, or be interrupted before final decommission and StatefulSet reduction. The recovery procedure now requires confirming that no scale-down reconciliation is still advancing; otherwise, the controller must be paused using the installation's procedure before membership is rechecked.
- The `node recommission` example omitted the public operator's configured gRPC port. The public operator defaults its SQL port to `26257` and its gRPC port to `26258`; `node status` uses the SQL port, while the `node recommission` Admin API uses the gRPC port. The post now reads both fields from the `CrdbCluster`, passes `SQL_PORT` to `node status`, and passes `GRPC_PORT` to `node recommission`.
- The post treated the returned CRD API version as sufficient to identify the operator generation. During official migration, CRD conversion can serve the same object as either `v1alpha1` or `v1beta1`, and `kubectl` can return the preferred served version. The post now calls the explicit `v1alpha1` resource for public-operator commands and instructs readers to verify the managing controller and migration labels or state.
- The Deployment JSONPath command was described as checking an image digest, but `.spec.template.spec.containers[*].image` only returns the configured image reference. It exposes a digest only if the Deployment was configured with one and does not resolve a tag to the running image digest. The description now states exactly what the command reports.
- The original readiness claim said a decommissioning or decommissioned CockroachDB container could pass a Kubernetes-level check. CockroachDB's readiness endpoint returns an error once decommissioning begins, and the public operator uses that endpoint for readiness. The post now states that a Pod can remain in the `Running` phase while being NotReady and that phase or container status is not membership evidence.
- The source-code note was described as covering failed or timed-out decommissions, but the relevant TODO specifically discusses a timed-out decommission. That wording was narrowed. The verification list also referred to a stable `Running` condition that the public operator does not define; it now uses controller logs and warns that an earlier failed `Decommission` action or condition can remain stale after out-of-band recommissioning.
- The PVC warning attributed backing-volume deletion generally to StorageClass behavior. The decisive field for an existing volume is the bound PersistentVolume's reclaim policy, although it is usually inherited from the StorageClass when dynamically provisioned. The wording now reflects that distinction.

## Review Notes

- The review verified the public-operator implementation against the `v2.18.4` source and current repository state on 2026-08-27. The scale and decommission files relevant to this post were unchanged between those revisions.
- The post is intentionally version-specific to the deprecated public operator. Its recovery workflow must not be applied unchanged to the current `v1beta1` CockroachDB Operator.
- Resource, Service, and Deployment names can differ by installation method. The examples remain templates that operators must adapt to the inspected cluster.
