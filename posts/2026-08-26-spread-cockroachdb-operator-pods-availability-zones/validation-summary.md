# Validation Summary: How to Spread Operator-Managed CockroachDB Pods Evenly Across Availability Zones

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- CockroachDB v26.2.5
- CockroachDB Kubernetes Operator v1.0.0 and the `crdb.cockroachlabs.com/v1beta1` API
- Kubernetes Pod topology spread constraints and node affinity
- Kubernetes persistent volumes, persistent volume claims, and StorageClasses
- Kubernetes ServiceAccounts and RBAC
- `kubectl`, `jq`, Bash, and YAML

## Sources Consulted

- [CockroachDB GA Operator announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [GA v1beta1 pod-template example](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [GA `CrdbNodeSpec`, `PodTemplateSpec`, certificates, and locality mappings](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [GA `CrdbClusterSpec`, region model, and status fields](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB Operator API deprecation and migration reference](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [CockroachDB Operator chart values, including `cloudRegion` and node-reader settings](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/values.yaml)
- [CockroachDB chart values, Pod template defaults, locality examples, and node-reader RBAC](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB Operator chart prerequisites and operation guidance](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md)
- [Kubernetes Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes node affinity and inter-pod affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes persistent-volume node affinity](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#node-affinity)
- [Kubernetes local persistent volumes](https://kubernetes.io/docs/concepts/storage/volumes/#local)
- [kubectl command reference](https://kubernetes.io/docs/reference/kubectl/)
- [jq 1.6 manual](https://jqlang.org/manual/v1.6/)
- [CockroachDB topology patterns](https://www.cockroachlabs.com/docs/stable/topology-patterns)
- [CockroachDB `cockroach start` locality reference](https://www.cockroachlabs.com/docs/stable/cockroach-start#locality)
- [CockroachDB replication controls and default replication factor](https://www.cockroachlabs.com/docs/stable/configure-replication-zones)
- [CockroachDB v26.2.5 image tags](https://hub.docker.com/r/cockroachdb/cockroach/tags)

## Issues Found

- The example omitted the Operator's region prerequisite. The Operator chart defaults to `cloudRegion: us-east1`, which does not match the example's `spec.regions[].code: us-east-1`. The prerequisites now require `cloudRegion=us-east-1` or `CLOUD_REGION=us-east-1` so the Operator reconciles the intended region.
- The `ScheduleAnyway` discussion did not account for the sample's `minDomains: 3`. Kubernetes permits `minDomains` only with `whenUnsatisfiable: DoNotSchedule`, so the post now instructs readers to remove `minDomains` when changing that constraint to `ScheduleAnyway`.
- The failure-domain command was described as counting schedulable capacity, but it only filters Nodes whose `.spec.unschedulable` flag is not `true`; it does not evaluate readiness, taints, allocatable resources, or storage. The wording now accurately describes the command as inspecting uncordoned Nodes, while the following paragraph retains the capacity checks readers must perform separately.
- The `minDomains` explanation referred imprecisely to a missing failure domain and checking an API version. It now states the actual zero-global-minimum behavior and directs users of pre-1.30 clusters to check the Kubernetes server version and feature-gate state.
- The RBAC paragraph said that the "GA chart" creates node-reader RBAC by default. That is true of the CockroachDB database chart, but the separate Operator chart defaults its optional shared node-reader resource to disabled. The wording now identifies the CockroachDB chart and its per-release RBAC precisely.
- The verification commands selected only `app.kubernetes.io/name=cockroachdb`, which could mix multiple clusters in one namespace despite the post's cluster-specific-selector guidance. They now use all three labels from the example, including `app.kubernetes.io/instance=cockroachdb`.
- The pod-to-Node join attempted `kubectl get node ""` for Pending Pods whose `.spec.nodeName` is empty. The `jq` filter now limits the join to scheduled Pods; Pending Pods remain covered by the subsequent troubleshooting commands.

## Review Notes

- The complete YAML parses successfully and its field paths and values match the current GA v1beta1 CRD. CockroachDB image `v26.2.5` exists and is the current app version in the reviewed chart source; the post correctly advises pinning a tested Operator/chart/database combination rather than treating the example version as timeless.
- All Bash blocks pass `bash -n`. The reviewed `kubectl` flags, custom-column and JSONPath expressions, selectors, sort expressions, and `jq` filters are syntactically valid. The nine links in the post's Official Documentation section all returned HTTP 200 after redirects.
- `WaitForFirstConsumer` behavior depends on support from the selected CSI driver. The post reasonably assumes an existing compatible `fast-expandable` StorageClass and tells readers to inspect it before rollout.
- The GitHub links target the mutable `master` branch. They are current as reviewed, but commit-pinned links would make future historical validation easier.
