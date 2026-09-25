# How to Roll Out ResourceQuota Changes Safely When Existing Workloads Already Exceed the New Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Deployment

Description: Lower namespace quotas in stages without confusing successful policy updates with workload safety or replacement capacity.

---

Reducing a ResourceQuota from forty CPU to twenty CPU does not shrink the requests of Pods already running. Kubernetes can accept the new quota while recorded usage remains above it. The next replacement or scale-out may then fail, turning a quiet policy change into an outage during a later node drain.

Plan quota reductions around the workloads that must continue and the transitions they need to complete.

## Understand what changing the quota does

The [ResourceQuota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/) states that quota changes do not affect already-created resources. Quota admission evaluates new requests; it is not an eviction mechanism that converges the namespace to the new limit.

Do not interpret this as a promise that all updates will succeed. Operations that need additional accounted resources can be rejected. Nor should you assume that deleting one Pod immediately makes a replacement safe: accounting reconciliation and a still-terminating Pod can affect the available budget.

For example, a namespace using thirty CPU under a proposed twenty-CPU ceiling may look healthy until a Deployment tries to create a replacement. “All current Pods are Running” is therefore an incomplete acceptance test.

## Capture a rollback policy and a workload baseline

Use the manifest from the current Git revision as the preferred rollback source. Capture observed state separately:

```bash
namespace=payments
kubectl -n "$namespace" get resourcequota -o yaml > quota-observed-before.yaml
kubectl -n "$namespace" get pods -o json > pods-before.json
kubectl -n "$namespace" get deploy,statefulset,hpa,job -o yaml > workloads-before.yaml
kubectl -n "$namespace" describe resourcequota
```

The [ResourceQuota API](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/resource-quota-v1/) distinguishes desired `spec.hard` from reported `status.hard` and `status.used`. Check status after changes; a successful write is not evidence that every observer has reconciled it.

For each quota resource, calculate current use, target steady use, rollout overlap, background work, and recovery margin. Keep quantities unit-aware: `500m` CPU, `500M` memory, and `500Mi` memory cannot be processed by stripping their suffixes.

Also inspect overlapping scopes. Lowering the general quota while forgetting a tighter PriorityClass-specific quota can leave the service unable to create Pods even when the general budget looks sufficient.

## Reduce demand before tightening admission

Agree on a target with the workload owner. Options include reducing replica counts after capacity testing, right-sizing requests, rescheduling batch work, or removing genuinely unused objects. Storage quotas may require a different plan because reducing a requested volume size is not a general way to shrink an existing PVC.

When an HPA owns scale, change its policy deliberately. A manual Deployment replica edit can be overwritten by the HPA. When reducing container requests, remember that updating a Pod template starts a rollout, and old and new Pods can coexist.

Keep the old quota high enough to complete that transition. The [Deployment strategy documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) describes surge and availability controls; lowering quota first can prevent the new ReplicaSet from making progress.

Avoid solving this by deleting an arbitrary collection of Pods. Controllers will try to recreate them, and the lower quota can turn a reversible policy decision into unavailable replicas.

## Stage and review the proposed policy

Prepare `quota-next.yaml` with the approved values and run:

```bash
kubectl -n "$namespace" diff -f quota-next.yaml
kubectl -n "$namespace" apply --dry-run=server -f quota-next.yaml
```

`kubectl diff` returns a nonzero status when differences exist; CI must distinguish that expected result from an actual command error. Server dry-run checks the policy request without persisting it. It does not simulate future controller activity, drain a node, or prove replacements will fit. See [Kubernetes API dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run).

Apply one namespace or tenant cohort first, using the normal change process. Wait for quota status and workload observations to settle before expanding. Compare available replicas, pending creations, and the service's health with the baseline.

## Test the transitions that expose hidden failures

In a safe rehearsal, verify a normal rollout, the agreed autoscaling peak, a replacement Pod, and expected maintenance Jobs. Include the termination overlap and any admission-injected sidecars. If a relevant action requires resources above the new hard ceiling, the design is incomplete even if today's steady state fits.

Set rollback triggers before applying: repeated quota-related `FailedCreate`, missed availability targets, or an inability to restore the agreed replica count. Restore the approved prior manifest through the same configuration owner so GitOps does not immediately reapply the reduction. Restoring quota enables admission again; it does not guarantee node capacity or instantaneous recovery.

Close the change when measured steady usage and required transitions fit the new policy with an explained margin. Retain the before-and-after observations so the next budget review starts from workload evidence.
