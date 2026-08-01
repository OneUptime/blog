# Does a Sidecar Readiness Probe Make the Whole Pod Unready?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Readiness Probe, Service, EndpointSlice, Pod Health

Description: Learn exactly how native and legacy sidecar readiness affects Pod conditions and Service endpoints, and decide when that coupling is appropriate.

---

Yes. A failing readiness probe on a Kubernetes-native sidecar makes the whole Pod unready. Kubernetes explicitly includes the readiness result of a restartable init container in Pod readiness. An ordinary “legacy” sidecar in `spec.containers` also contributes because it is an application container.

For a Pod selected by a Service that does not set `spec.publishNotReadyAddresses: true`, an unready result causes the EndpointSlice controller to set the Pod endpoint's `ready` condition to false. The effect is not scoped to the container that owns the probe: ordinary Service traffic stops going to that Pod across all matching Services without that setting.

That is correct for a mandatory local proxy and often undesirable for a best-effort telemetry agent.

## See the Coupling in a Manifest

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: checkout
  labels:
    app: checkout
spec:
  initContainers:
    - name: network-proxy
      image: registry.example.com/network-proxy:6.0.0
      restartPolicy: Always
      readinessProbe:
        httpGet:
          path: /ready
          port: 15021
        periodSeconds: 5
        failureThreshold: 2
  containers:
    - name: application
      image: registry.example.com/checkout:14.3.0
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        periodSeconds: 5
        failureThreshold: 2
```

The Pod is ready only when all required container-readiness states are true and any custom Pod readiness gates are also satisfied. If either `network-proxy` or `application` fails its probe, the Pod's `ContainersReady` condition becomes false and therefore its `Ready` condition becomes false.

Inspect both the Pod and its Service endpoint:

```bash
kubectl get pod checkout \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" "}{.reason}{"\n"}{end}'

kubectl get pod checkout \
  -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{" ready="}{.ready}{" started="}{.started}{"\n"}{end}'

kubectl get endpointslice -l kubernetes.io/service-name=checkout -o yaml
```

Native-sidecar state is under `initContainerStatuses`; that location does not exclude it from readiness.

## What a Readiness Failure Does-and Does Not Do

A failed readiness probe:

- marks that container unready;
- makes the Pod unready when container readiness is the failing condition;
- updates matching Service EndpointSlices so ordinary traffic is not routed to that endpoint, unless a Service sets `spec.publishNotReadyAddresses: true`;
- continues to run periodically for the container's lifetime, allowing readiness to recover.

It does **not**:

- restart the container;
- stop or restart the application container;
- roll back completed init containers;
- by itself prevent the next init container or application container from starting;
- guarantee that every external load balancer observes the endpoint update instantaneously.

Use a liveness probe when an unrecoverably stuck sidecar should be restarted. Use a startup probe when later init and application startup must wait for a native sidecar. Those are separate control paths.

## A Crash Also Causes an Unready Interval

Even without an explicit readiness probe, a running container is normally considered ready; while it is terminated or waiting to restart, it is not ready. Native restartable init containers are included when Kubernetes generates `ContainersReady`.

Therefore, omitting a readiness probe does not make a crashing sidecar invisible to Pod readiness. It only means Kubernetes has no application-specific test while the sidecar process is running. A fast crash/restart might produce a brief endpoint transition; a crash loop leaves the Pod unready for longer.

## Decide Whether the Sidecar Is on the Serving Path

Ask one operational question: **Can this Pod correctly serve requests while the sidecar is running but degraded?**

### Mandatory network proxy

If all application traffic traverses a local proxy, proxy readiness is part of application readiness. A probe should validate the local behavior required to route traffic. Marking the Pod unready avoids sending requests to an endpoint that cannot complete them.

Be careful about probing every external dependency. A proxy may be locally healthy even when one upstream is unavailable. If the readiness check recursively requires the whole network, a broad outage can remove every replica and make recovery harder.

### Credential or secret agent

If the application cannot authenticate without freshly delivered credentials, coupling readiness may be correct. If already-issued credentials remain valid through a temporary agent outage, readiness might instead depend on whether the local credential is still usable, not whether the agent's remote control plane is reachable at that instant.

### Log or metrics shipper

Telemetry is often best effort relative to user traffic. Making remote observability availability part of application readiness can cause an observability outage to become a production outage. In that case, omit the sidecar readiness probe, keep separate alerts and metrics for the shipper, and preserve enough local buffering for a bounded interruption.

If compliance policy forbids serving unless audit records can be delivered, then the log sidecar is mandatory and readiness coupling is intentional. Document that decision because it changes the application's availability dependencies.

## Startup Probe and Readiness Probe Solve Different Problems

A native sidecar advances the ordered init sequence when the kubelet marks it started. A startup probe defines that milestone:

```yaml
initContainers:
  - name: network-proxy
    image: registry.example.com/network-proxy:6.0.0
    restartPolicy: Always
    startupProbe:
      httpGet:
        path: /started
        port: 15021
      periodSeconds: 2
      failureThreshold: 30
    readinessProbe:
      httpGet:
        path: /ready
        port: 15021
      periodSeconds: 5
      failureThreshold: 2
