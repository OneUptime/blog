# How to Upgrade Istio Sidecars Without Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Sidecar, Zero Downtime

Description: Techniques for upgrading Istio sidecar proxies across your cluster without causing application downtime or dropping active connections.

---

After upgrading the Istio control plane, your sidecar proxies are still running the old version. You need to restart your application pods to pick up the new proxy, but restarting pods means potential downtime. In a busy production environment, even brief interruptions can affect users.

The good news is that with the right setup, you can roll sidecar proxies forward without dropping a single request. It takes some preparation, but the techniques are straightforward.

## Why Sidecar Upgrades Need Care

When a pod restarts to pick up a new sidecar, several things happen:

1. Kubernetes sends a SIGTERM to the old pod
2. The pod enters a terminating state and is removed from Service endpoints
3. A new pod starts with the new sidecar
4. The new pod passes readiness checks and gets added to Service endpoints

The risk window is during steps 2 and 3. If traffic is still flowing to the terminating pod, requests can fail. If the new pod is not ready yet, there are fewer endpoints to handle traffic. With enough replicas and proper configuration, this overlap is seamless. Without it, you get connection errors.

## Prerequisite: Multiple Replicas

The most fundamental requirement is running more than one replica of each deployment. If you have a single-replica deployment, there is no way to avoid a brief gap.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

The critical setting here is `maxUnavailable: 0`. This tells Kubernetes to never reduce the number of available pods below the current count during a rollout. A new pod must be ready before an old pod is terminated.

## Configure Pod Disruption Budgets

PodDisruptionBudgets (PDBs) protect your application from having too many pods down at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service-pdb
  namespace: my-app
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-service
```

This guarantees at least 2 pods are always running, regardless of voluntary disruptions like rolling restarts.

## Enable holdApplicationUntilProxyStarts

By default, the application container starts at the same time as the sidecar proxy. If the application tries to make network requests before the proxy is ready, those requests fail. Istio provides a configuration to hold the application container until the proxy is ready:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or set it in your Helm values:

```yaml
meshConfig:
  defaultConfig:
    holdApplicationUntilProxyStarts: true
```

This ensures the new pod does not start serving traffic until the sidecar proxy is fully initialized and connected to the control plane.

## Configure Proxy Readiness

The sidecar proxy has its own readiness probe. Make sure it is configured properly:

```yaml
apiVersion: networking.istio.io/v1
kind: ProxyConfig
metadata:
  name: my-proxy-config
  namespace: my-app
spec:
  concurrency: 2
  environmentVariables:
    ISTIO_AGENT_FLAGS: "--readinessProbe=true"
```

The default readiness probe checks that the proxy can reach the control plane and has received its initial configuration. This is usually sufficient, but for critical services, you might want additional checks.

## Graceful Shutdown Configuration

When a pod is terminating, you want the sidecar to drain existing connections gracefully rather than dropping them immediately. Configure the termination drain duration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

This gives in-flight requests 30 seconds to complete before the proxy shuts down. Adjust the duration based on your longest expected request time.

You should also set the `terminationGracePeriodSeconds` on your pod to be longer than the drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: my-service
        # ...
```

## The Rolling Restart Process

With all the prerequisites in place, the actual sidecar upgrade is a rolling restart. Do it namespace by namespace, starting with the least critical:

```bash
# Start with non-critical namespaces
kubectl rollout restart deployment -n internal-tools
kubectl rollout status deployment -n internal-tools --timeout=600s

# Move to more important namespaces
kubectl rollout restart deployment -n backend-services
kubectl rollout status deployment -n backend-services --timeout=600s

# Critical services last
kubectl rollout restart deployment -n payment-service
kubectl rollout status deployment -n payment-service --timeout=600s
```

Watch each rollout complete before starting the next. If something goes wrong in a less critical namespace, you can investigate without affecting the more important services.

## Monitoring During the Rollout

Keep a close eye on your metrics during the sidecar rollout:

```bash
# Watch for proxy version changes in real time
watch 'istioctl proxy-status | grep -c "1.21"'
```

Set up a dashboard that shows:

- HTTP error rates per service
- Request latency (p50, p95, p99)
- Active connections
- Proxy sync status

A quick way to check for problems:

```bash
# Look for connection errors in proxy logs
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=50 | grep -i "error\|reset\|refused"
```

## Dealing with Long-Lived Connections

gRPC streams, WebSocket connections, and other long-lived connections are the trickiest part of zero-downtime sidecar upgrades. When a pod terminates, these connections are broken regardless of drain settings.

Strategies for handling long-lived connections:

**Client-side retry logic.** Your applications should handle connection resets gracefully and reconnect automatically. This is good practice regardless of Istio upgrades.

**Connection draining via GOAWAY.** For HTTP/2 and gRPC, the proxy sends a GOAWAY frame before shutting down, which tells clients to stop sending new requests on that connection and open a new one.

**Staggered restarts.** Instead of restarting all pods in a deployment at once, restart them slowly:

```bash
# Restart pods one at a time with a delay
for pod in $(kubectl get pods -n my-app -l app=my-service -o name); do
  kubectl delete $pod -n my-app
  sleep 30  # Wait for the new pod to be ready
done
```

This is slower than a rollout restart but gives more control.

## Using Sidecar Injection Annotations

You can control sidecar injection at the pod level using annotations. This is useful if you want to upgrade sidecars for specific pods rather than entire deployments:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/proxyImage: docker.io/istio/proxyv2:1.21.0
```

This forces a specific proxy version regardless of the control plane version. Use this sparingly - it is better to keep proxies in sync with the control plane.

## Verifying Zero Downtime

After the rollout, confirm that no requests were dropped:

```bash
# Check proxy stats for connection errors
istioctl proxy-config listeners <pod-name> -n my-app

# Check for 503 errors during the upgrade window
kubectl logs -n my-app -l app=my-service -c istio-proxy --since=30m | grep "response_code:503" | wc -l
```

If your monitoring shows zero 5xx errors during the sidecar upgrade window, you achieved zero-downtime.

## Summary

Upgrading Istio sidecars without downtime requires preparation: multiple replicas with `maxUnavailable: 0`, PodDisruptionBudgets, `holdApplicationUntilProxyStarts`, proper termination drain settings, and careful monitoring. Roll namespaces one at a time, watch your metrics, and handle long-lived connections with client-side retry logic. The effort to set these up once pays off every time you upgrade Istio.
