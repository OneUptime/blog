# Validation Summary: How to Set a Custom Scheduler and PriorityClass for CockroachDB Operator Pods

## Status
validated

## Post Type
Technical guide / Kubernetes configuration tutorial

## Technologies Covered

- CockroachDB
- CockroachDB Kubernetes Operator (GA `v1beta1` API)
- CockroachDB Helm charts
- Kubernetes Pod scheduling
- `kube-scheduler` profiles and custom schedulers
- Kubernetes `PriorityClass`, pod priority, and preemption
- Helm
- `kubectl`

## Sources Consulted

- [CockroachDB: Pod scheduling with the operator](https://www.cockroachlabs.com/docs/stable/schedule-cockroachdb-operator)
- [CockroachDB chart values at reviewed upstream commit](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml#L504)
- [CockroachDB `CrdbCluster` chart template at reviewed upstream commit](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml#L98)
- [CockroachDB `v1beta1` `PodTemplateSpec` API](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go#L233)
- [CockroachDB Operator chart template and operator PriorityClass](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/templates/operator.yaml#L8)
- [CockroachDB v2 chart versioning and distribution](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md#L136)
- [Legacy public operator `v1alpha1` API](https://github.com/cockroachdb/cockroach-operator/blob/9b1544c83d5b201c5be34a8d5db4736ba8d17283/apis/v1alpha1/cluster_types.go#L109)
- [Kubernetes scheduler configuration and multiple profiles](https://kubernetes.io/docs/reference/scheduling/config/)
- [Kubernetes: Configure Multiple Schedulers](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/)
- [Kubernetes pod priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes Pod update and replacement behavior](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Helm `template` command reference](https://helm.sh/docs/helm/helm_template/)
- [Helm `upgrade` command reference](https://helm.sh/docs/helm/helm_upgrade/)

## Issues Found

- The post stated that a custom scheduler is necessarily a separately deployed control-plane component. Kubernetes can also expose multiple named profiles from one `kube-scheduler` instance. The explanation now covers both deployment models, and the multi-profile example now retains `default-scheduler` alongside `crdb-scheduler` so pods with an omitted scheduler name continue to be handled by that instance.
- The scheduler-name explanation assumed every scheduler uses a `KubeSchedulerProfile`. It now distinguishes the generic requirement that a running scheduler handle the selected name from `kube-scheduler`'s specific `profiles[].schedulerName` configuration.
- The priority explanation treated scheduling order and preemption as unconditional and said priority could not make an unsuitable node valid. Those behaviors depend on the scheduler's plugins, and preemption can make a resource-constrained node feasible by removing lower-priority pods. The text now scopes the behavior to the standard `PrioritySort` and `DefaultPreemption` plugins, notes that other schedulers may differ, and distinguishes removable resource pressure from hard node-feasibility constraints.
- The heading claimed that inspecting `.spec.schedulerName` proved which scheduler handled a pod. That field proves scheduler selection, not successful handling. The post now directs readers to the pod's `Scheduled` event and its reporting controller, with scheduler logs for identifying an exact process instance.
- The rollback text implied that removing `schedulerName` changes existing pods in place. Because this pod field is not mutable, the text now explains that the operator recreates the pods and Kubernetes defaults the replacements to `default-scheduler`.

## Review Notes

- The CockroachDB-specific claims were verified against the published GA operator chart `1.0.0`, CockroachDB chart `26.2.4`, and upstream `cockroachdb/helm-charts` commit `e2fca923e3f0c77c60c771b773d46fc86bf6aa48` from 2026-08-20. A Helm render produced the documented `spec.template.spec.podTemplate.spec.schedulerName` and `priorityClassName` fields.
- The direct `CrdbCluster` example is correctly labeled as a fragment. A complete custom resource still needs the other fields required for the intended cluster, including `spec.regions` under the reviewed CRD.
- The Helm commands assume the `cockroachdb-v2` repository alias is configured, `$CRDB_CHART_VERSION` is set, and the target namespace exists. Those are reasonable prerequisites for the shown upgrade workflow.
- `kubectl get events --sort-by=.lastTimestamp` is valid, although newer Events API records can omit the legacy `lastTimestamp`; `.metadata.creationTimestamp` is a more consistently populated alternative if this command is revised later.
- With `DefaultPreemption`, respecting `PodDisruptionBudget` during scheduler preemption is best effort rather than guaranteed. The post correctly advises evaluating disruption policy before choosing `PreemptLowerPriority` and does not claim that a PDB guarantees protection.
