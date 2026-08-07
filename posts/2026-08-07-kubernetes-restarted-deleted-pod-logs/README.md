# Kubernetes Logs After Container Restart or Pod Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Pod Logs, Logging, CrashLoopBackOff, Incident Response

Description: Retrieve current and previous container logs correctly, understand what Pod deletion removes, and design logging that survives Kubernetes object churn.

---

If a container restarted but its Pod still exists, `kubectl logs --previous` can retrieve the previous container instance's log. If the Pod object has already been deleted, `kubectl logs` cannot retrieve it: the API no longer has a Pod to route the request through, and a replacement Pod is a different object even when it has the same labels.

That boundary should shape both incident response and logging architecture. Kubernetes provides a useful node-local log interface, but it is not a durable cluster-level log archive.

## Identify what disappeared

Three events are often described as “the Pod restarted,” but they require different commands:

| What happened | Pod UID | Container restart count | Built-in retrieval |
| --- | --- | --- | --- |
| A container restarted inside the same Pod | Unchanged | Increases | `kubectl logs --previous` |
| A Deployment replaced a Pod | New UID and usually new name | Starts from zero | Query each existing Pod; old Pod needs a log backend |
| The Pod was deleted and no replacement exists | Gone | Not queryable | Log backend or a best-effort node investigation |

Kubernetes Pods are not restarted in place by a Deployment. The kubelet can restart a container inside a Pod according to its restart policy. A workload controller can instead create a new Pod after the old Pod is deleted or fails. Always record the namespace, Pod name, Pod UID, container name, node, and incident time.

For an existing Pod:

```bash
POD=checkout-7b8f9d6c5-x4k2m
NAMESPACE=production

kubectl get pod "$POD" -n "$NAMESPACE" \
  -o custom-columns='NAME:.metadata.name,UID:.metadata.uid,NODE:.spec.nodeName,PHASE:.status.phase'

kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\trestarts="}{.restartCount}{"\tcurrent="}{.state}{"\tprevious="}{.lastState}{"\n"}{end}'
```

This prevents a common mistake: reading logs from a healthy replacement and assuming they belong to the failed Pod.

## Retrieve the current container log

Specify namespace and container explicitly, especially in multi-container Pods:

```bash
kubectl logs "$POD" -n "$NAMESPACE" -c app \
  --timestamps --since=30m
```

Useful bounds include:

```bash
# Last 200 lines.
kubectl logs "$POD" -n "$NAMESPACE" -c app --tail=200

# Logs after an RFC3339 incident timestamp.
kubectl logs "$POD" -n "$NAMESPACE" -c app \
  --since-time=2026-08-07T09:35:00Z --timestamps

# Continue following even if errors occur.
kubectl logs "$POD" -n "$NAMESPACE" -c app \
  --follow --ignore-errors=true
```

`kubectl logs` asks the kubelet on the Pod's node for the container log. The container runtime captures stdout and stderr in the Container Runtime Interface logging format. Files that the application writes only inside its own filesystem do not appear unless the application or a sidecar also streams them to stdout or stderr.

## Retrieve the previous container instance

When `restartCount` is greater than zero, request the terminated instance:

```bash
kubectl logs "$POD" -n "$NAMESPACE" -c app \
  --previous --timestamps --tail=500

# Short form for --previous.
kubectl logs "$POD" -n "$NAMESPACE" -c app -p
```

This is the first command to use for `CrashLoopBackOff`, a liveness-probe restart, or an OOM-killed container. The current instance may have emitted nothing yet, while the previous instance contains the error.

Check its termination metadata beside the log:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\treason="}{.lastState.terminated.reason}{"\texit="}{.lastState.terminated.exitCode}{"\tfinished="}{.lastState.terminated.finishedAt}{"\n"}{end}'

kubectl describe pod "$POD" -n "$NAMESPACE"
```

`--previous` means the previous instance of that **named container in that existing Pod**. It is not arbitrary log history. The kubelet keeps one terminated container and its logs by default; after additional restarts and log rotation, older output is not available through this interface.

Repeat the process for every relevant container:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{.spec.containers[*].name}{"\n"}{.spec.initContainers[*].name}{"\n"}'

kubectl logs "$POD" -n "$NAMESPACE" -c network-proxy -p
kubectl logs "$POD" -n "$NAMESPACE" -c migrate-database
```

Completed init containers normally use the regular form without `--previous`; use `--previous` only if that particular init or native-sidecar container restarted and has a prior instance.

## Know the rotation limit

Even while a Pod exists, `kubectl logs` is not guaranteed to return every byte the container ever wrote. Kubelet rotates container logs. Upstream kubelet configuration uses `containerLogMaxSize` and `containerLogMaxFiles` to control rotation, and the Kubernetes logging documentation notes that `kubectl logs` exposes only the latest log file.

Consequences include:

