# How to Prevent Port Conflicts When App and Sidecar Share a Pod Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Networking, Ports, Services

Description: Prevent app and sidecar bind failures by treating a Pod as one network host, inventorying real listeners, assigning non-overlapping ports, and aligning probes and Services.

---

Every container in a Kubernetes Pod shares the Pod's network namespace, including its IP addresses, loopback interface, and network ports. From a port-allocation perspective, a multi-container Pod behaves like one host.

If the app binds TCP `0.0.0.0:8080` and the sidecar tries to bind the same address, protocol, and port, the second process normally fails with “address already in use.” Separate container images do not create separate port spaces.

## `containerPort` Does Not Create Isolation

This manifest documents the same port twice but does not give each container a private 8080:

```yaml
containers:
  - name: app
    image: example.com/app@sha256:APP_DIGEST
    ports:
      - name: app-http
        containerPort: 8080
  - name: helper
    image: example.com/helper@sha256:HELPER_DIGEST
    ports:
      - name: helper-http
        containerPort: 8080
```

The `ports` entries describe intended listeners and provide names for other Kubernetes fields. They do not make a process listen, reserve a socket, or detect all runtime collisions at admission.

Give actual servers distinct ports:

```yaml
containers:
  - name: app
    image: example.com/app@sha256:APP_DIGEST
    args: ["--listen=:8080"]
    ports:
      - name: app-http
        containerPort: 8080
  - name: metrics-sidecar
    image: example.com/metrics@sha256:METRICS_DIGEST
    args: ["--listen=127.0.0.1:9091"]
    ports:
      - name: sidecar-metrics
        containerPort: 9091
```

The app can reach the sidecar at `http://127.0.0.1:9091`. Binding the helper to loopback also avoids exposing it on the Pod IP, but it does not permit another process to bind the same loopback address and port.

TCP and UDP have separate protocol spaces, and specific-address bindings have operating-system nuances. Do not use those nuances as an allocation strategy. Assign every listener an explicit, unique `(protocol, address, port)` contract.

## Inventory Ports Before Adding or Injecting a Sidecar

Include more than the main HTTP listener:

- admin and health endpoints;
- metrics exporters;
- debug and profiling servers;
- gRPC and management ports;
- local proxies and redirect listeners;
- dynamically injected mesh ports;
- application frameworks that start an auxiliary server;
- `hostPort` and `hostNetwork` bindings.

Inspect the source template and the admitted Pod because a mutating webhook may add listeners:

```bash
kubectl get deployment checkout -o yaml
kubectl get pod <checkout-pod> -o yaml
kubectl exec <checkout-pod> -c app -- ss -lntup
```

Run the final command from whichever container has an appropriate tool. Since the network namespace is shared, it can see Pod listeners allowed by its permissions. For a distroless workload, use an ephemeral debug container with a trusted image.

## Align Services and Probes with the New Allocation

A Service selects Pods, not a particular container. Its `targetPort` must identify the port that the intended process actually serves:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout
spec:
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: app-http
```

Named ports reduce accidental coupling to a number. Give each port a unique name within the Pod and point probes at the correct one:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: app-http
```

After changing an app port, update all consumers: Service `targetPort`, probes, NetworkPolicies, scrape configuration, proxy capture rules, dashboards, and any localhost client in the other container.

Be careful with service-mesh probe rewriting. A mesh may intercept or rewrite application probes; follow that mesh's documentation and verify the admitted Pod instead of assuming kubelet calls the original port directly.

## Distinguish Pod Ports from Host Ports

`containerPort` is descriptive. `hostPort` asks the runtime to expose a port on the node, adding a second collision domain across Pods scheduled to that node. `hostNetwork: true` places the Pod in the node's network namespace, making host listener conflicts even more direct.

Most app-sidecar designs need neither `hostPort` nor `hostNetwork`. Use a Service to expose the app and localhost for private app-sidecar communication.

## Make Port Allocation a Tested Interface

A robust process is:

1. reserve well-known port ranges in platform documentation;
2. make each process' listen address and port explicit in configuration;
3. name declared ports by purpose, such as `app-http` and `proxy-admin`;
4. render all admission mutations in CI or a staging cluster;
5. start the complete Pod and assert expected listeners;
6. send traffic through the Service and localhost paths;
7. alert on container restarts and bind errors after rollout.

When an injected sidecar collides with a fixed legacy port, prefer configuring the injector's supported port setting or changing the app through a controlled release. Do not edit the generated Pod: it is immutable and the controller will replace it from the old template.

## Diagnose an Existing Collision

Look for the failing container and its previous log:

```bash
kubectl describe pod <pod>
kubectl logs <pod> -c <container> --previous
```

Then compare configured and actual sockets:

```bash
kubectl get pod <pod> -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.ports}{"\n"}{end}'
kubectl debug -it <pod> --image=registry.example.com/net-debug@sha256:DEBUG_DIGEST -- ss -lntup
```

Remember that a missing `containerPort` declaration does not mean no process is listening, and a declaration does not mean one is. Runtime socket inspection and the process configuration are decisive.

## Official Documentation

- [Kubernetes: Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
