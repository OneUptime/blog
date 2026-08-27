# Validation Summary: How to Upgrade CockroachDB with the Operator Without an OOMKilled `vcheck` Job

## Status

validated

## Post Type

Troubleshooting and upgrade guide

## Technologies Covered

- CockroachDB
- Deprecated CockroachDB Public Kubernetes Operator (`crdb.cockroachlabs.com/v1alpha1`)
- Current CockroachDB Operator (`crdb.cockroachlabs.com/v1beta1`) migration context
- Kubernetes Jobs, Pods, StatefulSets, resource limits, and node-pressure eviction
- `kubectl`, JSONPath, JSON Patch, Bash, and `jq`
- OCI/container image references and runtime image IDs

## Sources Consulted

- [CockroachDB Public Operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public Operator v2.18.4 version-check controller](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/validate_version.go)
- [Public Operator v2.18.4 `vcheck` Job builder](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/job.go)
- [Public Operator v2.18.4 actor selection and condition gating](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/director.go)
- [Public Operator v2.18.4 feature-gate definitions](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/features/operator_features.go)
- [Public Operator v2.18.4 image-field admission validation](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/apis/v1alpha1/webhook.go)
- [Public Operator v2.18.4 status types](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/apis/v1alpha1/cluster_types.go)
- [Public Operator v2.18.4 generated Deployment manifest](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/install/operator.yaml)
- [CockroachDB legacy Kubernetes deployment deprecation notice](https://www.cockroachlabs.com/docs/stable/kubernetes-deprecation-notice)
- [CockroachDB self-hosted upgrade documentation](https://www.cockroachlabs.com/docs/stable/upgrade-cockroach-version)
- [Migration from the Public Operator to the current CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [Kubernetes Job failure and retry behavior](https://kubernetes.io/docs/concepts/workloads/controllers/job/#handling-pod-and-container-failures)
- [Kubernetes resource limits and OOM behavior](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes Job labels, including deprecated `job-name` and canonical `batch.kubernetes.io/job-name`](https://kubernetes.io/docs/reference/labels-annotations-taints/#batch-kubernetes-io-job-name)
- [Kubernetes label-selector syntax](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#set-based-requirement)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl top` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/)
- [Kubernetes Pod `ContainerStatus` API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#ContainerStatus)
- [`kubectl get` watch implementation](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/get/get.go)
- [RFC 6902 JSON Patch `add` semantics](https://www.rfc-editor.org/rfc/rfc6902#section-4.1)

## Issues Found

- The pod selectors used the deprecated `job-name` label and incorrectly suggested that a concrete value depended on the `kubectl` version. The commands now use `batch.kubernetes.io/job-name`, explain that a bare key is a valid existence selector, and retain a pre-Kubernetes-1.27 compatibility note for the legacy label.
- The post called `.status.containerStatuses[0].imageID` the exact registry digest. Modern kubelets may expose a runtime-specific, node-local image identifier instead. The text now describes it as a runtime-reported image ID and requires registry or runtime tooling to establish the corresponding registry digest before artifact comparison.
- The `RELATED_IMAGE_COCKROACH_*` values were described as immutable images even though released operator manifests can contain mutable tag references. The text now calls them configured image references.
- `kubectl get jobs,pods --watch` cannot watch two resource types in one invocation. It was replaced with separate Job and Pod watches that must run in separate terminals.
- The condition JSONPath requested `.reason`, but the Public Operator's `ClusterCondition` type has no such field. The command now prints `.lastTransitionTime` instead.
- The JSON Patch note implied that `add` should be changed to `replace` when `cockroachDBVersion` already exists. RFC 6902 specifies that `add` replaces an existing object member, so the note now states the actual behavior of the shown patch.
- The post overstated `vcheck` as proving image identity. The custom-image path accepts the build-tag output reported by the candidate image and does not authenticate the artifact. The introduction, image-selection explanation, rollout caveat, and conclusion now consistently describe version reporting rather than image authentication.
- `CrdbVersionValidator` was described as a compatibility gate for every path, but custom images are not checked against the operator's supported-image mapping. The warning now accurately describes it as the Deployment-wide version-check prerequisite used by the partitioned upgrade safety path.

## Review Notes

- The Job command, 300m CPU request and limit, 256 MiB memory request, 512 MiB memory limit, `restartPolicy: Never`, `backoffLimit: 2`, lack of data-PVC mounts, image-selection branches, webhook mutual exclusion, `CrdbVersionChecked` gating, and one-node-at-a-time partitioned rollout were verified against Public Operator v2.18.4 and current source.
- These Job settings are implementation details. The installed operator tag and live Job remain authoritative, as the post now advises.
- The Public Operator is deprecated/legacy but remains relevant to existing clusters; CockroachDB documents migration from its `v1alpha1` API to the current Operator's `v1beta1` API. The guide is therefore technically relevant rather than obsolete.
- All external links in the post resolved successfully during validation on 2026-08-27.
