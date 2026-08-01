# How to Debug a CrashLooping Sidecar with `kubectl logs`, `--previous`, and `kubectl debug`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, CrashLoopBackOff, kubectl, Troubleshooting

Description: Diagnose a repeatedly crashing sidecar by identifying its state, reading current and previous logs, inspecting events and configuration, and using an ephemeral or copied debug container safely.

---

`CrashLoopBackOff` is a delay between repeated restart attempts, not the root cause. A sidecar may be exiting because its command fails, a mount or Secret is missing, a probe kills it, it exceeds memory, or it cannot reach a dependency.

Debug the named container, not just the Pod. A multi-container Pod can be `Running` while one sidecar repeatedly terminates.

## 1. Identify the Failing Container and Last Exit

Start with a compact view and then inspect the Pod:

```bash
NAMESPACE=payments
POD=ledger-7d9f67b6f4-k8m2p
SIDECAR=log-forwarder

kubectl get pod "$POD" -n "$NAMESPACE"
kubectl describe pod "$POD" -n "$NAMESPACE"
```

Under the sidecar, distinguish:

- **State**: what Kubernetes is trying now, often `Waiting` with `CrashLoopBackOff`;
- **Last State**: why the previous instance terminated;
- **Reason**: `Error`, `OOMKilled`, `Completed`, or another runtime reason;
- **Exit Code** and signal;
- **Restart Count**;
- probe failures and mount errors in Events.

Extract the fields without paging through the full object:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{"\tcurrent="}{.state}{"\tlast="}{.lastState}{"\trestarts="}{.restartCount}{"\n"}{end}{range .status.containerStatuses[*]}{.name}{"\tcurrent="}{.state}{"\tlast="}{.lastState}{"\trestarts="}{.restartCount}{"\n"}{end}'
```

Native sidecars are declared under `initContainers`, so Kubernetes reports them in
`status.initContainerStatuses`; legacy sidecars and app containers appear in
`status.containerStatuses`. Inspecting both arrays avoids overlooking the failing
container.

If an ordinary helper exits successfully with code 0 but the Pod restart policy is `Always`, kubelet still restarts it. That often means a one-shot command was modeled as a long-running regular sidecar. Native sidecars use a container-level `restartPolicy: Always` inside `initContainers` and are also expected to remain running.

## 2. Read Both Current and Previous Logs

Always specify the container name:

```bash
kubectl logs "$POD" -n "$NAMESPACE" -c "$SIDECAR" \
  --timestamps --tail=200
```

The current instance may have produced no useful output yet. `--previous` (`-p`) asks for the logs from the previous terminated instance:

```bash
kubectl logs "$POD" -n "$NAMESPACE" -c "$SIDECAR" \
  --previous --timestamps --tail=500
```

Kubelet normally retains logs for one terminated container instance. Repeated restarts and log rotation mean `--previous` is not durable history; ship logs off the node if the investigation must survive Pod or node loss.

Useful options include:

```bash
# Follow the current attempt
kubectl logs -n "$NAMESPACE" "$POD" -c "$SIDECAR" -f

# Restrict a noisy window
kubectl logs -n "$NAMESPACE" "$POD" -c "$SIDECAR" --since=10m --tail=1000

# Compare all container streams, prefixed with their source
kubectl logs -n "$NAMESPACE" "$POD" --all-containers=true --prefix --tail=200
```

Do not add `--previous` mechanically when the container has never terminated; the API will have no previous instance to return.

## 3. Classify the Evidence

| Evidence | Likely next check |
| --- | --- |
| `OOMKilled`, exit 137 | Memory use, limit, node pressure, and unbounded buffers. |
| Exit 126 or 127 | Executable permission, image contents, command, args, and architecture. |
| “no such file” | Volume name, mount path, Secret/ConfigMap key, and working directory. |
| Permission denied | `runAsUser`, `runAsGroup`, `fsGroup`, modes, SELinux, or read-only mounts. |
| Probe failures | Probe path, port, command, startup time, timeout, and dependency assumptions. |
| TLS or DNS errors | Mounted trust bundle, clock, Service name, NetworkPolicy, and dependency health. |
| Clean immediate exit | A one-shot process used where a long-running sidecar was intended. |

Inspect the actual admitted configuration:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" -o yaml
kubectl get events -n "$NAMESPACE" \
  --field-selector involvedObject.name="$POD" \
  --sort-by=.lastTimestamp
```

Compare the sidecar's `command`, `args`, environment sources, mounts, probes, resources, and security context with a healthy revision. Never print Secret values into shared terminals or tickets.

## 4. Use `kubectl exec` Only If the Container Stays Up

If an instance remains running long enough and contains a shell:

```bash
kubectl exec -n "$NAMESPACE" -it "$POD" -c "$SIDECAR" -- sh
```

Crash loops often make this race unreliable, and production images may be deliberately distroless. Do not rebuild the image with a shell simply to make an incident easier to inspect.

## 5. Add an Ephemeral Debug Container

Kubernetes supports ephemeral debug containers for a running Pod:

```bash
kubectl debug -n "$NAMESPACE" -it "$POD" \
  --image=registry.example.com/net-debug@sha256:DEBUG_DIGEST \
  --target="$SIDECAR"
```

The `--target` behavior depends on container-runtime support. The debug container can share the Pod network and may inspect target processes, but it does not automatically receive every volume mount from the sidecar. Check what was mounted before concluding that a file is absent.

Use the least-privileged debug profile that can answer the question. Adding a debugger is an API mutation, is visible in the Pod spec, and can expose workload credentials and traffic. Ephemeral containers cannot be removed from that Pod; recreate the workload after the investigation if policy requires a clean object.

## 6. Copy the Pod When You Need to Change It

To hold a crashing command open or swap in a diagnostic image, make a copy:

```bash
kubectl debug -n "$NAMESPACE" "$POD" -it \
  --copy-to=ledger-sidecar-debug \
  --container="$SIDECAR" -- sh
```

Before creating the copy, ensure its labels will not make it a production Service endpoint or worker consumer. Avoid attaching a single-writer volume simultaneously unless the storage semantics permit it.

## Fix the Template, Then Verify a New Pod

Do not patch symptoms only in a disposable Pod. Change the owning controller, configuration object, or image digest, and let the controller create a replacement:

```bash
kubectl rollout status deployment/ledger -n "$NAMESPACE"
kubectl get pods -n "$NAMESPACE" -l app=ledger
kubectl logs -n "$NAMESPACE" <new-pod> -c "$SIDECAR" --tail=100
```

Verify restart count stability, readiness, resource use, log delivery, and application behavior. The investigation is complete when the cause and the corrected desired state are both understood—not merely when the backoff timer resets.

## Official Documentation

- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: `kubectl debug`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
