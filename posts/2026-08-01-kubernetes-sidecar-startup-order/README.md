# Kubernetes Native Sidecar, Init, and App Container Startup Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Init Container, Startup Probes, Pod Lifecycle, Container Ordering

Description: Follow the kubelet's exact startup sequence for regular init containers, native sidecars, and application containers, including what probes actually gate.

---

Kubernetes gives strong startup ordering to the `initContainers` list and no corresponding order among entries in `containers`. Native sidecars bridge those two phases: they start at a defined point in initialization but keep running after application containers begin.

The key marker is a container-level `restartPolicy: Always` on an entry in `initContainers`. That entry is a native sidecar, not a regular run-to-completion init container.

## Walk Through a Mixed Example

Consider this abbreviated Pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ordered-startup
spec:
  initContainers:
    - name: render-config
      image: registry.example.com/config-renderer:1.4.0
      args: ["--output=/shared/app.yaml"]
      volumeMounts:
        - name: shared
          mountPath: /shared

    - name: network-proxy
      image: registry.example.com/network-proxy:3.1.0
      restartPolicy: Always
      startupProbe:
        httpGet:
          path: /healthz/started
          port: 15021
        periodSeconds: 2
        failureThreshold: 30

    - name: warm-cache
      image: registry.example.com/cache-warmer:2.0.0
      args: ["--proxy=http://127.0.0.1:15001"]

    - name: log-agent
      image: registry.example.com/log-agent:5.2.0
      restartPolicy: Always

  containers:
    - name: api
      image: registry.example.com/api:9.0.0
      volumeMounts:
        - name: shared
          mountPath: /etc/example
    - name: metrics
      image: registry.example.com/metrics-exporter:2.3.0

  volumes:
    - name: shared
      emptyDir: {}
```

The startup sequence is:

1. `render-config` starts. The kubelet waits for it to terminate successfully.
2. `network-proxy` starts. Because it is restartable, the kubelet does **not** wait for it to exit. It waits for the sidecar's started milestone. Here, that means its `startupProbe` must succeed.
3. `warm-cache` starts while `network-proxy` continues running. The kubelet waits for `warm-cache` to finish successfully.
4. `log-agent` starts. With no startup probe, its started milestone is reached once the container is running; it continues running.
5. Once every init entry is either successfully complete or, for a native sidecar, started, the kubelet begins application-container startup.
6. `api` and `metrics` have no ordering guarantee relative to each other. Do not rely on their YAML order.

The result is intentional overlap: `network-proxy` is running during `warm-cache`, and both native sidecars are running alongside `api` and `metrics`.

## “Started” Is Not the Same as “Ready”

For startup ordering, the kubelet uses the native sidecar's `started` status. Kubernetes documents two practical cases:

- without a startup probe, a running sidecar process can be considered started;
- with a startup probe, the started status does not become true until that probe succeeds.

Process creation alone does not prove that a proxy has opened its listener, loaded configuration, or established an upstream connection. If later initialization depends on one of those facts, encode the fact in a startup probe.

A `readinessProbe` does not gate the next init container. Its result contributes to the Pod's overall readiness once evaluated. This configuration can therefore allow the application to start while keeping the Pod out of Service endpoints:

```yaml
initContainers:
  - name: proxy
    image: registry.example.com/proxy:3.1.0
    restartPolicy: Always
    readinessProbe:
      httpGet:
        path: /ready
        port: 15021
```

If the application must not start before the proxy is usable, use `startupProbe`, not only `readinessProbe`.

## A Startup Probe Gates Later Initialization

This native-sidecar behavior differs from a startup probe on an ordinary application container. On any container, a startup probe suppresses that container's liveness and readiness probes until it succeeds. On a native sidecar, it additionally defines when the kubelet may advance through the ordered init sequence.

Budget enough attempts for normal startup:

```yaml
startupProbe:
  httpGet:
    path: /startup
    port: 15021
  timeoutSeconds: 1
  periodSeconds: 2
  failureThreshold: 30
