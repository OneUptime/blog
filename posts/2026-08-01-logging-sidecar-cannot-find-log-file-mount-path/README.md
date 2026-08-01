# Why a Logging Sidecar Cannot Find the App’s Log File—and How to Fix the Mount Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Logging, Volumes, Troubleshooting

Description: Fix logging sidecars that report missing files by tracing the application path, shared volume, sidecar mount path, permissions, startup timing, and rotation behavior.

---

A logging sidecar does not see the application container's writable image layer. Both containers may have a directory named `/var/log`, but those directories are unrelated unless a Kubernetes volume is mounted there.

The reliable model is:

```text
app path                 Pod volume                 sidecar path
/var/log/orders/app.log  application-logs/app.log  /logs/app.log
```

The two absolute paths can differ. The named volume and the file's path relative to the mount must line up.

## Start with the Admitted Pod, Not the Template

Sidecar injection, Helm rendering, Kustomize patches, and admission policies can change a Pod. Inspect the Pod that the API server actually stored:

```bash
POD=orders-7d8f6d9c8b-x2abc

kubectl get pod "$POD" -o yaml
kubectl describe pod "$POD"
```

For each container, record:

- the application's configured log filename;
- `volumeMounts[*].name` and `mountPath`;
- any `subPath` or `subPathExpr`;
- the sidecar's configured input path;
- the user and group that each process runs as.

Do not assume a mount shown for one container also applies to another. `volumeMounts` are declared per container.

## Mount One Named Volume into Both Containers

This Pod lets the app write `/var/log/orders/orders.log` and the reader consume `/input/orders.log`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: orders
spec:
  securityContext:
    fsGroup: 2000
  containers:
    - name: app
      image: example.com/orders@sha256:REPLACE_ME
      env:
        - name: LOG_FILE
          value: /var/log/orders/orders.log
      volumeMounts:
        - name: application-logs
          mountPath: /var/log/orders

    - name: log-reader
      image: example.com/log-reader@sha256:REPLACE_ME
      args: ["--path=/input/orders.log"]
      volumeMounts:
        - name: application-logs
          mountPath: /input
          readOnly: true

  volumes:
    - name: application-logs
      emptyDir: {}
```

The crucial equality is:

```text
app:     volume application-logs + /orders.log
sidecar: volume application-logs + /orders.log
```

If the app writes `/var/log/orders/archive/orders.log`, the sidecar must read `/input/archive/orders.log`.

## Diagnose the Common Failure Modes

### The app writes outside the mount

If the volume is mounted at `/var/log/orders` but the application writes `/var/log/orders.log`, the file lands in the app container's private writable layer. Change the application path or mount the volume at the actual parent directory.

### The volume names differ

Two separate `emptyDir` entries are two separate directories even if both are mounted at `/logs`. Both `volumeMounts` must reference the same `.spec.volumes[*].name`.

### A file-level `subPath` hides rotation

Mounting one file with `subPath` can make replacement-based rotation surprising. Many rotators rename the old file and create a new inode; a process holding the old file or mount may continue following the old object. Prefer mounting the containing directory and configure the collector for rename-and-create rotation.

### Permissions do not match

A read-only mount only prevents writes; it does not bypass Unix ownership and mode bits. Compare numeric identities and permissions:

```bash
kubectl exec "$POD" -c app -- id
kubectl exec "$POD" -c app -- ls -lnd /var/log/orders /var/log/orders/orders.log
kubectl exec "$POD" -c log-reader -- id
kubectl exec "$POD" -c log-reader -- ls -lnd /input /input/orders.log
```

Use compatible `runAsUser`, `runAsGroup`, `fsGroup`, and file modes. Do not fix a simple group mismatch by making the sidecar privileged or world-writable.

### The file does not exist yet

Container startup is concurrent for ordinary app containers. A reader that exits when its input is absent can enter a restart loop before the app creates the file. Configure the collector to wait or retry. A startup probe can defer liveness and readiness checks while a native sidecar starts, but it cannot keep the reader process from exiting or make a nonexistent file appear.

### The configuration names a directory as a file

Check whether the agent expects a glob, directory, socket, or file. Quote globs in YAML so the agent, rather than a shell or templating layer, interprets them.

## Prove Both Views Point to the Same Data

Use a harmless marker in a test environment:

```bash
kubectl exec "$POD" -c app -- sh -c 'printf "%s\n" mount-check >> /var/log/orders/probe.log'
kubectl exec "$POD" -c log-reader -- tail -n 1 /input/probe.log
```

If the second command cannot see the marker, compare mount information:

```bash
kubectl exec "$POD" -c app -- mount
kubectl exec "$POD" -c log-reader -- mount
```

Minimal or distroless images may lack these tools. Use `kubectl debug` with a custom profile that mounts the shared volume, or create a copy of the Pod with a debugging container and the same volume mount, instead of modifying the production image.

## Prefer stdout and stderr When You Can

Kubernetes' simplest logging path is for the application to write to stdout and stderr. The container runtime records those streams, kubelet exposes them through `kubectl logs`, and a node-level agent can forward them.

A file-reading sidecar is justified when you cannot change a legacy application's file output, need to split or transform streams before node collection, or must read an application-specific socket. It also adds CPU, memory, configuration, a second failure mode, and rotation responsibility to every app replica.

Even with a sidecar, decide who owns:

- file creation and permissions;
- rotation and retention inside the Pod;
- position or checkpoint files;
- backpressure and disk-full behavior;
- delivery after a Pod is deleted.

An `emptyDir` survives a container restart but disappears with the Pod. A durable central backend, not the shared directory, should normally provide log retention.

## Official Documentation

- [Kubernetes: Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes: Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
