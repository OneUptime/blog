# When Should a Sidecar Use `startupProbe`, `readinessProbe`, and `livenessProbe`?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Startup Probes, Readiness Probe, Liveness Probe, Pod Health

Description: Choose Kubernetes sidecar probes by consequence: gate startup, control whole-Pod traffic readiness, or restart only a stuck sidecar.

---

The three Kubernetes probes answer different questions and trigger different actions:

| Probe | Question | Failure consequence for a native sidecar |
| --- | --- | --- |
| `startupProbe` | Has this sidecar completed startup? | The kubelet kills and restarts the sidecar; before its first successful start, later init/app startup remains blocked |
| `readinessProbe` | Should this Pod receive traffic now? | The sidecar and whole Pod become unready; the sidecar is not restarted |
| `livenessProbe` | Is this running sidecar irrecoverably stuck? | The kubelet kills and restarts only the sidecar |

The right probe is chosen by the desired consequence, not by giving three names to the same `/health` endpoint.

The restart consequences below assume the normal native-sidecar policy. Kubernetes 1.36 can optionally apply a matching `RestartAllContainers` restart rule, which restarts the whole Pod in place; that behavior must be configured explicitly and is not caused by adding a probe alone.

## Native Sidecars Add a Startup-Ordering Consequence

A native sidecar is an entry in `initContainers` whose own `restartPolicy` is `Always`:

```yaml
spec:
  initContainers:
    - name: local-proxy
      image: registry.example.com/local-proxy:7.4.0
      restartPolicy: Always
  containers:
    - name: application
      image: registry.example.com/application:15.0.0
```

The kubelet moves through `initContainers` in order. For a native sidecar, it advances once the sidecar is marked started rather than waiting for the container to exit. Without a startup probe, a running process can satisfy that milestone. With a startup probe, its success is required; a configured `postStart` handler must also complete before the sidecar is marked started.

This means a native-sidecar startup probe can gate every later init container and application container. A readiness probe cannot do that.

## Use a Startup Probe for Slow or Meaningful Initialization

Use `startupProbe` when process creation is not enough. Common examples include a sidecar that must:

- load certificates or policy;
- open a local listener;
- restore a local queue;
- initialize packet-routing rules;
- establish a required control channel;
- finish an expensive warm-up before later containers use it.

```yaml
startupProbe:
  httpGet:
    path: /health/started
    port: 15021
  timeoutSeconds: 1
  periodSeconds: 2
  failureThreshold: 45
```

This allows approximately 90 seconds of probe periods, with additional effects from probe execution and scheduling. Until the startup probe succeeds, Kubernetes does not run that container's readiness or liveness probes. If it reaches the failure threshold, kubelet terminates the container; the native sidecar's `Always` policy restarts it, and repeated failures acquire restart backoff.

Probe the narrowest local fact that later containers require. A startup check that waits for an unrelated remote analytics service can block the entire Pod during an external outage.

Do not add a startup probe just to delay a liveness probe by a fixed number of seconds if startup is always immediate. It is most valuable when the maximum startup time legitimately differs from steady-state health timing.

## Use a Readiness Probe Only for a Serving Dependency

A native sidecar's readiness result contributes to the whole Pod's `Ready` condition. By default, when it fails, matching Service EndpointSlices mark the Pod endpoint not ready for ordinary traffic. A Service with `publishNotReadyAddresses: true` is an explicit exception: its EndpointSlice `ready` condition remains true.

That is desirable when the sidecar is on the request path:

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 15021
  timeoutSeconds: 1
  periodSeconds: 5
  failureThreshold: 2
  successThreshold: 2
```

Examples include a mandatory service-mesh proxy, a local TLS terminator, or an authorization helper without which requests cannot be served correctly.

It is often undesirable for best-effort telemetry. If a log shipper's readiness recursively depends on a remote logging backend, that backend outage can make every application Pod unready and remove all endpoints. Prefer separate shipper metrics and alerts unless the business contract truly says the application must stop serving when logs cannot be delivered.

A readiness failure never restarts a container. It is suitable for recoverable overload or dependency loss: when the check succeeds again, the Pod can return to ready without process replacement.

## Use a Liveness Probe for a Stuck Process, Not a Remote Outage

Native sidecars already restart after their process exits, including exit code 0. They do not need a liveness probe merely to recover from a normal crash. Add one when the process can remain alive but make no progress-for example, a deadlocked event loop or a queue worker that has irrecoverably stopped consuming.

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 15021
  timeoutSeconds: 1
  periodSeconds: 10
  failureThreshold: 3
```

After the failure threshold, kubelet kills and restarts that sidecar. It does not restart the application or rerun completed init containers simply because the sidecar's liveness check failed.

