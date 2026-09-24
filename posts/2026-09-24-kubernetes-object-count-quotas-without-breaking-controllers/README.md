# How to Set Object-Count Quotas for Jobs, Secrets, Services, and PVCs Without Breaking Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Troubleshooting

Description: Budget Jobs, Secrets, Services, and PVCs with object-count quotas while preserving controller overlap, retained history, and cleanup headroom.

---

An object-count quota can stop a runaway controller from filling the API server with objects. It can also prevent the next certificate renewal, scheduled Job, or StatefulSet replica. A useful quota starts with the objects controllers must create during transitions, not just the steady-state count.

Kubernetes documents the `count/<resource>.<group>` syntax in [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-on-object-count). Core API resources omit the group; Jobs use the `batch` group.

## Inventory the resources and their owners

```bash
ns=payments
kubectl get jobs,secrets,services,persistentvolumeclaims -n "$ns" -o json |
  jq -r '.items[] | [
    .kind, .metadata.name,
    (.metadata.deletionTimestamp // "-"),
    ([.metadata.ownerReferences[]? | select(.controller == true)
      | (.kind + "/" + .name)] | join(","))
  ] | @tsv'
```

This selects metadata for the displayed report, but the API response still contains Secret objects and their data. Run it only from an authorized environment; avoid saving or tracing the raw response. If you only need totals, `kubectl get` table output can reduce accidental exposure in your operational workflow.

An absent owner reference does not prove an object is unused. Helm release Secrets, application credentials, and PVCs may be managed through labels or external systems. Ask the responsible controller or team before reclaiming anything.

## Model temporary and retained objects

For each resource type, budget steady objects, transition overlap, retained history, and an explicit operational reserve. Treat the reserve as an engineering estimate to validate in a drill.

| Resource | Capacity that is easy to miss |
| --- | --- |
| Jobs | Finished Jobs retained for investigation; overlapping scheduled runs |
| Secrets | Certificate rotation, release history, generated credentials |
| Services | Parallel blue/green frontends and controller-created Services |
| PVCs | StatefulSet scale-out, retained claims, migration targets |

Completed Jobs count while their objects still exist. The [TTL-after-finished controller](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/) can make completed or failed Jobs eligible for cleanup after a chosen retention period, but cleanup is not instantaneous. Export needed logs and results before relying on deletion.

CronJob history limits and Job TTL solve related but distinct retention problems. Neither guarantees an immediate free slot if finalization or control-plane reconciliation is delayed.

## Apply a budget that matches the inventory

The following values illustrate a small namespace; replace them with the inventory-based budget:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-budget
  namespace: payments
spec:
  hard:
    count/jobs.batch: "40"
    count/secrets: "120"
    count/services: "30"
    count/persistentvolumeclaims: "50"
```

Do not add another quota expecting its allowance to add to an existing one. An operation must satisfy every applicable quota. Review both legacy names such as `secrets` and generic count keys when investigating an unexpected rejection.

Object count also does not replace capacity limits. Fifty PVCs could request a small or very large amount of storage. Add an independently chosen `requests.storage` budget when needed. Likewise, Service count and Service-type budgets such as `services.loadbalancers` constrain different dimensions.

## Test the controller's whole lifecycle

In a representative test namespace, exercise creation, update, replacement, rollback, and cleanup. Observe the maximum simultaneous object count during certificate rotation, a release upgrade, and a batch schedule with retained failures.

Inspect controller Events if a child object fails to appear:

```bash
kubectl get events -n "$ns" --sort-by=.metadata.creationTimestamp
kubectl describe resourcequota object-budget -n "$ns"
```

A Deployment, CronJob, or custom resource can be accepted while its controller later fails to create a dependent object. A successful server dry-run of the parent therefore does not prove the child creation will fit.

Include cleanup failures in the exercise. PVC protection and other finalizers intentionally delay deletion; the [finalizer documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/) explains why a deletion timestamp is not the same as object removal. Do not remove protection just to reduce a counter.

## Keep room for recovery work

A namespace at its hard Secret limit might be unable to store a replacement credential. A full Job budget might block a repair Job. Reserve enough slots for recovery or maintain a documented temporary quota adjustment procedure, with ownership and a later review of the budget.

After introducing the quota, monitor each counter separately and notify the team before normal transitions would exhaust the remaining allowance. The objective is a bounded controller failure with a clear recovery path, while ordinary rollout and rotation workflows continue to succeed.
