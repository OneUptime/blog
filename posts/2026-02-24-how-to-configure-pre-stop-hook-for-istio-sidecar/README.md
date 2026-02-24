# How to Configure Pre-Stop Hook for Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PreStop Hook, Kubernetes, Sidecar, Pod Lifecycle

Description: Set up preStop lifecycle hooks for the Istio sidecar proxy to coordinate shutdown timing and prevent connection errors during deployments.

---

PreStop hooks in Kubernetes run before a container receives the SIGTERM signal. For the Istio sidecar, a preStop hook gives you a way to delay the proxy shutdown, keeping it alive long enough for the application container to finish handling requests. Without this coordination, the sidecar can shut down while the application is still processing, causing all sorts of connection failures.

## Why the Sidecar Needs a PreStop Hook

By default, when Kubernetes terminates a pod, SIGTERM goes to all containers at the same time. The application and sidecar both start shutting down simultaneously. This creates a problem: if the sidecar closes its listeners before the application finishes its last request, the response can't get back to the client.

Conversely, if the application shuts down first but the sidecar is still accepting inbound traffic, new requests arrive but there's nobody to handle them.

A preStop hook on the sidecar lets you insert a delay before the sidecar starts its shutdown sequence, giving the application container time to wrap up.

## Setting PreStop at the Mesh Level

You can configure a preStop hook for all sidecar proxies globally through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - "sleep 5"
```

This adds a 5-second delay before the sidecar receives SIGTERM. During those 5 seconds, the application can finish its shutdown procedure while the sidecar continues to proxy traffic.

If you're using Helm:

```bash
helm upgrade istiod istio/istiod -n istio-system \
  --set values.global.proxy.lifecycle.preStop.exec.command='{/bin/sh,-c,sleep 5}'
```

## Setting PreStop Per Workload

For individual workloads, you can override the global setting using annotations. Istio 1.18+ supports configuring sidecar lifecycle hooks through the `sidecar.istio.io/proxyLifecycle` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 20s
    spec:
      terminationGracePeriodSeconds: 40
      containers:
      - name: checkout-service
        image: checkout:v2
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

Note that you're setting the preStop on the application container here, not directly on the sidecar. The sidecar's preStop is configured through the IstioOperator or through the proxy config annotation. The application's preStop and the sidecar's preStop work together to coordinate the shutdown.

## The Shutdown Timeline with PreStop Hooks

Here's how the timing works with preStop hooks configured:

```
Pod receives termination signal
    |
    v
[T+0s] Kubernetes sends SIGTERM to all containers
[T+0s] Application preStop hook starts (sleep 5)
[T+0s] Sidecar preStop hook starts (sleep 5)
    |
    v
[T+5s] Application preStop completes, app gets SIGTERM
[T+5s] Sidecar preStop completes, sidecar gets SIGTERM
[T+5s] Sidecar enters drain mode (terminationDrainDuration)
    |
    v
[T+25s] Sidecar drain period ends (if set to 20s)
[T+40s] terminationGracePeriodSeconds expires, SIGKILL
```

Wait, that's not quite right. Both preStop hooks run simultaneously, so having the same duration on both doesn't actually help with sequencing. You want the application to finish before the sidecar, so the application's preStop should be shorter:

```yaml
# Application preStop: 3 seconds (just for endpoint removal propagation)
# Sidecar preStop: 8 seconds (wait for app to shut down first)
```

But since you can't directly set different preStop durations for the sidecar and app through simple annotations, you need to think about this differently.

## The Practical Pattern

The pattern that works best is: use the application preStop to delay the app shutdown, and use `terminationDrainDuration` to control how long the sidecar keeps connections alive:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 15s
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: checkout-service
        image: checkout:v2
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Wait for endpoint removal propagation
                sleep 5
                # Then let the app handle SIGTERM gracefully
```

The sidecar gets its own global preStop hook (set through IstioOperator), and the application has its own. The key is the math:

```
terminationGracePeriodSeconds (30s)
  >= application preStop (5s)
     + application shutdown time (~5s)
     + sidecar terminationDrainDuration (15s)
     + buffer (5s)
```

## Using the Quit Endpoint Instead of PreStop

Istio's sidecar has an admin endpoint that you can call to trigger shutdown. Instead of relying on SIGTERM timing, your application's preStop hook can explicitly tell the sidecar to shut down after the app is done:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 10s
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: checkout-service
        image: checkout:v2
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                sleep 5
                # Application handles remaining requests during these 5s
                # Then explicitly ask the sidecar to quit
                curl -sf -XPOST http://localhost:15020/quitquitquit || true
```

The `/quitquitquit` endpoint triggers Envoy's shutdown sequence. This gives you explicit control over when the sidecar starts draining, rather than relying on SIGTERM timing.

## Verifying PreStop Hook Execution

Check that preStop hooks are actually running:

```bash
# Check pod events for lifecycle hook execution
kubectl describe pod checkout-service-xxxx -n default | grep -A10 Events

# Watch the pod termination in real time
kubectl get pod -w -n default
```

You should see the pod stay in `Terminating` state for at least the duration of your preStop hooks before it disappears.

Also verify the sidecar's preStop is configured:

```bash
# Check the sidecar container spec in a running pod
kubectl get pod checkout-service-xxxx -n default -o json | \
  jq '.spec.containers[] | select(.name=="istio-proxy") | .lifecycle'
```

If this returns null, the sidecar preStop hook isn't set. Go back and check your IstioOperator configuration.

## Common Mistakes

**PreStop hook exceeding the grace period:** If your preStop hook sleeps for 25 seconds but the grace period is 30 seconds, you only have 5 seconds for the actual shutdown. That's probably not enough.

**Not accounting for preStop in both containers:** The grace period is shared. If the application preStop takes 10 seconds and the sidecar preStop takes 10 seconds, and they run in parallel, the maximum preStop time is 10 seconds (not 20).

**Using HTTP preStop hooks with the sidecar:** If your application preStop makes an HTTP call to the app to trigger drain, that HTTP call goes through the sidecar. If the sidecar is already draining, the call might fail. Use `exec` hooks instead.

**Forgetting that preStop hooks are blocking:** The container won't receive SIGTERM until the preStop hook completes. If your hook hangs (like a curl to an unreachable endpoint), the container just waits until the grace period expires and gets SIGKILL'd.

PreStop hooks are a simple mechanism, but getting the timing right with Istio requires careful thought about the interaction between all the components. Test with actual traffic during deployments, not just by reading YAML.
