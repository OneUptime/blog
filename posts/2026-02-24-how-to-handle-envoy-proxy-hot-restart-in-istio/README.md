# How to Handle Envoy Proxy Hot Restart in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Hot Restart, Kubernetes, Operations

Description: Understand how Envoy proxy hot restart works in Istio, when it happens, how to configure drain duration, and how to troubleshoot common issues during sidecar restarts.

---

Envoy proxy supports a mechanism called "hot restart" that allows a new Envoy process to take over from an old one without dropping connections. In the Istio context, this comes into play during sidecar updates, configuration changes, and pod lifecycle events. Understanding how it works helps you avoid unexpected connection drops and plan for zero-downtime deployments.

## What Hot Restart Actually Is

When Envoy hot restarts, two processes run simultaneously for a brief period:

1. The new Envoy process starts up and begins accepting new connections
2. The old Envoy process stops accepting new connections and starts draining existing ones
3. After the drain period, the old process shuts down

During the overlap period, the old process shares its listen sockets with the new process through a Unix domain socket. This means there's no gap where no process is listening - new connections go to the new process while existing connections finish gracefully on the old one.

## When Hot Restart Happens in Istio

In practice, Envoy hot restart in Istio occurs in these scenarios:

**Pod termination** - When Kubernetes sends a SIGTERM to a pod, the Envoy sidecar enters its drain phase before shutting down.

**Sidecar injection updates** - When Istio is upgraded and pods are restarted, the new sidecar replaces the old one.

**Configuration updates** - Normally, Envoy handles config changes via xDS (dynamic configuration) without restarting. But certain changes (like bootstrap configuration) require a restart.

Most of the time in Istio, you're dealing with the drain phase during pod termination rather than a true hot restart between two Envoy processes. The drain mechanism is the more important thing to configure correctly.

## Configuring Drain Duration

The drain duration controls how long Envoy waits for existing connections to complete before forcefully closing them. The default in Istio is 45 seconds.

You can change this globally through MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 30s
```

Or per workload using an annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 60s
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

For long-lived connections (WebSockets, gRPC streams), you might want a longer drain duration. For short-lived HTTP requests, the default 45 seconds is usually more than enough.

## The Termination Drain Duration

There's another setting that controls how long the sidecar waits during pod termination specifically. This is the `terminationDrainDuration`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

This duration needs to be shorter than the pod's `terminationGracePeriodSeconds`. If the pod's grace period expires before the drain completes, Kubernetes sends a SIGKILL and everything shuts down immediately.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 25s
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-service
        image: my-service:latest
```

The math should work out like this: leave at least 5 seconds of buffer between `terminationDrainDuration` and `terminationGracePeriodSeconds`.

## Understanding the Shutdown Sequence

When a pod gets terminated, here's the detailed sequence:

1. Kubernetes sends SIGTERM to all containers in the pod
2. The application container starts shutting down
3. The istio-proxy container receives SIGTERM
4. Envoy stops accepting new connections on inbound listeners
5. Envoy starts draining existing connections (sending connection: close headers for HTTP/1.1, GOAWAY for HTTP/2)
6. Envoy waits for `terminationDrainDuration`
7. After the drain period, Envoy shuts down
8. If `terminationGracePeriodSeconds` expires, Kubernetes sends SIGKILL

A common problem is that the application container shuts down before Envoy finishes draining. This causes in-flight requests to fail. You can mitigate this with a preStop hook on the application container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-service:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The 5-second sleep gives Envoy time to start draining before the application begins its shutdown.

## EXIT_ON_ZERO_ACTIVE_CONNECTIONS

Istio 1.12 introduced the `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` environment variable for the sidecar. When enabled, Envoy shuts down as soon as all active connections are drained, rather than waiting for the full drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

This is really helpful for services with short-lived connections. Instead of always waiting the full drain duration, Envoy exits as soon as it's done. This speeds up deployments because pods terminate faster.

## Monitoring Drain Behavior

To see what's happening during the drain phase, check the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy --follow
```

During draining, you'll see log entries about connections being closed and the drain manager's status.

You can also check the Envoy admin interface to see the current server state:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/server_info | python3 -m json.tool
```

The `state` field will show `LIVE`, `DRAINING`, or `PRE_INITIALIZING`.

To see active connections during drain:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep downstream_cx_active
```

## Handling Long-Lived Connections

WebSocket connections and gRPC streaming connections can last for minutes or hours. The default drain duration is nowhere near long enough for these. You have a few options:

**Increase drain duration** for workloads with long-lived connections:

```yaml
annotations:
  proxy.istio.io/config: |
    drainDuration: 300s
    terminationDrainDuration: 300s
```

Make sure to increase `terminationGracePeriodSeconds` accordingly:

```yaml
spec:
  terminationGracePeriodSeconds: 310
```

**Use application-level reconnection logic.** The better long-term solution is to have your clients handle disconnections gracefully and reconnect automatically. This way you don't need excessively long drain periods.

## Troubleshooting Hot Restart Issues

**Connections dropping during deployments:**

Check if the drain duration is long enough:

```bash
istioctl proxy-config bootstrap <pod-name> -n <namespace> -o json | grep -i drain
```

Check if `terminationGracePeriodSeconds` is longer than the drain duration.

**Sidecar not shutting down cleanly:**

Look at the sidecar logs during termination:

```bash
kubectl logs <pod-name> -c istio-proxy --previous
```

The `--previous` flag shows logs from the terminated container.

**Port conflicts during restart:**

If you see errors about ports being in use, it usually means the old Envoy process didn't release the socket in time. This is rare but can happen if the shared memory used for hot restart coordination gets corrupted. Deleting and recreating the pod resolves it.

## Shared Memory and Hot Restart

Envoy uses shared memory segments for hot restart coordination. In Kubernetes, these are stored in the container's filesystem. You can see them by checking:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ls -la /dev/shm/
```

The `--parent-shutdown-time-s` and `--drain-time-s` flags in the Envoy binary control the hot restart timing. In Istio, these are set by the pilot-agent process that manages the Envoy lifecycle.

## Best Practices

Keep `terminationDrainDuration` at least 5 seconds shorter than `terminationGracePeriodSeconds`. Use `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` for services with short-lived requests to speed up pod termination. Add a preStop hook with a short sleep to your application container to give Envoy time to start draining. For long-lived connections, increase drain durations and grace periods accordingly, but also build reconnection logic into your clients.

Hot restart and drain behavior might seem like implementation details, but they're directly responsible for whether your users see errors during deployments. Getting these settings right is worth the effort.