- a high-volume crash can rotate away its earliest evidence;
- `--since` cannot recover lines no longer present in the served file;
- raising retained files on the node does not make all rotated files available through `kubectl logs`;
- node disk pressure can accelerate garbage collection and Pod eviction.

Use `--tail`, `--since-time`, and `--limit-bytes` to bound an interactive request, not as retention controls.

## What happens after Pod deletion

After the Pod object is deleted, this fails:

```bash
kubectl logs deleted-pod -n production -c app
# Error from server (NotFound): pods "deleted-pod" not found
```

Passing a Deployment, label, or new Pod name retrieves logs from currently selected Pods, not from the deleted UID. Kubernetes does not provide an API that searches historical container logs by old Pod name.

Node-local files may remain briefly under the kubelet's Pod log directory, typically beneath `/var/log/pods` on Linux. Their survival is an implementation and garbage-collection detail, not a retention contract. Node access also carries significant security risk. If an incident is severe and no backend exists, preserve the node and follow the cluster provider's supported forensic procedure before rotation or garbage collection removes evidence. Do not assume that recreating a Pod or rescheduling it to the same node reconnects the old log.

## Recover what remains for a deleted Pod

Use this order:

1. **Central log backend:** query by the old Pod UID, namespace, container, workload labels, node, and incident timestamp.
2. **Alert payloads and incident attachments:** some systems include log excerpts or termination metadata.
3. **Kubernetes events:** useful for scheduling, image, probe, eviction, and kill context, but not application stdout.
4. **Controller state:** ReplicaSet, Deployment, StatefulSet, Job, and rollout history can identify the image and configuration.
5. **Node forensics:** a last-resort, privileged, time-sensitive source.

If the Pod name is known and events are still retained:

```bash
kubectl get events -n production \
  --field-selector involvedObject.name=checkout-7b8f9d6c5-x4k2m \
  --sort-by='.metadata.creationTimestamp'
```

Events are best-effort, expire independently, and may refer to a newly created object with the same name. Compare `involvedObject.uid` when available. Audit logs can prove who deleted a Pod, but they are not container logs either.

For a Job whose Pods still exist, list by the standard Job label before TTL cleanup removes them:

```bash
kubectl get pods -n batch \
  -l batch.kubernetes.io/job-name=nightly-export \
  --show-labels

kubectl logs -n batch job/nightly-export \
  --all-pods=true --all-containers=true
```

Once the individual Pods are deleted, the Job object alone cannot serve their logs.

## Build logging that survives Pod churn

The Kubernetes documentation describes three cluster-level patterns:

- a node-level logging agent on every node;
- a sidecar that streams file logs to stdout;
- an application that sends logs directly to a backend.

The usual baseline is a node-level agent deployed as a DaemonSet. It tails CRI container logs and forwards them before Pod garbage collection. Configure the backend to retain these identity fields:

```text
cluster
namespace
pod_name
pod_uid
container_name
node_name
workload kind and name
image digest
timestamp
```

Pod UID is essential. Names can be reused; UIDs identify one object. Also preserve the original event timestamp at collection time, use synchronized node clocks, and define retention that covers the incident-discovery window.

Prefer application output on stdout and stderr. If a legacy application writes files, mount a shared volume and use a lightweight sidecar per file to stream each file to that sidecar's stdout, or configure an agent to collect the files deliberately. Avoid writing two incompatible formats into one stream.

## Preserve a small termination clue

Container termination messages can preserve a concise final error in Pod status. The default path is `/dev/termination-log`. Kubernetes can also use the tail of container logs when the termination file is empty and the container exits with an error:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: importer
spec:
  restartPolicy: Never
  containers:
    - name: import
      image: registry.example.com/importer:3.2.0
      terminationMessagePath: /dev/termination-log
      terminationMessagePolicy: FallbackToLogsOnError
```

This is size-limited status metadata, not a substitute for log aggregation. Write a short, non-secret failure summary and correlation ID; query the backend for the full record.

## Test the retention path

Do not discover during an outage that the collector misses short-lived Pods. In a non-production namespace:

1. Start a container that emits a unique marker and exits.
2. Retrieve it with `kubectl logs` and `kubectl logs --previous` when applicable.
3. Delete the Pod.
4. Query the backend by Pod UID and marker.
5. Confirm timestamps, multiline parsing, namespace isolation, and retention.
6. Verify RBAC prevents unauthorized users from reading sensitive logs.

Repeat for a rapid CrashLoop and a short Job. Collection agents that poll metadata slowly can lose labels for workloads that exist only for seconds.

## Official Documentation

- [Kubernetes Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes `kubectl logs` Reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Container Termination Messages](https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/)
- [Kubernetes Kubelet Configuration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)

## Conclusion

Use `kubectl logs --previous` while the same Pod still exists and name the exact container. After Pod deletion, Kubernetes has no built-in historical log query; recovery depends on a log backend or fragile node-local evidence. Capture Pod UID and incident time early, forward stdout and stderr with a node agent, and test that short-lived and crashing workloads remain searchable after their Pods are gone.
