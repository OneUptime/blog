# How to Handle Data Plane Graceful Shutdown

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Graceful Shutdown, Kubernetes, Envoy

Description: Complete guide to configuring graceful shutdown for Istio sidecars to prevent dropped requests during pod termination and deployments.

---

Graceful shutdown is what separates a smooth deployment from one that drops user requests. When a pod terminates in an Istio mesh, both the application container and the Envoy sidecar need to shut down without losing in-flight requests. Getting this right requires understanding the ordering of events and configuring the timing correctly.

## The Pod Termination Sequence

When Kubernetes terminates a pod, several things happen simultaneously, and the ordering matters a lot:

1. The pod enters the `Terminating` state
2. The termination grace period countdown starts
3. The pod is marked as terminating and no longer considered ready for normal Service traffic
4. The `preStop` hook runs for each container that defines one
5. SIGTERM is sent to each container after its `preStop` hook completes
6. After the grace period, SIGKILL is sent

The problem is that endpoint updates and container shutdown are asynchronous. This means there is a race condition: other services might still send traffic to this pod because they have not yet received the updated endpoint list.

## The Race Condition Problem

Consider this scenario:
1. Pod A is being terminated
2. Kubernetes marks Pod A as terminating and not ready for normal Service traffic
3. Pod B's Envoy sidecar has not received the endpoint update yet (EDS propagation takes a few seconds)
4. Pod B sends a request to Pod A
5. Pod A's Envoy sidecar has already started shutting down
6. The request fails with a 503

This is the most common cause of errors during deployments in Istio meshes. The fix involves making sure the dying pod stays alive long enough for all other proxies to learn it is gone.

## Configuring the preStop Hook

The first line of defense is a preStop hook that adds a delay before your application starts shutting down:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "5"]
        ports:
        - containerPort: 8080
```

The 5-second sleep delays SIGTERM for the application container and gives time for:
- Kubernetes to update the endpoint list
- istiod to process the endpoint change
- istiod to push the updated EDS to all Envoy proxies
- All proxies to apply the new endpoint list

In most clusters, 5 seconds is enough. In very large clusters or clusters with high control plane load, you might need 10 seconds. Remember that `preStop` time counts against `terminationGracePeriodSeconds`, and a `preStop` hook on only the application container does not delay SIGTERM for other containers.

## Configuring Sidecar Drain Duration

The sidecar drain duration controls how long the Envoy proxy waits for active connections to complete after receiving SIGTERM:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
```

During the drain period:
- Envoy starts gracefully draining and discourages new connections
- Existing connections continue to be served
- New requests that arrive (from proxies that have not received the endpoint update) may fail, commonly with a 503
- After the drain duration, all remaining connections are closed

## The EXIT_ON_ZERO_ACTIVE_CONNECTIONS Optimization

Waiting the full drain duration even when there are no active connections wastes time during deployments. Enable early exit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

With this setting, if all connections drain in 3 seconds, the sidecar exits after 3 seconds instead of waiting the full 30. This can significantly speed up rolling deployments.

## Sidecar and Application Container Ordering

A tricky aspect of graceful shutdown is the ordering between the sidecar and the application container. If the sidecar shuts down before the application, the application loses network access and cannot complete in-flight requests or make any outbound calls during its own shutdown process.

Historically, Kubernetes did not give regular sidecar containers special lifecycle ordering, so the application and proxy shutdown paths were decoupled. Newer Kubernetes native sidecar support improves this ordering when Istio is configured to use native sidecars.

You can also configure the sidecar to be ready before the application starts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 20s
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

The `holdApplicationUntilProxyStarts` setting is a startup ordering option. It helps prevent application startup before the proxy is ready, but it does not by itself make the sidecar wait for application shutdown.

## Handling Long-Running Requests

If your application handles requests that can take a long time (file uploads, report generation, long-running API calls), you need to account for these in your drain configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-generator
spec:
  selector:
    matchLabels:
      app: report-generator
  template:
    metadata:
      labels:
        app: report-generator
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 120s
    spec:
      terminationGracePeriodSeconds: 180
      containers:
      - name: report-generator
        image: report-gen:latest
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "5"]
```

In this example, the drain duration is 2 minutes (for long-running report generation), and the Kubernetes grace period is 3 minutes (to give enough headroom).

## Testing Graceful Shutdown

You should test that your configuration actually works. Here is a simple test procedure:

1. Deploy a test client that sends continuous requests:

```bash
kubectl run test-client --image=curlimages/curl --command -- sh -c 'while true; do curl -s -o /dev/null -w "%{http_code}\n" http://my-app:8080/health; sleep 0.1; done'
```

2. Watch the output:

```bash
kubectl logs test-client -f
```

3. In another terminal, trigger a rolling restart:

```bash
kubectl rollout restart deployment my-app
```

4. Check the test client logs for any non-200 responses. If you see 503s during the rollout, your graceful shutdown configuration needs tuning.

## Monitoring Shutdown Behavior

Track connection termination errors in your metrics:

```promql
# Requests that failed due to upstream connection termination

rate(istio_requests_total{response_flags=~".*UC.*"}[5m])

# Requests that failed due to no healthy upstream
rate(istio_requests_total{response_flags=~".*UH.*"}[5m])

# Requests that failed due to upstream overflow
rate(istio_requests_total{response_flags=~".*UO.*"}[5m])
```

If you see spikes in these metrics during deployments, your graceful shutdown is not working properly.

## PodDisruptionBudgets

For critical services, combine graceful shutdown with PodDisruptionBudgets (PDBs) to control how many pods can be down simultaneously:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

This requires voluntary evictions to leave at least 2 matching pods available, which helps during node drains or cluster upgrades. Combined with proper graceful shutdown configuration, this reduces the risk of deployment-time errors.

## Rolling Update Configuration

The deployment rolling update strategy also affects graceful shutdown behavior:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-app:latest
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

Setting `maxUnavailable: 0` means Kubernetes will always create a new pod before terminating an old one. This ensures there are always enough pods to handle traffic during the rollout.

## Summary Timing Diagram

Here is how all the timings should line up for a well-configured graceful shutdown:

```text
Time    Event
0s      Pod enters Terminating state
0-5s    Application preStop sleep (endpoint propagation)
5s      SIGTERM sent to the application container
0-35s   Sidecar draining window if its termination starts immediately
5-35s   Application handling remaining requests
35s     Sidecar exits after drain starts (or earlier if EXIT_ON_ZERO_ACTIVE_CONNECTIONS)
60s     terminationGracePeriodSeconds deadline (SIGKILL if still running)
```

The key relationships:
- `preStop delay + terminationDrainDuration` < `terminationGracePeriodSeconds`
- If your proxy is not using native sidecar shutdown ordering, do not assume the application container's `preStop` hook delays sidecar termination
- Leave at least 10-15 seconds of buffer before the grace period deadline

Getting graceful shutdown right is not glamorous work, but it directly impacts your users. A few minutes of configuration saves you from error spikes during every deployment. Test it, monitor it, and adjust the timings based on your specific application behavior.
