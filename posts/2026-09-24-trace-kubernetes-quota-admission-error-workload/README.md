# How to Trace a Kubernetes “exceeded quota” Admission Error Back to the Exact Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Troubleshooting

Description: Trace a rejected Pod creation through Events and owner references to the controller and workload that exceeded namespace quota.

---

A Deployment can be accepted while every Pod it tries to create is rejected. Looking for the missing Pod then produces a misleading result: there is no Pod object to describe. Start with the admission failure and follow the controller that attempted the creation.

This procedure uses `kubectl`, `jq`, and permission to read workloads, Events, ResourceQuotas, and LimitRanges in the affected namespace. The [Kubernetes quota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/) describes this distinction between accepting a workload object and admitting its Pods.

## Preserve the rejection before changing anything

Choose the namespace explicitly and record your context:

```bash
ns=payments
kubectl config current-context
kubectl get resourcequota -n "$ns" -o yaml
kubectl get events -n "$ns" --sort-by=.metadata.creationTimestamp
```

A quota rejection identifies the quota and resource, with the proposed increment, recorded usage, and allowed maximum. For example, `requested: requests.cpu=500m, used: requests.cpu=2, limited: requests.cpu=2` means that the new object needs another half core of request budget. It does not mean the containers are currently consuming two cores.

Distinguish `exceeded quota` from errors saying a resource must be specified. The first needs capacity or workload changes; the second usually needs explicit resource settings or suitable defaults. Node-pressure eviction and `FailedScheduling` happen at a different stage, after a Pod exists.

## Find the object that emitted FailedCreate

Read the core Event API as JSON so you can keep the involved object's identity:

```bash
kubectl get events -n "$ns" -o json | jq -r '
  .items[]
  | select((.message // "") | contains("exceeded quota"))
  | [.metadata.namespace, .involvedObject.kind,
     .involvedObject.name, .involvedObject.uid,
     (.reason // ""), .message]
  | @tsv'
```

For a Deployment rollout, the involved object is commonly the ReplicaSet whose Pod creation failed. A Job can emit a similar failure when creating a worker. If an object-count quota rejected the Job itself, inspect its CronJob or other creator instead. Events are retained for a limited time and can aggregate repeated failures; absence of an Event does not prove there was no rejection.

Suppose the Event identifies ReplicaSet `checkout-76b8c46c55`. Read it and its controlling owner:

```bash
rs=checkout-76b8c46c55
kubectl get replicaset "$rs" -n "$ns" -o json | jq '{
  name: .metadata.name,
  uid: .metadata.uid,
  owners: [.metadata.ownerReferences[]? | select(.controller == true)],
  replicas: .spec.replicas,
  containers: .spec.template.spec.containers
}'
```

Compare the UID with the Event, then follow the owner reference to the Deployment. Names can be reused; UIDs distinguish replacement objects. Kubernetes documents this relationship in [Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/).

## Inspect the template that actually failed

Read the identified controller's template, not just the newest manifest in Git. An older ReplicaSet may still be trying to create Pods, and a rollout may have changed requests between revisions. Check regular containers, init containers, priority class, and namespace LimitRanges:

```bash
kubectl get limitrange -n "$ns" -o yaml
kubectl get resourcequota -n "$ns" -o json | jq '
  .items[] | {name: .metadata.name, spec: .spec, status: .status}'
kubectl describe replicaset "$rs" -n "$ns"
```

Admission can add defaults or sidecars to the eventual Pod. CPU and memory accounting can also include init-container requirements, Pod overhead, and version-dependent Pod resource features. A manual sum of the application containers is therefore only a starting estimate. The [resource-management reference](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) explains the resource model.

## Fix the owning workload and verify recovery

Change the owning workload's template when requests are wrong. For an existing Job, resource changes require a suspended Job and cluster support for mutable Pod resources; otherwise, create a replacement Job with the corrected template. Updating a CronJob's job template affects only future Jobs. If the requested capacity is intentional, adjust the relevant quota through its normal management path after checking cluster capacity. Inspect every matching quota: a generous unscoped budget cannot override a tighter applicable scoped budget.

After the change, watch the owning controller and new Events. Confirm that a new Pod object appears, then confirm scheduling and readiness separately. A successful admission is progress, but the Pod can still fail scheduling, image pulls, or health checks. Capture the original Event, controller UID, quota name, and successful replacement Pod in the incident record so the diagnosis remains reproducible.
