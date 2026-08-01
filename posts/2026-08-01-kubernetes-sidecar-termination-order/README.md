# Which Container Stops First? Kubernetes Sidecar Termination Ordering Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Pod Termination, Graceful Shutdown, Lifecycle Hooks, SIGTERM

Description: Understand the exact native-sidecar shutdown order, how the shared grace period and hooks affect it, and where Kubernetes provides no ordering guarantee.

---

For a Pod that uses Kubernetes-native sidecars, the kubelet delays their stop signals until every main application container has stopped. It then signals native sidecars one by one in reverse declaration order. For a Pod made only of ordinary application containers-including the pre-native “legacy sidecar” pattern-Kubernetes does not guarantee a termination order.

That distinction determines whether a proxy, log collector, or secret agent is still available while the application shuts down.

## Identify a Native Sidecar First

The ordering applies only to restartable init containers:

```yaml
spec:
  initContainers:
    - name: base-tunnel
      image: registry.example.com/tunnel:3.0.0
      restartPolicy: Always
    - name: request-proxy
      image: registry.example.com/proxy:7.1.0
      restartPolicy: Always
  containers:
    - name: api
      image: registry.example.com/api:12.0.0
```

On graceful Pod termination, the dependency order is:

```text
api stops completely
        ↓
request-proxy receives its stop signal and stops
        ↓
base-tunnel receives its stop signal and stops
```

Both sidecars started in declaration order during initialization: `base-tunnel`, then `request-proxy`. They receive their stop signals in the reverse order, allowing the lower-level tunnel to remain available while the higher-level proxy exits.

If there are several entries in `spec.containers`, they are all “main” containers for this rule. Kubernetes waits until the last main container has fully terminated before it begins signaling native sidecars, but it does not promise an order among those main containers.

## Follow the Graceful Termination Flow

For a normal deletion with the default settings, the important sequence is:

1. The Pod receives a deletion timestamp and enters termination. The default grace period is 30 seconds unless `terminationGracePeriodSeconds` says otherwise.
2. The termination grace-period countdown starts.
3. The kubelet invokes any applicable `preStop` hook before asking the runtime to send that container's stop signal. The hook must finish before the signal is sent. Do not assume the sidecar signal ordering delays a sidecar's hook; that hook can run while main containers are still stopping.
4. Main application containers are asked to terminate. With multiple main containers, do not assume YAML order.
5. At the same time, the control plane marks the Pod's terminating EndpointSlice entries not ready for ordinary Service traffic.
6. After every main container has fully stopped, native sidecars receive their stop signals one by one in reverse `initContainers` order.
7. If the grace period expires, remaining processes are forcibly terminated; ordering can no longer protect dependencies. An overrun `preStop` hook can receive the kubelet's small one-off two-second extension, but that is an emergency allowance rather than a separate shutdown budget.

The container runtime normally sends `SIGTERM` to process 1 on Linux. Kubernetes also supports an image `STOPSIGNAL` and a container lifecycle `stopSignal` override. The lifecycle field is alpha, requires the disabled-by-default `ContainerStopSignals` feature gate, and also requires `spec.os.name`; when enabled, it overrides the image signal. Regardless of the signal chosen, PID 1 must handle or correctly forward it.

## The Grace Period Is Shared

Native sidecars do not receive a fresh grace period after the application exits. The countdown began before `preStop` hooks and main-container shutdown.

Suppose the Pod has:

```yaml
spec:
  terminationGracePeriodSeconds: 45
```

If an application hook consumes 15 seconds and the application needs another 25 seconds after its stop signal, only about 5 seconds remain for all native sidecars. Kubernetes notes that a sidecar can then receive `SIGTERM` followed quickly by `SIGKILL`, and a non-zero sidecar exit during Pod termination can be normal.

Choose the grace period from the measured shutdown path:

```text
longest main preStop + longest main drain
+ sidecar chain shutdown and flush
+ operational margin
```

With multiple main containers, some work can overlap, so this is a conservative capacity budget rather than a promise of exact wall-clock addition. Test the actual runtime and leave margin for load and network delays.

## `preStop` Hooks Consume the Grace Budget

A `preStop` hook is useful when a container needs an explicit drain or flush request before its process receives the stop signal:

```yaml
lifecycle:
  preStop:
    httpGet:
      path: /begin-drain
      port: 15020
```

