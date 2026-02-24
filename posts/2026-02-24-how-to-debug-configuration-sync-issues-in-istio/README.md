# How to Debug Configuration Sync Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration Sync, Debugging, Envoy, Control Plane

Description: A hands-on guide to diagnosing and fixing configuration sync issues between Istio's control plane (istiod) and the Envoy sidecar proxies in your mesh.

---

You applied a new VirtualService, waited a few seconds, and nothing changed. Traffic is still going to the old destination. Or maybe some pods picked up the change but others did not. This is a configuration sync issue, and it is one of the most frustrating problems to debug in Istio because the configuration looks correct but the behavior is wrong.

The flow is straightforward in theory: you create or update an Istio resource, istiod processes it, and pushes the updated Envoy configuration to all affected sidecar proxies via xDS. In practice, several things can go wrong along this path.

## Understanding the Config Push Pipeline

When you apply an Istio resource, here is what happens:

1. The Kubernetes API server stores the resource
2. Istiod watches for changes and picks up the new resource
3. Istiod translates it into Envoy configuration
4. Istiod pushes the configuration to affected proxies via xDS (gRPC streaming)
5. Each Envoy sidecar receives the config and applies it

A failure or delay at any of these stages causes sync issues.

## Step 1: Verify the Resource Exists in Kubernetes

Start by confirming the resource is actually in the cluster:

```bash
kubectl get virtualservice my-app-vs -n default -o yaml
```

Check the `metadata.resourceVersion` and `metadata.creationTimestamp` to make sure you are looking at the right version. If you applied an update but the resource shows the old content, there might be a webhook or admission controller modifying it.

## Step 2: Check istiod Logs

Istiod logs tell you if it picked up the change and whether it had trouble pushing it:

```bash
kubectl logs -n istio-system -l app=istiod --tail=100 -f
```

Look for lines like:

```
info    ads    Push debounce stable 1 for config VirtualService/default/my-app-vs: 100.267794ms since last change, 100.267794ms since last push
info    ads    XDS: Pushing:2023-01-01T00:00:00Z/1 Services:15 ConnectedEndpoints:42 Version:2023-01-01T00:00:00Z/1
```

If you do not see any push triggered after your change, istiod might not be watching the right namespace. Check the `meshConfig.discoverySelectors` in your Istio installation:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}'
```

## Step 3: Check Proxy Sync Status

The `istioctl proxy-status` command is your best friend for sync issues. It shows whether each proxy is in sync with istiod:

```bash
istioctl proxy-status
```

Output looks like:

```
NAME                          CDS        LDS        EDS        RDS        ECDS       ISTIOD
my-app-xxxxx.default          SYNCED     SYNCED     SYNCED     SYNCED     IGNORED    istiod-xxxxx
payment-xxxxx.default         STALE      SYNCED     SYNCED     SYNCED     IGNORED    istiod-xxxxx
```

The statuses mean:

- **SYNCED**: The proxy has the latest configuration from istiod
- **STALE**: The proxy has not received the latest configuration push
- **NOT SENT**: Istiod has not sent any configuration to this proxy (possibly not needed)

If a proxy shows STALE, there is a communication problem between istiod and that proxy.

## Step 4: Diagnose STALE Proxies

A STALE proxy usually means one of these:

### The xDS connection is broken

Check if the sidecar can reach istiod:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/clusters | grep istiod
```

Check the proxy's connection to istiod:

```bash
istioctl proxy-config bootstrap my-app-xxxxx.default | grep -A 5 "discovery_address"
```

### The proxy is overloaded

Envoy might be rejecting config pushes if it is under heavy load. Check Envoy's admin stats:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep -E "update_rejected|update_failure"
```

### Network policy blocking gRPC

If you have Kubernetes NetworkPolicies, make sure they allow traffic from the sidecar to istiod on port 15012:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istiod
  namespace: default
spec:
  podSelector: {}
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - port: 15012
          protocol: TCP
```

## Step 5: Compare Proxy Config with Expected Config

Use `istioctl proxy-config` to see what configuration the proxy actually has:

```bash
# Check routes
istioctl proxy-config routes my-app-xxxxx.default

# Check clusters (upstream endpoints)
istioctl proxy-config clusters my-app-xxxxx.default

# Check listeners
istioctl proxy-config listeners my-app-xxxxx.default
```

Compare this with what you expect based on your VirtualService. If the route is missing, the config push either has not happened or the VirtualService is not targeting this proxy correctly.

You can also get a diff between what istiod wants to send and what the proxy has:

```bash
istioctl proxy-status my-app-xxxxx.default
```

When you specify a single proxy, it shows detailed diff information.

## Step 6: Check for Push Errors

Istiod tracks push errors in its metrics. If you have Prometheus set up:

```
pilot_xds_push_errors
pilot_proxy_convergence_time_bucket
pilot_xds_pushes
```

Query these in Prometheus or Grafana to see if pushes are failing:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_errors
```

## Step 7: Resource Limits on istiod

If istiod is resource-constrained, it may delay or drop configuration pushes. Check its resource usage:

```bash
kubectl top pod -n istio-system -l app=istiod
```

If memory or CPU is close to limits, increase them:

```bash
kubectl edit deployment istiod -n istio-system
```

Or better, update your IstioOperator or Helm values:

```yaml
# Helm values
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
```

## Step 8: Check Push Debounce Settings

Istiod debounces configuration pushes to avoid sending too many updates in quick succession. The default debounce period is 100ms. If you are making rapid changes and expecting immediate updates, the debounce might be grouping your changes.

Check the debounce settings:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 5 debounce
```

For testing, you can reduce the debounce (not recommended for production):

```yaml
meshConfig:
  defaultConfig:
    discoveryAddress: istiod.istio-system.svc:15012
```

## Step 9: Sidecar Resource Scope

If you are using Sidecar resources to limit proxy configuration scope, a misconfigured Sidecar resource might exclude the service you are trying to route to:

```bash
kubectl get sidecars --all-namespaces
```

Check if a Sidecar resource is filtering out the host your VirtualService targets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This Sidecar only allows egress to services in the same namespace and istio-system. If your VirtualService routes to a service in another namespace, the proxy will never receive that route.

## Quick Checklist

When debugging config sync issues, work through this checklist:

1. Is the resource in Kubernetes? (`kubectl get`)
2. Did istiod pick it up? (istiod logs)
3. Is the proxy in sync? (`istioctl proxy-status`)
4. Can the proxy reach istiod? (connectivity check)
5. Is istiod healthy and not resource-constrained? (`kubectl top`)
6. Is there a Sidecar resource limiting scope?
7. Are push errors showing up in metrics?

Configuration sync issues are usually solvable once you pinpoint where in the pipeline the breakdown occurs. Start with `istioctl proxy-status`, follow the trail from there, and most issues become clear within a few minutes.
