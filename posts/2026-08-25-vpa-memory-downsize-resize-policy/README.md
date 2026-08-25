# Why VPA Cannot Downsize Memory In Place: resizePolicy and Eviction Fallback Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Memory Management, In-Place Resize, Pod Eviction

Description: Explain version-dependent memory downscaling, container resizePolicy choices, immutable QoS constraints, and when VPA InPlaceOrRecreate must defer or evict.

---

Memory downscaling is harder than CPU downscaling because a new memory limit can be below what the process currently uses. Whether VPA can apply the change without replacing the Pod depends on the Kubernetes version, whether VPA changes requests only or requests and limits, the container's `resizePolicy`, current usage, and the Pod's Quality of Service class.

The title's “cannot” is not universal on current Kubernetes. Kubernetes 1.35 and later can attempt a no-restart memory-limit decrease on a best-effort basis. Kubernetes 1.33–1.34 had stricter beta limitations, and a restart-required policy deliberately restarts the container. VPA still falls back to Pod eviction in `InPlaceOrRecreate` when the resize cannot complete.

## Separate Request and Limit Changes

By default, VPA uses `controlledValues: RequestsAndLimits`. It changes a controlled request and scales an existing limit to preserve the request-to-limit ratio. A memory scale-down can therefore lower both values.

With `RequestsOnly`, VPA leaves limits unchanged:

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: app
      controlledResources: [memory]
      controlledValues: RequestsOnly
```

Lowering only a memory request avoids the dangerous limit reduction, but the resize must still preserve the Pod's original QoS class. A Pod created as `Guaranteed` must keep requests equal to limits for CPU and memory; lowering only its request would make it `Burstable`, so an in-place resize cannot apply it. Design the original resource shape for the intended policy.

## Choose `resizePolicy` Explicitly

```yaml
spec:
  containers:
    - name: app
      resizePolicy:
        - resourceName: cpu
          restartPolicy: NotRequired
        - resourceName: memory
          restartPolicy: RestartContainer
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "1"
          memory: 2Gi
```

The valid policy values are:

- `NotRequired`, the default when omitted, asks kubelet to resize the running container without restarting it.
- `RestartContainer` lets kubelet restart that container to apply the resource change while retaining the Pod object.

A restart is still application disruption even though the Pod UID does not change. Readiness probes, termination behavior, and replica availability must tolerate it. A Pod whose overall `restartPolicy` is `Never` cannot use `RestartContainer`, which matters for Jobs.

## Account for Kubernetes Version Behavior

For Kubernetes 1.35 and later, a memory-limit decrease with `NotRequired` is best effort. Kubelet checks current usage before lowering the limit; if usage exceeds the desired limit, the change is skipped and remains in progress. A race can still cause an OOM if usage rises immediately after the check.

For the 1.33 beta behavior documented by Kubernetes, a memory limit could not be decreased unless memory used `RestartContainer`. VPA's feature documentation also describes the older no-restart limitation. Always consult the documentation for the server and node version actually running, especially during a skewed cluster upgrade.

Check desired and actual values independently:

```bash
kubectl -n search get pod indexer-xxxxx -o json | jq '{
  desired: [.spec.containers[] | {name, resources}],
  actual: [.status.containerStatuses[] | {name, resources, restartCount}],
  resizeConditions: [.status.conditions[] | select(.type == "PodResizePending" or .type == "PodResizeInProgress")]
}'
```

## Understand VPA's Fallback Clock

In `InPlaceOrRecreate`, current upstream VPA can fall back to eviction when kubelet reports `Infeasible`, when a resize error occurs, after a `Deferred` resize has lasted more than 5 minutes, or after `PodResizeInProgress` has lasted more than 1 hour. A QoS-class-changing patch is also unsuitable for in-place application.

```yaml
spec:
  updatePolicy:
    updateMode: InPlaceOrRecreate
```

Fallback is not instantaneous for every pending state. It is also not guaranteed to proceed: VPA's replica restrictions and any PodDisruptionBudget must permit eviction, and the owning controller plus VPA admission webhook must recreate a valid Pod.

If eviction is never acceptable, VPA 1.7's alpha `InPlace` mode can be enabled with `--feature-gates=InPlace=true` on both the admission controller and updater. It never falls back to eviction; an infeasible or persistently high-usage memory downsize can therefore remain unapplied indefinitely.

## Diagnose the Specific Blocker

```bash
kubectl -n search get vpa indexer -o yaml
kubectl -n search describe pod indexer-xxxxx
kubectl -n search get events --sort-by=.lastTimestamp | tail -n 40
kubectl -n kube-system logs deploy/vpa-updater --since=30m
```

Ask these questions in order:

1. Did VPA recommend a lower request, a lower limit, or both?
2. Does the policy require a container restart?
3. Would the new values change `Guaranteed`, `Burstable`, or `BestEffort` class?
4. Is current memory usage already above the proposed limit?
5. Does the Pod report `Deferred`, `Infeasible`, or `InProgress`?
6. If fallback is due, do min replicas and the PDB allow eviction?

Do not force a lower limit merely to clear an in-progress condition. Validate working set and peak behavior, then raise `minAllowed.memory`, retain the existing limit with `RequestsOnly`, or perform a controlled restart.

## Official Documentation

- [Kubernetes in-place container resize and current limitations](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes 1.35 in-place Pod resize GA changes](https://kubernetes.io/blog/2025/12/19/kubernetes-v1-35-in-place-pod-resize-ga/)
- [Kubernetes Pod Quality of Service classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [VPA in-place behavior and fallback](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA controlledValues API](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containercontrolledvalues)
- [VPA admission validation for the InPlace gate](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [VPA in-place restriction source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)

## Conclusion

Treat memory request reduction, memory limit reduction, container restart, and Pod recreation as different operations. `RequestsOnly` can avoid touching a limit, `RestartContainer` can apply a disruptive memory change within the Pod, and Kubernetes 1.35+ can attempt no-restart limit decreases only best effort. `InPlaceOrRecreate` converts unresolved resize states into eviction when its timeout and availability rules allow.