```

Here:

- `/started` must succeed before kubelet advances to later init containers and the application;
- while the startup probe has not succeeded, liveness and readiness probing for this container is suppressed;
- after startup, `/ready` continuously controls the sidecar's contribution to whole-Pod readiness.

Do not use readiness alone to enforce “proxy before app.” The app can start while the Pod remains unready.

## Probe the Correct Network Address

Containers in a Pod share its network namespace. Kubernetes HTTP probes connect to the Pod IP by default, not to a URL interpreted inside the target container. A sidecar endpoint bound only to `127.0.0.1` may be reachable from the application but not through an HTTP probe aimed at the Pod IP.

Bind the health endpoint appropriately, use an `exec` probe that checks the local process, or otherwise match the probe mechanism to the listener. Also avoid port collisions: the application and sidecar share the same Pod IP and cannot both bind the same address and port.

An HTTP probe can accidentally reach the wrong process if port ownership is misunderstood. Give health ports clear names in documentation and inspect actual listeners during testing.

## Understand Service and Job Effects

For Services that do not set `spec.publishNotReadyAddresses: true`, failed readiness removes the endpoint from ordinary traffic. For those Services, Pod deletion also marks terminating endpoints not ready independently of the container probes.

For Jobs, readiness is not the completion criterion. A native sidecar does not block completion once the regular application containers finish, even if the sidecar was designed to run forever. Do not try to make a Job complete by changing a sidecar readiness probe; fix whether the helper is a native sidecar or an ordinary completion-blocking container.

## Troubleshoot an Unexpected Unready Pod

Use the actual condition message to identify the container:

```bash
kubectl describe pod checkout
kubectl get pod checkout -o yaml
kubectl logs checkout -c network-proxy
kubectl logs checkout -c network-proxy --previous
kubectl get events --field-selector involvedObject.name=checkout --sort-by=.lastTimestamp
```

Check:

1. Is the helper a native sidecar (`initContainers` plus `restartPolicy: Always`) or an ordinary container?
2. Is the probe failing, timing out, or targeting the wrong port/path?
3. Is a startup probe still suppressing readiness?
4. Is the sidecar currently waiting in restart backoff?
5. Are custom `readinessGates` also present?
6. Which Services select the Pod, and what do their EndpointSlices report?
7. Should this sidecar failure really remove the application from traffic?

The final question is architectural. Kubernetes correctly combines container readiness at the Pod boundary; it cannot decide whether a logging backend, proxy control plane, or credential refresh is essential to your application's serving contract. Encode that decision deliberately.

## Official Documentation

- [Kubernetes: Sidecar Containers and Readiness](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Pod Conditions and Readiness Gates](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Pods and Endpoints Termination Flow](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