But the grace clock is already running. If the hook takes most of the available time, the process can be killed before its own signal handler finishes. A hook is also not invoked if the container has already terminated.

If a `preStop` hook is still running when the configured grace period expires, the kubelet requests a small, one-off two-second extension. Do not size a normal drain around that fallback; set `terminationGracePeriodSeconds` high enough for the hook and process shutdown to complete inside the configured budget.

Hooks have at-least-once delivery intent, so make handlers idempotent. Do not use a `preStop` hook as the only place to persist irreplaceable state.

For native sidecars, do not add hooks merely to recreate the sidecar signal ordering that kubelet already provides. Use them only for container-specific drain behavior, and remember that a sidecar's hook can run before the main containers have exited.

## Legacy Sidecars Have No Special Stop Position

This Pod does **not** have a native sidecar:

```yaml
spec:
  containers:
    - name: api
      image: registry.example.com/api:12.0.0
    - name: request-proxy
      image: registry.example.com/proxy:7.1.0
```

Both entries are ordinary application containers. The runtime can deliver their termination requests in an arbitrary order. The proxy might disappear while the API is still draining, and a log collector might stop before the application writes its final record.

Options are:

- migrate the helper to `initContainers` with `restartPolicy: Always` on supported clusters;
- implement an explicit coordination protocol using a shared volume or local endpoint;
- make the application tolerate the helper's disappearance;
- separate components into independent workloads when Pod-level coupling is not required.

Sleeping in one container is not a robust ordering protocol. It assumes timing instead of observing a state transition and still competes for the same termination grace period.

## Regular Init Containers Are Already Finished

A regular init container runs to completion before application startup. Once the application containers have started, it is no longer running, so it has no place in that later termination order. If the Pod is deleted while it is still initializing, however, the currently running regular init container is stopped as part of Pod termination; the application-container/sidecar rule does not define an order between it and native sidecars.

Only entries in `initContainers` whose own `restartPolicy` is `Always` are native sidecars that remain running after initialization. When reviewing status, both kinds appear in `initContainerStatuses`; check the Pod spec rather than guessing from the status array name.

## Forced Deletion Changes the Contract

Avoid treating this command as an ordinary shutdown test:

```bash
kubectl delete pod api-pod --grace-period=0 --force
```

A force deletion removes the API object without waiting for kubelet confirmation. If the kubelet observes the deletion, it begins immediate cleanup, but graceful application-first, sidecar-last behavior does not have the requested time to run. Node loss, power failure, and an unreachable kubelet likewise cannot provide normal lifecycle guarantees.

Applications must therefore recover from abrupt termination even when graceful shutdown is carefully designed. Persist critical state outside ephemeral Pod storage and make work replayable or idempotent.

## Read Endpoint State Correctly

When a Pod begins deletion, matching EndpointSlice entries are retained temporarily but marked `terminating`, and their `ready` condition becomes false for backward compatibility. Load balancers should stop sending ordinary new traffic while existing work drains.

This endpoint change occurs alongside node-side shutdown; it is not a guarantee that every external load balancer has observed the update before the process receives `SIGTERM`. If a workload requires a specific drain protocol, design and measure it explicitly. The EndpointSlice `serving` condition can convey readiness for terminating endpoints to termination-aware consumers.

## Test the Order Instead of Inferring It

Run a disposable Pod whose containers log signal receipt and exit time. In separate terminals, start a combined log stream and a Pod watch before deletion:

```bash
kubectl logs api-pod --all-containers=true --prefix=true --timestamps=true -f
kubectl get pod api-pod -w
```

Then, from another terminal, delete the Pod with a nonzero grace period:

```bash
kubectl delete pod api-pod --wait=false
```

Also test under realistic load. Verify:

1. all main containers stop before the first native sidecar is signaled;
2. native sidecars stop in reverse declaration order;
3. the grace budget covers hooks, application draining, and sidecar flushing;
4. a forced expiry does not corrupt persistent state;
5. monitoring ignores expected sidecar termination exit codes without hiding crashes during normal Pod operation.

The declaration order should reflect dependencies: foundations first, dependents later. Kubernetes then gives that chain the useful symmetry-start foundations first and stop them last-provided the Pod has enough grace time to honor it.

## Official Documentation

- [Kubernetes: Pod Shutdown and Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-shutdown-and-sidecar-containers)
- [Kubernetes: Pod Termination Flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes: Pods and Endpoints Termination Flow](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
