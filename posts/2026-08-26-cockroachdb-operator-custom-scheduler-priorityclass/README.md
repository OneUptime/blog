# How to Set a Custom Scheduler and PriorityClass for CockroachDB Operator Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Scheduler, PriorityClass, Pod Scheduling

Description: Route GA CockroachDB Operator-managed database pods to a named Kubernetes scheduler and assign an intentional PriorityClass through the v1beta1 podTemplate.

---

CockroachDB pods managed by the GA operator accept normal Kubernetes scheduling fields through `podTemplate`. Set `schedulerName` and `priorityClassName` at `cockroachdb.crdbCluster.podTemplate.spec` in Helm values, which renders to `spec.template.spec.podTemplate.spec` in the `v1beta1` `CrdbCluster`.

Here, “Operator pods” means CockroachDB database pods created by the operator. The operator Deployment itself is installed by `cockroachdb-operator-chart` and has a separate chart-created PriorityClass. Changing a cluster's `podTemplate` does not change the operator Deployment.

## Know what each field does

`schedulerName` selects the scheduler responsible for an unscheduled pod. If omitted, Kubernetes uses the default scheduler. A custom value must exactly match the `schedulerName` of a running scheduler profile. Kubernetes does not fall back to the default scheduler when no scheduler handles that name; the CockroachDB pods remain Pending.

`priorityClassName` references a cluster-scoped `PriorityClass`. Kubernetes resolves that class to a numeric pod priority. Higher priority changes scheduling order and, depending on `preemptionPolicy`, can allow a pending pod to preempt lower-priority pods. It does not reserve CPU, bypass affinity, satisfy an unavailable persistent volume, or make an unsuitable node valid.

## Create the PriorityClass first

Create the class before updating CockroachDB. This example gives database pods a high application priority but disables preemption:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: crdb-production
value: 1000000
globalDefault: false
preemptionPolicy: Never
description: "Production CockroachDB pods; high queue priority without preemption"
```

Apply it and confirm that it is cluster-scoped:

```bash
kubectl apply -f crdb-priorityclass.yaml
kubectl get priorityclass crdb-production -o yaml
```

User-created PriorityClass values must not exceed one billion, and names beginning with `system-` are reserved. `globalDefault: false` ensures that unrelated pods do not inherit this class. If your availability policy permits CockroachDB to evict lower-priority workloads, choose `PreemptLowerPriority` deliberately after evaluating disruption budgets and capacity; do not enable it merely because the database is important.

## Verify the custom scheduler before selecting it

A custom scheduler is a separately deployed Kubernetes control-plane component. The CockroachDB Operator does not install one. In a multi-profile `kube-scheduler` configuration, the selected name comes from `profiles[].schedulerName`, for example:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: crdb-scheduler
```

How you deploy and secure that scheduler depends on your Kubernetes distribution. Before changing database pods, verify that its Deployment or static pod is healthy, has leader-election and RBAC configuration appropriate to the cluster, and is watching the exact name `crdb-scheduler`. Test the scheduler with a disposable pod first.

## Configure the GA operator-managed pods

Add both fields to the CockroachDB chart values:

```yaml
cockroachdb:
  crdbCluster:
    podTemplate:
      spec:
        schedulerName: crdb-scheduler
        priorityClassName: crdb-production
```

Keep existing `podTemplate` content in the same map. Replacing the whole values object can accidentally drop affinity, topology spreading, resources, or container customizations.

For a direct custom resource, the equivalent fragment is:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: orders-db
  namespace: crdb-prod
spec:
  template:
    spec:
      podTemplate:
        spec:
          schedulerName: crdb-scheduler
          priorityClassName: crdb-production
```

This is not the shape used by the legacy public `v1alpha1` operator. Confirm the installed storage API before applying new examples:

```bash
kubectl get crd crdbclusters.crdb.cockroachlabs.com \
  -o jsonpath='{.spec.versions[?(@.storage==true)].name}{"\n"}'
```

For the GA release, the result is `v1beta1`.

## Preview the rendered resource

Render the chart and inspect only the scheduling fields:

```bash
helm template orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml \
  --show-only templates/crdb.yaml
```

You should find the fields beneath:

```yaml
spec:
  template:
    spec:
      podTemplate:
        spec:
          priorityClassName: crdb-production
          schedulerName: crdb-scheduler
```

Then apply the pinned chart release:

```bash
helm upgrade --install orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml
```

Changing these fields changes the desired pod specification and normally causes the operator to roll CockroachDB pods. Maintain enough capacity for both the database topology and any transient scheduling constraints. A high priority cannot help if the custom scheduler rejects the pod or no node can attach its volume.

## Prove which scheduler handled each pod

Inspect the desired and admitted values:

```bash
kubectl -n crdb-prod get pods \
  -l app.kubernetes.io/component=cockroachdb \
  -o custom-columns='NAME:.metadata.name,SCHEDULER:.spec.schedulerName,CLASS:.spec.priorityClassName,PRIORITY:.spec.priority,NODE:.spec.nodeName'
```

Watch rollout state and events:

```bash
kubectl -n crdb-prod get crdbcluster,crdbnode,pod
kubectl -n crdb-prod get events --sort-by=.lastTimestamp
kubectl -n crdb-prod describe pod <pending-cockroachdb-pod>
```

Useful failure patterns include:

- `schedulerName` is correct but pods remain Pending: inspect the custom scheduler's logs and Kubernetes events.
- `priorityClassName` is rejected: the class does not exist, is misspelled, or admission policy blocks it.
- the scheduler evaluates the pod but finds no feasible nodes: inspect persistent-volume topology, requests, taints, affinity, and topology-spread constraints.
- pods run with an unexpected scheduler: inspect the live pod rather than assuming the values file reached the `CrdbCluster` and `CrdbNode` objects.

If rollback is required, remove `schedulerName` to return to the default scheduler and retain or change `priorityClassName` according to policy. Apply that as a reviewed chart upgrade; do not manually edit generated pods because the operator will reconcile them back.

## Separate database priority from operator priority

The GA operator chart creates its own cluster-scoped PriorityClass named `cockroachdb-operator` in global mode, or `cockroachdb-operator-<operator-namespace>` when `watchNamespaces` is set. Its Deployment references that class. This protects the reconciliation control plane independently of database pod priority.

Do not point database pods at the operator's PriorityClass simply because it already exists. Define an application-specific class whose value and preemption policy match your platform's workload tiers. Likewise, a `schedulerName` in the database `podTemplate` does not schedule the operator Deployment.

## Official Documentation

- [CockroachDB: Pod scheduling with the operator](https://www.cockroachlabs.com/docs/stable/schedule-cockroachdb-operator)
- [CockroachDB `v1beta1` PodTemplate API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator chart template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [Kubernetes scheduler configuration](https://kubernetes.io/docs/reference/scheduling/config/)
- [Kubernetes pod priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes assigning pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Conclusion

Create and review the PriorityClass, prove the named scheduler is running, then set `schedulerName` and `priorityClassName` under the GA operator's `podTemplate.spec`. Render the `v1beta1` resource, expect a rolling pod-spec update, and diagnose Pending pods through events and scheduler logs. Keep database workload priority separate from the operator Deployment's own PriorityClass.
