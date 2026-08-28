# How to Enforce Namespace Defaults and Quotas for Kubernetes Ephemeral Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ephemeral Storage, LimitRange, ResourceQuota, Namespace, Policy

Description: Inject per-container local-storage requests and limits, cap their namespace totals, and cover emptyDir and generated PVC gaps with explicit policy.

---

Kubernetes local ephemeral storage is a schedulable resource named `ephemeral-storage`. A namespace can use a `LimitRange` to inject or constrain per-container requests and limits, and a `ResourceQuota` to cap the sum declared by Pods in that namespace.

Use both. The Kubernetes local-ephemeral-storage documentation notes that quota enforcement depends on Pods specifying the resource values. Defaults applied during admission close that gap for containers that omit them. These policies control declarations at API admission; kubelet still measures actual node usage and evicts Pods that exceed applicable limits or encounter node pressure.

## Decide What the Budget Includes

Disk-backed local ephemeral storage includes:

- container writable layers;
- node-level container logs;
- disk-backed `emptyDir` volumes.

A memory-backed `emptyDir` is charged as memory instead. Generic ephemeral volumes create PVC-backed storage, so they consume PVC and `requests.storage` quota rather than the local `ephemeral-storage` resource.

Separate these three budgets in policy:

1. local disk use declared on containers;
2. `emptyDir.sizeLimit` for individual scratch volumes;
3. PVC count and capacity for generic ephemeral or persistent volumes.

## Add Per-Container Defaults with LimitRange

This policy gives each container a default 1 GiB request and 2 GiB limit, while enforcing a per-container range:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: local-ephemeral-storage-defaults
  namespace: workloads
spec:
  limits:
    - type: Container
      defaultRequest:
        ephemeral-storage: 1Gi
      default:
        ephemeral-storage: 2Gi
      min:
        ephemeral-storage: 128Mi
      max:
        ephemeral-storage: 8Gi
```

At Pod admission, the LimitRange admission controller injects omitted defaults and rejects values outside the allowed range. If a workload supplies its own valid request or limit, that value remains.

Test the exact manifest against the Kubernetes version and admission stack used by the cluster. LimitRange changes do not retrofit running Pods; restart a controller's Pods to receive new defaults after verifying the rollout impact.

Avoid multiple LimitRange objects that provide defaults for the same resource in one namespace. Kubernetes documents that when two or more LimitRanges exist, which default is applied is not deterministic.

## Cap Declared Namespace Totals with ResourceQuota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: local-ephemeral-storage-budget
  namespace: workloads
spec:
  hard:
    requests.ephemeral-storage: 40Gi
    limits.ephemeral-storage: 80Gi
```

The request quota caps the sum used for scheduling declarations. The limit quota caps the sum of maximum local-storage declarations admitted for Pods. This is not a live-usage pool and does not partition a physical disk per namespace.

Apply both objects and inspect their admitted form:

```bash
kubectl apply -f limitrange.yaml
kubectl apply -f resourcequota.yaml

kubectl describe limitrange local-ephemeral-storage-defaults -n workloads
kubectl describe resourcequota local-ephemeral-storage-budget -n workloads
```

## Verify Default Injection

Create a disposable Pod with no explicit ephemeral-storage values:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: policy-check
  namespace: workloads
spec:
  restartPolicy: Never
  containers:
    - name: check
      image: registry.k8s.io/pause:3.10
```

Read back what the API server stored:

```bash
kubectl get pod policy-check -n workloads \
  -o jsonpath='{.spec.containers[0].resources}{"\n"}'
```

Expected values include the injected 1 GiB request and 2 GiB limit. Check quota accounting:

```bash
kubectl get resourcequota local-ephemeral-storage-budget \
  -n workloads -o yaml