Keep liveness self-contained. A remote database, DNS server, control plane, or log backend being unavailable does not prove that restarting the local process will help. A dependency-based liveness probe can create synchronized restart storms during an outage.

Kubernetes specifically cautions that incorrectly designed liveness probes can cause cascading failures under load. If the process can detect its own fatal state and exit, the native `Always` restart policy may be sufficient without a liveness probe.

## A Complete Native-Sidecar Example

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: payments
  labels:
    app: payments
spec:
  initContainers:
    - name: policy-proxy
      image: registry.example.com/policy-proxy:7.4.0
      restartPolicy: Always
      ports:
        - name: admin
          containerPort: 15021
      startupProbe:
        httpGet:
          path: /health/started
          port: admin
        periodSeconds: 2
        failureThreshold: 45
      readinessProbe:
        httpGet:
          path: /health/ready
          port: admin
        periodSeconds: 5
        failureThreshold: 2
      livenessProbe:
        httpGet:
          path: /health/live
          port: admin
        periodSeconds: 10
        failureThreshold: 3
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          memory: 256Mi
  containers:
    - name: payments
      image: registry.example.com/payments:15.0.0
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
```

The intended sequence is:

1. `policy-proxy` starts.
2. Only its startup probe runs initially.
3. Once `/health/started` succeeds, kubelet can complete initialization and start `payments`.
4. Readiness and liveness checks for the proxy begin.
5. A matching Service sends ordinary traffic to the Pod only when both proxy and application readiness allow it.
6. A recoverable proxy readiness failure removes the Pod from ordinary Service traffic without a restart.
7. A sustained proxy liveness failure restarts only the proxy.

Named ports are accepted for HTTP and TCP probes. If using a gRPC probe, Kubernetes requires a numeric port rather than a named port.

## Keep Probe Endpoints Semantically Separate

One implementation can share internal checks, but its endpoints should preserve these meanings:

- **started:** initialization reached a point that permits later containers to begin;
- **ready:** the sidecar can currently perform the Pod-local function required for serving;
- **live:** the process can make progress and a restart is likely to repair failure.

It is valid for `live=true` and `ready=false`: the process may be healthy while a recoverable dependency is unavailable. It is also possible for `started=true` to remain historical while readiness later changes.

Avoid checks that allocate heavily, mutate state, or contend with the workload. The kubelet runs probes repeatedly on every Pod, so expensive health checks become production load.

## Match the Mechanism to the Listener

Kubernetes supports `exec`, HTTP, TCP, and gRPC checks. Select based on what the sidecar exposes:

- `httpGet` validates an HTTP health endpoint at the Pod IP by default;
- `tcpSocket` validates that a connection can be established, not that the protocol is functioning correctly;
- `grpc` invokes the gRPC health-checking protocol;
- `exec` runs a command inside the container and succeeds on exit code 0.

Containers share the Pod network namespace. An HTTP health listener bound only to `127.0.0.1` might not accept a kubelet HTTP probe directed to the Pod IP. Either bind an appropriate health address or use a probe mechanism that matches the intended exposure. Secure health endpoints through network and application design without requiring credentials that expire independently of the process's health.

## Tune Timeouts and Thresholds from Evidence

For each probe, define:

- normal response latency under CPU pressure;
- the longest legitimate startup period;
- how long the Pod can remain in traffic during degradation;
- how long a true deadlock can persist before restart;
- whether repeated successes are needed before restoring readiness.

Very small `timeoutSeconds` values combined with low CPU requests can produce false failures when the node is busy. Very large thresholds hide real faults. Use metrics for probe latency and failure reasons, and test under representative contention.

## Troubleshoot by Consequence

```bash
kubectl describe pod payments
kubectl get pod payments -o yaml
kubectl logs payments -c policy-proxy
kubectl logs payments -c policy-proxy --previous
kubectl get endpointslice -l kubernetes.io/service-name=payments -o yaml
```

Ask:

1. Is later initialization blocked? Inspect startup probe events and `initContainerStatuses[].started`.
2. Is the Pod out of traffic but the sidecar still running? Inspect readiness.
3. Is `restartCount` increasing? Inspect liveness failures, process exits, OOM kills, and previous logs.
4. Does the probe target the intended port and path on the Pod network?
5. Would the configured failure action actually repair the condition being tested?

The last question prevents most probe mistakes. A startup failure should delay startup, a readiness failure should withhold traffic, and a liveness failure should justify destroying and recreating the sidecar process.

## Official Documentation

- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Sidecar Containers and Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Pod Lifecycle and Container Probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
- [Kubernetes: Configure Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes: Restart All Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-all-containers)
