# When a Sidecar Crashes: Restarts and Pod Health Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Container Restarts, CrashLoopBackOff, Pod Health, Troubleshooting

Description: Trace a native sidecar crash from exit through independent restart, readiness changes, restart backoff, and application impact.

---

By default, when a Kubernetes-native sidecar crashes, the kubelet restarts that sidecar independently. It does not automatically restart the application, rerun completed init containers, or replace the Pod solely because the helper exited.

The native sidecar's container-level policy is `Always`. It restarts after either a successful exit (`0`) or a failed exit (non-zero), regardless of whether the Pod-level `restartPolicy` is `Always`, `OnFailure`, or `Never`.

Kubernetes 1.36 includes a beta exception that is enabled by default. If the `RestartAllContainersOnContainerExits` feature and its dependent `ContainerRestartRules` and `NodeDeclaredFeatures` feature gates are enabled, and the sidecar has a matching `restartPolicyRules` action of `RestartAllContainers`, that exit restarts the whole Pod in place. The examples in this article do not configure that rule, so they use normal independent restart behavior.

Independent restart does not mean independent health. While the sidecar is down or waiting in restart backoff, it is not ready, so the whole Pod is normally unready and a matching Service endpoint is not used for ordinary traffic.

## Start with the Native Definition

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inventory
  labels:
    app: inventory
spec:
  restartPolicy: Never
  initContainers:
    - name: local-proxy
      image: registry.example.com/local-proxy:8.0.0
      restartPolicy: Always
      readinessProbe:
        httpGet:
          path: /ready
          port: 15021
      livenessProbe:
        httpGet:
          path: /live
          port: 15021
        periodSeconds: 10
        failureThreshold: 3
  containers:
    - name: inventory
      image: registry.example.com/inventory-job:5.4.0
```

Although the Pod policy is `Never`, it applies to the ordinary `inventory` container. `local-proxy` has its own `Always` policy because it is a restartable init container.

## Follow a Process Crash Step by Step

Assume the proxy previously reached its started milestone and the inventory container is running.

1. The proxy process exits or is killed, perhaps with an application error or an out-of-memory kill.
2. Its current state becomes terminated and Kubernetes records the reason, exit code, signal, and finish time in `lastState` once another attempt begins.
3. The sidecar is not ready while it is not running. Native sidecars participate in the Pod's `ContainersReady` calculation, so `Ready` becomes false unless the Pod is already terminal.
4. The EndpointSlice controller marks matching Service endpoints not ready for ordinary traffic.
5. The kubelet starts a new instance of the sidecar according to its `Always` policy.
6. If startup succeeds, probes resume and Pod readiness can recover.
7. The application container keeps its process and state throughout; Kubernetes does not restart it merely because the sidecar restarted.

The Pod's phase can remain `Running`. Pod phase is a coarse lifecycle summary, not a health dashboard. Inspect conditions and per-container status rather than interpreting `Running` as “all containers are healthy.”

## Repeated Crashes Add Restart Backoff

The first eligible restart can happen promptly. Repeated failures trigger exponential delay to prevent a tight restart loop. During the delay, `kubectl` commonly displays `CrashLoopBackOff`; that phrase describes the current backoff condition, not the root cause.

Depending on cluster version and feature-gate configuration, the initial and maximum delays can differ. Diagnose from Pod events rather than hard-coding a timing assumption. A sufficiently long successful run resets the default backoff sequence.

The important invariants are:

- a native sidecar keeps using `Always` after any exit while the Pod needs it;
- backoff belongs to that container's restart loop;
- application containers are not restarted as a side effect;
- completed regular init containers do not run again because a previously started sidecar later crashes.

Those last two invariants do not apply when an explicit `RestartAllContainers` rule matches.

If the sidecar never reaches its initial started milestone, later init containers and application startup remain blocked instead. A `startupProbe` defines that milestone when present.

## An Explicit Full-Pod Restart Rule Is Different

On a Kubernetes 1.36 cluster with the feature enabled, a sidecar can deliberately request an in-place restart of every container for selected exit codes:

```yaml
restartPolicy: Always
restartPolicyRules:
  - action: RestartAllContainers
    exitCodes:
      operator: In
      values: [88]