```

This configuration allows roughly 60 seconds worth of probe periods, plus execution and scheduling effects. If the probe keeps failing, the kubelet kills and restarts the sidecar according to its `Always` policy. Later init containers remain blocked until an incarnation reaches the started milestone.

Use a check that is local, cheap, and specific to startup. A probe that depends on an unrelated remote service can prevent the entire Pod from initializing during that service's outage.

## What Happens When an Init Container Fails?

The behavior depends on its kind and the Pod-level restart policy.

### A regular init container fails

Regular init containers must finish successfully. With Pod `restartPolicy: Always` or `OnFailure`, the kubelet retries a failed init container. With Pod `restartPolicy: Never`, a failed init container causes Pod initialization to fail rather than being retried indefinitely in that Pod.

That is the default behavior when the container has no individual restart-policy override. On clusters with `ContainerRestartRules` enabled, an explicitly configured container-level policy or rule can change how a regular init container is retried.

The kubelet never advances to the next list entry until the regular init container succeeds.

### A native sidecar fails before it has started

The sidecar's `Always` policy causes a restart. Because its started milestone has not been reached, later init containers remain blocked. Repeated failures acquire container restart backoff and can appear as `CrashLoopBackOff`.

### A native sidecar fails after later containers began

The kubelet restarts that sidecar independently. It does not roll initialization backward, rerun already completed init containers, or restart application containers merely because the sidecar crashed. Applications that require the helper must tolerate a temporary local dependency outage or fail according to their own policy.

Kubernetes 1.36 promotes an explicit exception to beta and enables it by default: with the `RestartAllContainersOnContainerExits` feature enabled, a matching `restartPolicyRules` action of `RestartAllContainers` performs a full in-place Pod restart and reruns initialization. Unless that rule is present and matches, the normal independent behavior above applies.

## Do Not Use `postStart` as a Readiness Shortcut

A `PostStart` lifecycle hook and the container's entrypoint are initiated concurrently; Kubernetes does not guarantee which begins first. A long-running hook can delay the container's transition to `Running`, and the native-sidecar design accounts for completion of the hook in the started state, but a hook is still a poor substitute for testing the service you require.

Use the entrypoint to initialize the process and a startup probe to observe the externally meaningful condition. This also gives operators visible probe failures instead of an opaque hanging hook.

## App Containers Must Coordinate Their Own Dependencies

Once initialization completes, kubelet can create the containers in `spec.containers`. Their list order is not a dependency graph. If `api` needs `metrics`-or one ordinary application container needs another-use one of these designs:

- make the consumer retry until the dependency is available;
- move a true helper into native-sidecar form and give it a startup probe;
- perform finite setup in a regular init container;
- split independently operated components into separate workloads and use a Service.

Readiness probes can keep traffic away until all required application components are ready, but they still do not impose app-container start order.

## Observe Each Stage

The `Initialized` Pod condition alone does not explain which entry is blocking. Inspect both status arrays:

```bash
kubectl get pod ordered-startup -o json | jq '{
  phase: .status.phase,
  conditions: .status.conditions,
  init: .status.initContainerStatuses,
  app: .status.containerStatuses
}'

kubectl describe pod ordered-startup
kubectl logs ordered-startup -c network-proxy
kubectl logs ordered-startup -c network-proxy --previous
```

Native sidecars appear in `initContainerStatuses` even when they are running normally. Check `started`, `ready`, `restartCount`, current state, last state, and Pod events. Timestamps from each container's logs are useful evidence, but base the design on Kubernetes' documented guarantees rather than the order seen in one test run.

## Design the List in Dependency Order

A useful way to review the manifest is to read `initContainers` top to bottom and ask, “What must be true before the next entry may begin?”

- Put finite setup in a regular init container.
- Put a long-running helper at the point where it first becomes necessary.
- Add a startup probe if “process running” is too weak a guarantee.
- Remember that every subsequent regular init runs concurrently with all native sidecars declared before it.
- Assume application containers can start concurrently once the init sequence is complete.

That mental model predicts the startup behavior without timing guesses: regular init containers form blocking steps; native sidecars form ordered, persistent steps; application containers begin only after those steps, with no order among themselves.

## Official Documentation

- [Kubernetes: Sidecar Containers and Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes: Restart All Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-all-containers)
