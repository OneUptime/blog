# How to Debug a Failed CDI Importer Pod with DataVolume Events and Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Debugging

Description: Debug CDI imports methodically by correlating DataVolume conditions, PVC events, importer Pod state, termination details, and logs.

---

A failed CDI import is a controller workflow, not just a failed Pod. The DataVolume records the requested source and high-level phase, the PVC records provisioning and binding, and the importer Pod records transfer or conversion failures. Read them in that order to avoid treating a storage or scheduling problem as a network problem.

## Preserve the Worker Pod When Reproducing

CDI normally cleans up transfer Pods. For a reproducible test, add the documented retention annotation before the operation runs:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: debug-import
  namespace: vm-lab
  annotations:
    cdi.kubevirt.io/storage.pod.retainAfterCompletion: "true"
spec:
  source:
    http:
      url: https://images.example.com/debug.qcow2
  storage:
    storageClassName: fast-rwo
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 20Gi
```

Retained Pods consume API objects and can retain sensitive diagnostic context. Remove them according to your incident process after collecting evidence. CDI deletes them when their DataVolume or PVC is deleted, but deleting storage is not an appropriate cleanup method when data must be preserved.

## Read DataVolume Status and Events

Capture the complete object:

```bash
namespace=vm-lab
dv=debug-import

kubectl get datavolume "$dv" -n "$namespace" -o yaml
kubectl describe datavolume "$dv" -n "$namespace"
kubectl get events -n "$namespace" \
  --field-selector involvedObject.kind=DataVolume,involvedObject.name="$dv" \
  --sort-by=.metadata.creationTimestamp
```

Check the phase directly:

```bash
kubectl get datavolume "$dv" -n "$namespace" \
  -o jsonpath='{.status.phase}{"\n"}'
```

`Pending` and `WaitForFirstConsumer` mean no importer may exist yet. `ImportScheduled` means CDI intends to run it. `ImportInProgress` means the transfer is underway. `Failed` should have a condition, event, Pod termination, or controller log explaining why.

## Check the Underlying PVC

The target PVC normally has the same name as the DataVolume:

```bash
kubectl get pvc "$dv" -n "$namespace" -o yaml
kubectl describe pvc "$dv" -n "$namespace"
```

Resolve these before inspecting transfer logs:

- no StorageClass selected
- `FailedBinding`
- CSI provisioning failures
- unsupported access mode or volume mode
- storage quota exceeded
- topology-aware `WaitForFirstConsumer`
- scratch PVC provisioning failures

List related claims:

```bash
kubectl get pvc -n "$namespace" \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,MODE:.spec.volumeMode,STATUS:.status.phase
```

A temporary scratch claim may appear for registry imports, uploads, and HTTP operations that cannot stream directly.

## Locate the Importer Pod

CDI labels importer Pods with the component value `importer`:

```bash
kubectl get pods -n "$namespace" \
  -l cdi.kubevirt.io=importer \
  -o wide
```

If several imports are running, inspect owner references and the PVC name:

```bash
kubectl get pods -n "$namespace" --show-labels
kubectl describe pod importer-debug-import -n "$namespace"
```

The conventional name is `importer-<pvc-name>`, but discover it rather than hard-coding it into automation.

Describe output is essential for `ImagePullBackOff`, scheduling, mount, security-context, quota, or OOM failures:

```bash
kubectl get pod importer-debug-import -n "$namespace" \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{" reason="}{.state.terminated.reason}{" exit="}{.state.terminated.exitCode}{" waiting="}{.state.waiting.reason}{"\n"}{end}'
```

## Read Current and Previous Logs

Read the importer container:

```bash
kubectl logs importer-debug-import -n "$namespace" \
  -c importer \
  --timestamps
```

If the container restarted:

```bash
kubectl logs importer-debug-import -n "$namespace" \
  -c importer \
  --previous \
  --timestamps
```

Do not post full logs publicly without review. Source URLs, headers, internal names, and infrastructure details can be sensitive even when CDI avoids logging passwords.

## Map Symptoms to the Correct Layer

Use these common patterns:

- HTTP `401` or `403`: check `secretRef`, credential keys, permissions, and authentication type.
- HTTP `404`: confirm the final URL and redirects from inside the cluster network.
- `x509` errors: fix the source `certConfigMap`, certificate chain, SAN, or expiry.
- checksum mismatch: compare the configured checksum with the publisher's trusted value.
- `no space left`, `disk.img`, or qemu conversion errors: check qcow2 virtual size, filesystem overhead, scratch capacity, and target capacity.
- `OOMKilled`: inspect limits inherited from CDI configuration or a namespace LimitRange before increasing memory.
- Pod Pending: inspect scheduler events, taints, node selectors, volume topology, quotas, and PVC binding.
- permission denied on block devices: verify CDI's documented CRI ownership configuration for block-mode workloads.

Test network behavior from an approved diagnostic Pod only if policy allows it. Do not modify the importer container or bypass TLS, because that changes the failing path.

## Increase CDI Log Verbosity Temporarily

CDI documents `spec.config.logVerbosity` on the `CDI` custom resource:

```bash
kubectl get cdi cdi -o yaml
kubectl patch cdi cdi --type merge \
  --patch '{"spec":{"config":{"logVerbosity":4}}}'
```

This is a cluster-wide operator setting and restarts CDI components. Record the previous value and restore it after the incident. Higher verbosity can increase log volume and expose more operational metadata.

Controller logs are useful when no worker Pod is created:

```bash
kubectl get pods -n cdi
kubectl logs -n cdi deployment/cdi-deployment \
  --since=30m
```

The installation namespace or deployment name can differ, so discover them first.

## Capture a Minimal Incident Bundle

Collect timestamps, versions, and redacted resources:

```bash
kubectl version
kubectl get cdi cdi -o jsonpath='{.status.observedVersion}{"\n"}'
kubectl get datavolume "$dv" -n "$namespace" -o yaml
kubectl get pvc "$dv" -n "$namespace" -o yaml
kubectl describe pod importer-debug-import -n "$namespace"
```

Include StorageClass and StorageProfile definitions, but remove Secrets and sensitive annotations. This evidence makes it possible to distinguish a CDI defect from endpoint, Kubernetes, or storage-provider behavior.

## Official Documentation

- [CDI debugging and retained transfer Pods](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/debug.md)
- [CDI DataVolume phases and HTTP sources](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Kubernetes debug running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes application troubleshooting](https://kubernetes.io/docs/tasks/debug/debug-application/)