```

When this rule matches, Kubernetes terminates all containers without honoring `terminationGracePeriodSeconds` or running `preStop` hooks, preserves the Pod UID, network identity, sandbox, and volumes, and reruns the normal init and application startup sequence. Use it only when a full reset is the intended contract; it is not ordinary crash recovery.

## Probe Failures Have Different Effects

### Readiness fails

The process remains running. Kubernetes marks the sidecar and Pod unready but does not restart the sidecar. When readiness succeeds again, traffic can return.

### Liveness fails

After the configured failure threshold, kubelet kills and restarts that sidecar. The resulting restart is independent from the application. Use liveness only when process replacement is likely to fix the condition.

### Startup fails

Kubelet kills and restarts the sidecar according to `Always`. Before the first successful startup, later init/app containers stay blocked. After application startup has already occurred, a later sidecar restart does not rewind the Pod's initialization sequence.

### The process exits itself

No probe is needed. The `Always` policy causes a restart after exit code 0 or non-zero. A sidecar designed to perform one action and exit will therefore loop; remove `restartPolicy: Always` if it is actually a finite init task.

## The Application Must Handle a Local Dependency Gap

Kubernetes provides lifecycle isolation, not dependency repair. If application calls require `127.0.0.1:15001` and the proxy is restarting, those calls can fail even though the application process stays alive.

Choose an explicit policy:

- retry local calls with bounded exponential backoff and jitter;
- fail individual requests while preserving process state;
- make application readiness depend on the proxy and stop new traffic during the gap;
- let the application exit if it cannot safely continue, allowing its own Pod restart policy or workload controller to act;
- separate the helper into another workload if failures should be isolated beyond the Pod boundary.

Do not assume the sidecar's readiness probe directly pauses application execution. It changes Pod readiness and Service routing, not code already running inside the Pod. Existing connections and background tasks need their own failure handling.

## Jobs Still Complete

The sidecar's `Always` policy means “restart while this Pod needs the sidecar,” not “keep the Pod alive forever.” For a Job using `restartPolicy: Never` or `OnFailure`, a native sidecar does not block completion after all regular application containers finish.

During Pod shutdown, kubelet terminates native sidecars after main containers. It does not keep restarting the sidecar to make the completed Job active again. This is the crucial difference from an endless legacy sidecar in `spec.containers`, which is an ordinary application container and therefore prevents the Pod from completing while it runs.

## An OOM Kill Is Still a Sidecar Restart

If the sidecar exceeds its memory limit and the kernel kills its process, `lastState.terminated.reason` commonly reports `OOMKilled`. The kubelet restarts the sidecar because of `Always`; the application is not automatically restarted.

That does not make the event harmless. Shared Pod functions may be unavailable, readiness may flap, and repeated restarts consume CPU. Fix the leak or right-size the sidecar instead of relying on restart recovery. Remember that sidecar requests participate in Pod scheduling and sidecar limits apply to the container itself.

## Inspect the Native Sidecar Status

Native sidecars are reported in `initContainerStatuses`, not `containerStatuses`:

```bash
kubectl get pod inventory -o json | jq '
  .status.initContainerStatuses[]
  | select(.name == "local-proxy")
  | {
      state,
      lastState,
      ready,
      started,
      restartCount
    }'

kubectl describe pod inventory
kubectl logs inventory -c local-proxy
kubectl logs inventory -c local-proxy --previous
kubectl get events --field-selector involvedObject.name=inventory --sort-by=.lastTimestamp
```

`--previous` is especially useful after a restart because it retrieves logs from the prior terminated instance. It retains only the previous instance available through kubelet, not an unlimited history; ship logs centrally if crash history matters.

Correlate:

- termination reason, code, and signal;
- restart count increase;
- probe events;
- resource usage and OOM events;
- sidecar and application logs at the same timestamps;
- Pod `Ready` transitions and EndpointSlice changes.

## Alert on Impact, Not Merely One Restart

Occasional restarts can occur during maintenance or transient faults. Useful signals include:

- restart-count rate over a window;
- time spent unready;
- sidecar request/error rate for its local function;
- queue age or unshipped bytes;
- application errors caused by the local dependency;
- sustained `CrashLoopBackOff` events;
- OOM termination reasons.

Treat termination-time signals separately. Kubernetes warns that a native sidecar can exit non-zero during Pod termination if main containers use most of the grace period. Suppressing all non-zero sidecar exits, however, would hide crashes during normal operation; include Pod deletion state and timing in the classification.

Native sidecars make restart ownership precise: the kubelet repairs the failed helper process without arbitrarily recycling healthy application processes. Availability still depends on making readiness, application retries, resource limits, and alerting match the helper's real role.

## Official Documentation

- [Kubernetes: Pod Lifecycle and Restart Policies](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-restarts)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes: Restart All Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-all-containers)