```

Then delete the test Pod. Use server-side dry run for workload manifests before rollout:

```bash
kubectl apply --dry-run=server -f deployment.yaml -o yaml
```

Client-side dry run cannot reproduce all admission defaults and quota checks.

## Understand Request and Limit Defaulting

Kubernetes resource defaulting can copy a specified limit into the request when no request was provided and no admission mechanism supplied one. An explicit `defaultRequest` makes the scheduling policy visible and lets it differ from the burst limit.

Choose requests from measured steady usage plus scheduling headroom. Choose limits from the maximum tolerable logs, writable layer, and shared disk-backed `emptyDir` use. Excessively low defaults produce preventable evictions; excessively high requests strand node capacity and consume namespace quota.

The Pod-level local ephemeral-storage limit is derived from the sum of container limits. A shared `emptyDir` counts against that Pod total, so defaults must budget more than container logs and writable layers alone.

## Add Explicit emptyDir Policy

A LimitRange does not inject `emptyDir.sizeLimit`. Require workload owners to set it:

```yaml
volumes:
  - name: scratch
    emptyDir:
      sizeLimit: 1Gi
```

Use a validating or mutating admission policy if every disk-backed `emptyDir` must have a maximum. Keep that policy separate from the LimitRange so users get a clear error about the missing volume field.

`sizeLimit` is not a scheduling request and does not replace `resources.requests.ephemeral-storage`. It also is not a hard filesystem quota; kubelet monitors usage and evicts after detecting an overage.

## Quota Generic Ephemeral Volumes Separately

A user who can create a Pod with a generic ephemeral volume can indirectly create a PVC. Normal namespace storage quota still applies. For a StorageClass named `fast-scratch`, a combined policy can include:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: pvc-scratch-budget
  namespace: workloads
spec:
  hard:
    persistentvolumeclaims: "20"
    requests.storage: 200Gi
    fast-scratch.storageclass.storage.k8s.io/persistentvolumeclaims: "10"
    fast-scratch.storageclass.storage.k8s.io/requests.storage: 100Gi
```

Use a PVC-type LimitRange when each generated claim must also stay within a minimum and maximum size. Local `ephemeral-storage` quota does not count capacity requested through a PVC.

## Observe Rejections and Evictions Separately

Admission policy failures appear when the Pod is created:

```bash
kubectl get events -n workloads --sort-by=.metadata.creationTimestamp
kubectl describe resourcequota -n workloads
```

Runtime overages appear as Pod eviction status and node events:

```bash
kubectl describe pod POD_NAME -n workloads
kubectl describe node NODE_NAME
```

A Pod can be admitted under quota and later be evicted for exceeding its own local-storage limit. It can also be evicted by node `DiskPressure` while under that limit. ResourceQuota does not prevent other namespaces, system logs, container images, or host processes from filling a shared node filesystem.

## Roll Out Without Breaking Existing Workloads

1. Measure current requests, limits, actual usage, and eviction history.
2. Audit manifests that omit local-storage values.
3. Apply the LimitRange to a test namespace.
4. use server-side dry run and a disposable Pod to verify defaulting.
5. Add quota above current admitted totals with planned growth.
6. Roll deployments gradually and watch Pending Pods and evictions.
7. Tighten defaults only after observing real workloads.

Existing Pods remain unchanged, but a later rollout or replacement Pod is subject to the new policy. A controller can therefore fail only when it tries to replace a previously admitted replica.

## Official Documentation

- [Kubernetes: local ephemeral storage accounting, limits, and quota note](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: LimitRange behavior and defaulting](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: resource quotas, including local ephemeral storage and StorageClass scope](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes API: LimitRange](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/limit-range-v1/)
- [Kubernetes: limiting PVC storage consumption](https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/)
- [Kubernetes: emptyDir behavior](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)

## Conclusion

Use a Container LimitRange to inject explicit `ephemeral-storage` requests and limits, then cap their namespace sums with ResourceQuota. Add separate policy for `emptyDir.sizeLimit` and separate PVC quotas for generic ephemeral volumes. Verify admission defaults server-side and remember that namespace quota governs declarations; kubelet eviction and node disk pressure still govern actual runtime survival.
