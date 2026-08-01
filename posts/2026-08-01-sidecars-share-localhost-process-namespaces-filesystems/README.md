# Do Sidecars Share localhost, Process Namespaces, and Filesystems with the App Container?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Pods, Networking, Storage, Linux

Description: Understand exactly what app and sidecar containers share inside a Kubernetes Pod, including localhost, ports, processes, root filesystems, and explicitly mounted volumes.

---

Putting two containers in one Kubernetes Pod gives them a much tighter boundary than putting them in two Pods. It does **not**, however, merge them into one container.

The practical rules are:

| Resource | Shared by default? | Important qualification |
| --- | --- | --- |
| Pod IP and network namespace | Yes | Both containers use the same localhost and port space. |
| Process ID namespace | No | Set `spec.shareProcessNamespace: true` if the workload needs it. |
| Image root filesystem | No | Each container keeps the filesystem from its own image and writable layer. |
| Kubernetes volumes | Only when mounted | Both containers must mount the same named Pod volume; mount paths can differ. |
| CPU and memory budget | Pod-level scheduling, container-level enforcement | Each container normally has its own requests and limits. |
| Lifecycle | Co-located but independent | A container can restart without recreating the other containers. |

These distinctions explain many sidecar failures that look mysterious at first.

## localhost Is Shared

All containers in a Pod share the Pod network namespace. They have one Pod IP and communicate over loopback:

```text
app container       http://127.0.0.1:15001       proxy sidecar
     \_____________________ same Pod _____________________/
```

No Kubernetes Service is required for that hop. If the sidecar listens on `127.0.0.1:15001`, the app can connect to that address directly.

The shared namespace also means there is one socket space. The app and sidecar cannot both bind TCP `0.0.0.0:8080`. Declaring two `containerPort: 8080` fields does not create separate namespaces or reserve the port; the processes' actual `bind(2)` calls determine whether a collision occurs.

Inspect listeners from a container that has the necessary tool:

```bash
kubectl exec checkout-7c9d -c app -- ss -lntup
kubectl exec checkout-7c9d -c proxy -- ss -lntup
```

Both commands inspect the same Pod network namespace, although the images may contain different utilities and permissions.

## Processes Are Isolated Unless You Opt In

By default, a Linux container does not get a view of every process in the other containers. A `ps` command in the sidecar may show only its own process tree.

Enable Pod process namespace sharing explicitly when the design requires cross-container inspection or signaling:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: worker-with-helper
spec:
  shareProcessNamespace: true
  containers:
    - name: worker
      image: example.com/worker@sha256:REPLACE_ME
    - name: helper
      image: example.com/helper@sha256:REPLACE_ME
```

With `shareProcessNamespace: true`, processes are visible across containers through `/proc`. This changes security assumptions:

- command-line arguments and other process information may become visible;
- a sufficiently privileged process may signal another container's process;
- `/proc/<pid>/root` can expose another container's filesystem subject to Linux permissions;
- PID 1 represents the Pod sandbox rather than the main process of each container.

Do not enable it merely to make debugging convenient. `kubectl debug --target=<container>` can target another container's process namespace for an investigation when the container runtime supports that behavior.

## Root Filesystems Stay Separate

An image path is not automatically a shared path. If the app writes to `/var/log/app.log` in its container writable layer, a sidecar with its own `/var/log/app.log` sees a different file.

Share files through a Pod volume and mount that same volume into both containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-with-log-reader
spec:
  containers:
    - name: api
      image: example.com/api@sha256:REPLACE_ME
      volumeMounts:
        - name: application-logs
          mountPath: /var/log/application
    - name: log-reader
      image: example.com/log-reader@sha256:REPLACE_ME
      volumeMounts:
        - name: application-logs
          mountPath: /input
          readOnly: true
  volumes:
    - name: application-logs
      emptyDir: {}
```

Here `/var/log/application/access.log` in the app and `/input/access.log` in the sidecar refer to the same volume entry. The paths need not match; the volume name and relative path do.

An `emptyDir` lasts for the life of the Pod and survives individual container restarts, but it is deleted when the Pod is removed. Use persistent storage only when the data must outlive the Pod, and prefer stdout/stderr plus cluster-level log collection for ordinary application logs.

## What “Share Storage” Really Means

Kubernetes documentation sometimes summarizes sidecars as sharing network and storage with app containers. For storage, read that as **they can mount the same Pod volumes**, not as “all files are shared.”

Check all four layers when a sidecar cannot see a file:

1. the application writes to the path you think it does;
2. that path is beneath a volume mount rather than the image writable layer;
3. the sidecar mounts the same `.spec.volumes[*].name`;
4. its `mountPath`, relative filename, user ID, group ID, and permissions allow access.

`kubectl describe pod` lists mounts by container. For exact paths, inspect the admitted Pod:

```bash
kubectl get pod api-with-log-reader -o yaml
kubectl exec api-with-log-reader -c api -- ls -ln /var/log/application
kubectl exec api-with-log-reader -c log-reader -- ls -ln /input
```

## Choose the Boundary Deliberately

A sidecar is a good fit when the helper must:

- follow the app onto the same node;
- use localhost for low-latency communication;
- consume a Pod-local socket or volume;
- start and stop with each app replica.

Use a separate workload and a Service when the helper needs independent replicas, failure isolation, placement, release cadence, or resource scaling. Network and storage sharing are conveniences, but they are also coupling.

## Official Documentation

- [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes: Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes: Share Process Namespace between Containers in a Pod](https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/)
- [Kubernetes: Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
