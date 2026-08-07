# Kubernetes Pod Running but Not Ready: A Diagnostic Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pods, Readiness Probe, Sidecar Containers, Readiness Gates, EndpointSlice

Description: Diagnose a Running Kubernetes Pod that remains unready by tracing container probes, sidecar readiness, custom gates, and Service endpoints.

---

A Kubernetes Pod can be `Running` and still be correctly marked `Ready=False`. `Running` is the Pod phase: the Pod is bound to a node, its containers have been created, and at least one container is running or starting or restarting. `Ready` is a condition indicating whether the Pod should serve requests and participate in matching Service load-balancing pools.

The distinction prevents traffic from reaching an application that has started its process but cannot yet serve safely. Diagnose the condition chain rather than restarting the Pod and hoping that timing changes.

## Read the status as separate signals

Start with a wide view:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m \
  -n production -o wide
```

Example:

```text
NAME                          READY   STATUS    RESTARTS   AGE
checkout-7b8f9d6c5-x4k2m     1/2     Running   0          8m
```

`1/2` means one of two readiness-counted containers is ready. That count includes regular containers and restartable init containers used as native sidecars. It does not mean half of the Pod startup sequence completed. Inspect the Pod conditions explicitly:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{range .status.conditions[*]}{.type}{"\t"}{.status}{"\t"}{.reason}{"\t"}{.message}{"\n"}{end}'
```

The important built-in conditions are:

- `PodScheduled`: a node was selected.
- `PodReadyToStartContainers`: sandbox creation and networking completed.
- `Initialized`: regular init containers completed.
- `ContainersReady`: all containers whose readiness contributes are ready.
- `Ready`: containers are ready **and** every custom readiness gate is true.

This immediately separates two major cases:

```text
ContainersReady=False, Ready=False
  -> investigate a container or native sidecar

ContainersReady=True, Ready=False
  -> investigate spec.readinessGates and their status conditions
```

## Find the unready container

List ordinary container states and their readiness bits:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\tready="}{.ready}{"\trestarts="}{.restartCount}{"\tstate="}{.state}{"\n"}{end}'
```

For native sidecars declared as restartable init containers, also inspect:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{"\tready="}{.ready}{"\trestarts="}{.restartCount}{"\tstate="}{.state}{"\n"}{end}'
```

Then use `describe`, which includes probe failures and recent events:

```bash
kubectl describe pod checkout-7b8f9d6c5-x4k2m -n production
```

Do not rely only on the most recent event. Events are best-effort and retained for a limited period. Combine them with container status, application logs, and metrics.

## Checklist 1: readiness probe failures

A failed readiness probe sets that container's `ready` field to false. It does **not** restart the container. That is why the Pod remains `Running`. Kubernetes continues probing, and the Pod can become ready again after enough successful results.

Inspect the effective probe:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{.spec.containers[?(@.name=="app")].readinessProbe}'

kubectl logs checkout-7b8f9d6c5-x4k2m -n production -c app \
  --since=15m --timestamps
```

Check these common mismatches:

- wrong path, port, scheme, host, or named port;
- the process listens only on loopback while the kubelet probes the Pod IP;
- probe timeout is shorter than realistic latency;
- dependency checks fail even though the application itself could serve degraded traffic;
- TLS expectations do not match the probe configuration;
- an `exec` command needs a shell or binary absent from the image;
- `successThreshold`, `failureThreshold`, or `periodSeconds` delays transitions more than expected;
- CPU starvation or disk latency causes intermittent timeouts.

Test the same endpoint from the Pod network when possible, but remember that an in-container `curl localhost` is not identical to a kubelet HTTP probe to the Pod IP. Use an ephemeral debug container if the production image lacks tools:

```bash
kubectl debug -it checkout-7b8f9d6c5-x4k2m -n production \
  --image=busybox:1.36 \
  --target=app -- sh
```

RBAC, runtime, and security policy must permit ephemeral containers. Do not modify a production image only to add `curl`.

## Checklist 2: the probes test the wrong responsibilities

Use each probe for a different decision:

- **Startup:** has this container finished its potentially slow initialization?
- **Readiness:** should this instance receive new traffic now?
- **Liveness:** is this container irrecoverably stuck and worth restarting?

A safe starting pattern is:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
        - name: app
          image: registry.example.com/checkout:4.7.1
          ports:
            - name: http
              containerPort: 8080
          startupProbe:
            httpGet:
              path: /health/startup
              port: http
            periodSeconds: 5
            failureThreshold: 30
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 2
            successThreshold: 1
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
```

