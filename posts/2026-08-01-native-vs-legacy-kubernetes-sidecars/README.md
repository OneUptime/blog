# Native vs Legacy Kubernetes Sidecars: When to Use `initContainers` with `restartPolicy: Always`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Init Containers, Pod Lifecycle, Jobs, Containers

Description: Compare native and legacy Kubernetes sidecars, including version support, lifecycle guarantees, Job completion, probes, and a safe migration path.

---

For years, a Kubernetes “sidecar” was an architectural convention rather than an API concept. You placed the application and its helper in the Pod's `containers` list and relied on the two processes to cooperate. Kubernetes treated both as ordinary application containers.

Kubernetes now has a native sidecar mechanism. A native sidecar is declared in `initContainers` and has a container-level `restartPolicy: Always`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-with-proxy
spec:
  initContainers:
    - name: local-proxy
      image: registry.example.com/local-proxy:2.4.0
      restartPolicy: Always
      startupProbe:
        httpGet:
          path: /startup
          port: 15021
        periodSeconds: 2
        failureThreshold: 30
  containers:
    - name: api
      image: registry.example.com/api:8.1.0
```

The location is initially surprising: the container is in `initContainers`, but unlike a regular init container it does not run to completion. The kubelet starts it during initialization, continues to restart it for the Pod's lifetime, and does not let it determine when the Pod is complete.

## Check the Kubernetes Version and Feature State

Native sidecars followed this graduation path:

| Kubernetes release | Feature state | Default |
| --- | --- | --- |
| 1.28 | Alpha | Disabled |
| 1.29–1.32 | Beta | Enabled |
| 1.33 and later | Stable | Enabled |

The API field can only use `Always` for this sidecar behavior. Do not infer support only from a client-side `kubectl version` result. Admission, the scheduler, and every kubelet that may run the Pod need compatible feature handling, which matters during a skewed cluster upgrade.

Ask the API server to validate the manifest:

```bash
kubectl apply --dry-run=server -f pod.yaml
kubectl explain pod.spec.initContainers.restartPolicy
```

For Kubernetes 1.28, the `SidecarContainers` feature gate had to be enabled explicitly. It has been enabled by default since 1.29 and is locked on once the feature is stable. A managed service can also impose its own supported-version policy, so confirm the actual control-plane and node versions before migration.

## What “Legacy Sidecar” Means

A legacy sidecar is simply another ordinary application container:

```yaml
spec:
  containers:
    - name: api
      image: registry.example.com/api:8.1.0
    - name: local-proxy
      image: registry.example.com/local-proxy:2.4.0
