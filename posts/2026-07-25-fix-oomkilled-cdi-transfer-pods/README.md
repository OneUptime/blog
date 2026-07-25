# How to Fix OOMKilled CDI Import, Clone, and Upload Pods on Slow Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, Memory, Troubleshooting

Description: Diagnose OOMKilled CDI worker Pods and tune global resource requests and limits without confusing slow storage with the memory root cause.

---

`OOMKilled` means the container exceeded a memory limit or the node experienced memory pressure. Slow storage can make CDI conversion and copy Pods live longer, increasing exposure to memory peaks and node contention, but transfer duration alone is not proof that storage caused the out-of-memory termination.

CDI creates short-lived worker Pods for import, upload, and host-assisted clone operations. Their resources come from CDI configuration and can also be affected by namespace LimitRanges, ResourceQuotas, admission policies, and node capacity.

## Prove It Was an OOM Kill

Find the relevant worker Pod:

```bash
kubectl get pods -n vm-images -o wide
kubectl describe pod importer-large-image -n vm-images
```

Read current and previous termination states:

```bash
kubectl get pod importer-large-image -n vm-images \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{" reason="}{.lastState.terminated.reason}{" exit="}{.lastState.terminated.exitCode}{" current="}{.state.terminated.reason}{"\n"}{end}'

kubectl logs importer-large-image -n vm-images \
  -c importer \
  --previous \
  --timestamps
```

An exit code of 137 is consistent with SIGKILL but is not, by itself, proof of a memory-limit breach. The `reason: OOMKilled` status and node events are stronger evidence.

Check the DataVolume and all recent events:

```bash
kubectl describe datavolume large-image -n vm-images
kubectl get events -n vm-images \
  --sort-by=.metadata.creationTimestamp
```

## Find the Effective Limit

Inspect resources on the actual Pod:

```bash
kubectl get pod importer-large-image -n vm-images \
  -o jsonpath='{range .spec.containers[*]}{.name}{" requests="}{.resources.requests}{" limits="}{.resources.limits}{"\n"}{end}'
```

Then inspect each source of defaults:

```bash
kubectl get cdi cdi -o yaml
kubectl get cdiconfig config -o yaml
kubectl get limitrange,resourcequota -n vm-images -o yaml
```

CDI documents `spec.config.podResourceRequirements` as the global setting for its utility Pods. CDI's own default is no explicit CPU or memory request or limit. A namespace LimitRange may still inject a memory limit, so do not assume an empty CDI configuration means an unlimited Pod.

Also inspect node pressure and eviction events:

```bash
kubectl describe node worker-03
kubectl top pod importer-large-image -n vm-images --containers
kubectl top node worker-03
```

Metrics are only useful while the Pod is alive and require Metrics Server or another metrics path.

## Set Deliberate CDI Worker Resources

Choose values from measurements on representative image formats and sizes. This example is a starting shape, not a universal recommendation:

```bash
kubectl patch cdi cdi \
  --type merge \
  --patch '{
    "spec": {
      "config": {
        "podResourceRequirements": {
          "requests": {
            "cpu": "250m",
            "memory": "512Mi"
          },
          "limits": {
            "cpu": "2",
            "memory": "2Gi"
          }
        }
      }
    }
  }'
```

Verify the reconciled configuration:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.defaultPodResourceRequirements}{"\n"}'
kubectl get cdi cdi \
  -o jsonpath='{.spec.config.podResourceRequirements}{"\n"}'
```

This change is cluster-wide for CDI utility Pods. A high request can make every transfer harder to schedule; a high limit can allow many simultaneous transfers to exhaust a node. Keep requests realistic, enforce sensible concurrency operationally, and ensure namespace quota can admit the new values.

Do not set memory limits lower than requests. Do not remove limits blindly in a multi-tenant cluster.

## Retest Without Destroying Good Data

After changing configuration, watch whether CDI recreates the failed worker:

```bash
kubectl get datavolume,pvc,pod -n vm-images -w
```

CDI has operation-specific retry behavior, and behavior can differ by version. Do not delete a DataVolume or PVC until you understand ownership and whether it contains useful data. For a disposable failed import, a new DataVolume name provides a clean retest without risking another disk.

Retain a worker Pod for the controlled reproduction:

```yaml
metadata:
  annotations:
    cdi.kubevirt.io/storage.pod.retainAfterCompletion: "true"
```

Remove retained diagnostic Pods after evidence collection.

## Check Problems That Look Like Memory Pressure

Long transfers can fail for several independent reasons:

- target or scratch PVC latency and timeouts
- insufficient scratch capacity
- filesystem capacity lower than the image's virtual size
- CPU throttling during qcow2 conversion
- a proxy closing a long synchronous upload
- node disk pressure from container logs or `emptyDir`
- many concurrent CDI workers competing on one node

For qcow2 images, compare allocated file size with virtual size:

```bash
qemu-img info --output=json ./large-image.qcow2
```

For storage, inspect latency and backend health using the CSI vendor's supported tools. Raising memory cannot correct a stalled provisioner or undersized target.

CDI may require a scratch PVC for pod-pull registry imports, uploads, and some HTTP imports. Registry imports that use `pullMethod: node` do not create that scratch PVC. Scratch is storage-backed and normally the same requested size as the DataVolume. Its failure is visible through PVC events, not as a reason to inflate worker memory.

## Tune Capacity and Concurrency Together

A 2 GiB limit may be safe for one conversion and unsafe when 50 transfers share a node. Use node affinity or CDI workload placement supported by your platform, admission controls, or workflow-level concurrency to spread work. Monitor:

- OOM kill counts by CDI component
- peak working-set memory per image format
- transfer duration and throughput
- pending worker Pods caused by requests
- node memory pressure
- storage latency and queue depth

Increase a limit only after showing that the process legitimately needs more memory. If usage grows without bound for one image, preserve the Pod and logs and compare against the current CDI release notes before treating it as normal sizing.

## Official Documentation

- [CDI ResourceQuota and podResourceRequirements](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/quota.md)
- [CDI configuration fields](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [Kubernetes container resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes LimitRanges](https://kubernetes.io/docs/concepts/policy/limit-range/)