When a startup probe exists, readiness and liveness probing wait until it succeeds. Give the startup probe enough total time (`failureThreshold × periodSeconds`) for worst-case initialization. Do not put a slow, optional downstream dependency in liveness: restarting every replica during a shared dependency outage creates a cascading failure.

Readiness may include dependencies that truly make the instance unable to serve. Keep the check bounded and intentional. If the application can return useful degraded responses, prefer an internal readiness criterion and expose downstream health separately.

## Checklist 3: a sidecar holds the entire Pod unready

An ordinary sidecar in `spec.containers` contributes to `ContainersReady`. A Kubernetes-native sidecar is a container in `spec.initContainers` with `restartPolicy: Always`; when it has a readiness probe, that result also contributes to Pod readiness.

This coupling is correct for a mandatory proxy that must be ready before application traffic. It is often wrong for a best-effort log shipper or telemetry agent.

Inspect every container, not just the application:

```bash
kubectl logs checkout-7b8f9d6c5-x4k2m -n production \
  -c network-proxy --since=15m

kubectl get pod checkout-7b8f9d6c5-x4k2m -n production -o yaml
```

Decide explicitly whether sidecar failure should withdraw the whole Pod from service. If yes, fix the sidecar probe and dependencies. If no, remove that readiness probe or redesign the topology only after reviewing the operational impact. A liveness probe is not a substitute; it restarts the sidecar and still does not define application traffic eligibility.

## Checklist 4: a custom readiness gate is false or missing

Readiness gates let an external controller add a condition to Pod readiness:

```yaml
spec:
  readinessGates:
    - conditionType: "example.com/load-balancer-ready"
```

The Pod is ready only when all containers are ready and the matching condition in `status.conditions` is `True`. A missing condition is treated as false. When containers are ready but a gate is not, the `Ready` condition commonly reports `ReadinessGatesNotReady`.

Inspect the declared gates and actual conditions together:

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{.spec.readinessGates}'

kubectl get pod checkout-7b8f9d6c5-x4k2m -n production \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{"\n"}{end}'
```

Find the controller responsible for the condition. Check its logs, permissions to patch the Pod `status` subresource, and reconciliation errors. Do not manually patch `Ready`; the kubelet owns built-in conditions. For a custom gate, manual status patches are useful only as a controlled diagnostic because the owning controller may overwrite them.

## Checklist 5: verify what the Service sees

For a Service named `checkout`, inspect EndpointSlices:

```bash
kubectl get endpointslice -n production \
  -l kubernetes.io/service-name=checkout -o wide

kubectl get endpointslice -n production \
  -l kubernetes.io/service-name=checkout -o yaml
```

For Pod-backed endpoints, EndpointSlice readiness reflects Pod readiness. Look at each endpoint's `conditions.ready`, `conditions.serving`, and `conditions.terminating`. A normal Service does not route regular traffic to an unready Pod.

`publishNotReadyAddresses: true` changes this behavior for discovery use cases such as clustered systems that must find peers before becoming ready. It is not a general workaround for a broken readiness probe; it can deliberately send traffic to unready backends.

If the Pod is ready but absent from the EndpointSlice, then investigate Service selectors, namespaces, owner references, and EndpointSlice controller behavior. That is a different failure from `Running` but `Ready=False`.

## A fast decision tree

Follow this order:

1. Read `status.conditions`; compare `ContainersReady` with `Ready`.
2. If `ContainersReady=False`, find the `ready=false` ordinary or native-sidecar container.
3. Inspect its readiness probe, state, restart count, events, logs, and resource saturation.
4. If `ContainersReady=True` but `Ready=False`, compare declared readiness gates with status conditions.
5. Inspect the controller that owns any missing custom condition.
6. Confirm the resulting endpoint conditions in the Service's EndpointSlices.
7. Fix the health contract or controller, then watch the transition rather than deleting the Pod.

```bash
kubectl get pod checkout-7b8f9d6c5-x4k2m -n production -w
```

Deleting a managed Pod creates a fresh instance with the same probe and gate configuration. It can temporarily change timing but does not correct the contract.

## Official Documentation

- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Pod Conditions](https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/)
- [Kubernetes Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

`Running` answers whether containers are executing; `Ready` answers whether the Pod should receive traffic. Trace `ContainersReady` first, then container and native-sidecar probes, then custom readiness gates, and finally EndpointSlice conditions. Once you identify which condition is false and who owns it, the fix becomes specific—and restarting an unchanged Pod stops looking like a solution.