```

This remains valid. It is appropriate when:

- the cluster must support Kubernetes versions without native sidecars;
- both containers are peers and no startup or shutdown order is required;
- every container should participate equally in deciding whether the Pod has completed.

The name “legacy” does not mean deprecated. Kubernetes explicitly supports multi-container Pods whose containers are all in `containers`. What is missing is sidecar-specific lifecycle semantics.

## The Differences That Affect Production

### Startup

Ordinary containers in `spec.containers` do not have a declared start sequence. A process may happen to start first, but that observation is not a contract.

Entries in `spec.initContainers` are ordered. For a native sidecar, the kubelet waits until that container is *started* and then moves to the next init entry. Without a `startupProbe`, a running process satisfies that point. With a `startupProbe`, the probe must succeed. This makes a startup probe the correct way to prevent later init containers and the application from starting before a proxy or agent is actually usable.

A readiness probe is different: it affects Pod readiness, not the init sequence.

### Restarts

A native sidecar's container-level policy is always `Always`, regardless of the Pod-level `restartPolicy`. It restarts after either a zero or non-zero exit while the Pod still needs it. Its restart is independent: Kubernetes does not restart the application merely because the sidecar restarted.

By default, a legacy sidecar follows the Pod-level restart policy just like every other application container. Deployments require `Always`, but Jobs allow only `Never` or `OnFailure`, which creates important completion differences. On clusters with the `ContainerRestartRules` feature enabled, an ordinary container can explicitly override parts of that behavior with container-level restart policy and rules; that still does not give it native-sidecar startup, shutdown, or Job-completion semantics.

Kubernetes 1.36 also supports an opt-in `RestartAllContainers` rule when its feature gate is enabled. A matching sidecar exit can then restart every container in the Pod in place. Without that explicit rule, native-sidecar restarts remain independent as described here.

### Job completion

An endless legacy sidecar in `spec.containers` keeps a Job Pod running after the worker exits. The Job cannot count that Pod as successfully completed while an ordinary application container is still running.

A native sidecar does not control Pod completion. Once the Job's regular application containers finish, its always-running native sidecar does not prevent completion. This is often the strongest reason to migrate batch workloads.

### Shutdown

For a Pod with native sidecars, the kubelet lets all main application containers terminate first. It then terminates native sidecars in reverse order of their declaration. If sidecar B depends on sidecar A, declare A before B: A starts first and stops last.

With only ordinary containers, termination signals are not ordered. If a legacy sidecar must outlive the application, the processes need their own coordination protocol and enough termination grace time.

### Probes and readiness

Native sidecars support startup, readiness, and liveness probes as well as lifecycle hooks. A sidecar readiness result contributes to the readiness of the entire Pod. That is useful for a mandatory network proxy and potentially harmful for a best-effort log shipper: a remote logging outage should not necessarily remove an otherwise healthy application Pod from every matching Service.

## Choose Native Sidecars When the Lifecycle Is Asymmetric

Native sidecars are the clearer choice when any of these statements is true:

- the helper must start before the application;
- the helper must stop after the application;
- the workload is a Job and the helper should not block completion;
- the helper should restart independently even when the Pod policy is `Never` or `OnFailure`;
- a startup probe must gate later initialization.

Use ordinary peer containers when there is no main/helper distinction or when all processes should have equal lifetime semantics. If two components must scale independently, be deployed independently, or fail independently at the Pod boundary, they probably belong in separate workloads rather than either sidecar form.

## Migrate One Behavior at a Time

Start from this legacy shape:

```yaml
spec:
  restartPolicy: Never
  containers:
    - name: worker
      image: registry.example.com/report-worker:5.0.0
    - name: log-shipper
      image: registry.example.com/log-shipper:3.2.0
```

Move only the helper and add its container policy:

```yaml
spec:
  restartPolicy: Never
  initContainers:
    - name: log-shipper
      image: registry.example.com/log-shipper:3.2.0
      restartPolicy: Always
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
  containers:
    - name: worker
      image: registry.example.com/report-worker:5.0.0
```

Then verify the behaviors that changed:

1. Confirm server-side API acceptance on the oldest supported cluster.
2. Confirm the sidecar reaches its real service-ready point before the worker starts; add a startup probe if needed.
3. Confirm a sidecar crash restarts only the sidecar and that the application tolerates the interruption.
4. Confirm the readiness policy reflects whether the helper is mandatory.
5. Delete the Pod normally and verify shutdown order and flush behavior within `terminationGracePeriodSeconds`.
6. For a Job, verify that a successful worker exit produces a completed Job even though the sidecar is designed to run continuously.
7. Recalculate the Pod's effective CPU and memory requests. Native sidecars run during later initialization and steady state, so their requests participate in both phases.

## Inspect the Result Correctly

Because a native sidecar is stored under `initContainers`, its status appears under `initContainerStatuses`, even while it is running:

```bash
kubectl get pod api-with-proxy -o jsonpath='{.status.initContainerStatuses}'
kubectl logs api-with-proxy -c local-proxy
kubectl describe pod api-with-proxy
```

Do not classify every running entry in `initContainerStatuses` as a stuck init container. Check its spec: `restartPolicy: Always` is the deliberate marker that makes it a native sidecar.

The practical dividing line is not syntax alone. Native sidecars express an asymmetric contract—start early, run alongside, stop late, and do not block completion. Use that contract when it matches the workload; otherwise, an ordinary multi-container Pod remains a sound design.

## Official Documentation

- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Adopting Sidecar Containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Restart All Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-all-containers)
