# How to Debug DNS Resolution Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Debugging, Kubernetes, Troubleshooting, Service Mesh

Description: A comprehensive troubleshooting guide for diagnosing and resolving DNS resolution problems in Istio service mesh environments.

---

DNS issues in Istio can be really frustrating because they manifest in different ways. Sometimes you get a clear "name resolution failed" error. Other times, connections just time out or go to the wrong backend, and it takes a while to realize the root cause is DNS-related. Here's a systematic approach to debugging DNS problems in an Istio mesh.

## Step 1: Identify Where DNS Resolution Happens

The first thing to understand is where in the chain DNS resolution is happening. In an Istio setup, there are up to three places:

1. **Application container** - resolves names through `/etc/resolv.conf`, which typically points to CoreDNS
2. **Istio DNS proxy** (if enabled) - intercepts DNS queries from the app container and resolves them locally
3. **Envoy sidecar** - for ServiceEntry resources with `resolution: DNS`, Envoy itself does DNS resolution when establishing upstream connections

Knowing which layer has the problem narrows down your debugging significantly.

## Step 2: Test DNS from the Application Container

Start by verifying basic DNS resolution from within the application container (not the sidecar):

```bash
kubectl exec -it deploy/my-app -c my-app -- nslookup my-service.default.svc.cluster.local
```

If you don't have nslookup in your container, try:

```bash
kubectl exec -it deploy/my-app -c my-app -- getent hosts my-service.default.svc.cluster.local
```

Or with a minimal container:

```bash
kubectl exec -it deploy/my-app -c my-app -- cat /etc/resolv.conf
```

This tells you what DNS servers are configured. The typical output looks like:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

If the nameserver IP doesn't match your CoreDNS service IP, that's your first clue. When DNS proxy is enabled, you might see the nameserver redirected to the sidecar.

## Step 3: Test DNS from the Sidecar

If the DNS proxy is enabled, test resolution through the sidecar:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns
```

This shows you DNS proxy statistics. Look for:
- High values in failure counters
- Whether queries are being forwarded or resolved locally
- Cache hit rates

You can also try resolving directly:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- nslookup my-service.default.svc.cluster.local localhost
```

## Step 4: Check CoreDNS

If the issue isn't in the sidecar, check CoreDNS itself:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Make sure CoreDNS pods are running. Check their logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

Look for error messages about failing to resolve names, loop detection, or resource exhaustion.

A quick health check:

```bash
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default.svc.cluster.local
```

## Step 5: Check Istio Service Registry

Sometimes DNS resolves fine but Istio doesn't know about the service. Check if the service is in the sidecar's service registry:

```bash
istioctl proxy-config cluster deploy/my-app | grep my-target-service
```

If the service doesn't show up, possible causes include:
- The Sidecar resource is limiting visibility
- The namespace isn't included in the mesh
- ServiceEntry is missing or misconfigured

Check the endpoints too:

```bash
istioctl proxy-config endpoint deploy/my-app | grep my-target-service
```

If the cluster exists but has no endpoints, the service might not have healthy pods backing it.

## Step 6: Common DNS Problems and Solutions

### Problem: "No healthy upstream" Errors

This usually means DNS resolved fine, but the sidecar can't find any healthy endpoints for the resolved service.

```bash
# Check endpoint health
istioctl proxy-config endpoint deploy/my-app --cluster "outbound|8080||my-service.default.svc.cluster.local"
```

Look at the health status of each endpoint. If they're all UNHEALTHY, the health checks are failing.

### Problem: DNS Resolution Timeout

If DNS queries take a long time or time out, it could be a few things:

1. CoreDNS is overloaded:
```bash
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

2. The `ndots` setting is causing excessive search domain expansion:
```bash
kubectl exec -it deploy/my-app -c my-app -- cat /etc/resolv.conf
```

With `ndots:5` (the Kubernetes default), a query for `api.example.com` (which has 2 dots, fewer than 5) will first try:
- `api.example.com.default.svc.cluster.local`
- `api.example.com.svc.cluster.local`
- `api.example.com.cluster.local`
- `api.example.com`

That's four DNS queries for every external hostname. You can reduce this by setting ndots in your pod spec:

```yaml
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"
```

### Problem: ServiceEntry Host Not Resolving

If you've created a ServiceEntry but the hostname doesn't resolve:

1. Check if DNS proxy is enabled (required for ServiceEntry DNS resolution):
```bash
istioctl proxy-config bootstrap deploy/my-app | grep DNS_CAPTURE
```

2. Check if the ServiceEntry is visible to the sidecar:
```bash
istioctl proxy-config cluster deploy/my-app | grep external-service
```

3. Make sure `ISTIO_META_DNS_AUTO_ALLOCATE` is enabled if you're using TCP services without explicit addresses.

### Problem: Cross-Namespace Resolution Fails

If resolving services in other namespaces fails, check the Sidecar resource:

```bash
kubectl get sidecar -n my-namespace -o yaml
```

If there's a Sidecar resource with an `egress` section, make sure the target namespace is included:

```yaml
spec:
  egress:
  - hosts:
    - "./*"
    - "other-namespace/*"
```

### Problem: DNS Works but Traffic Goes to Wrong Backend

This is tricky. DNS resolves to the right IP, but the response comes from a different service. This usually happens when:

1. Multiple services share the same port and IP (which shouldn't happen with ClusterIP, but can with headless services)
2. The VirtualService routing is overriding the destination

Check the route configuration:

```bash
istioctl proxy-config route deploy/my-app
```

## Step 7: Enable Debug Logging

For detailed DNS debugging, enable debug logging on the proxy:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request POST 'logging?dns=debug'
```

Then check the logs:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep -i dns
```

Remember to turn off debug logging when you're done:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request POST 'logging?dns=warning'
```

## Quick Reference Debugging Commands

Here's a cheat sheet of commands for DNS debugging:

```bash
# Check resolv.conf
kubectl exec -it deploy/my-app -c my-app -- cat /etc/resolv.conf

# Test resolution from app
kubectl exec -it deploy/my-app -c my-app -- nslookup hostname

# Check DNS proxy stats
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns

# Check if service is in registry
istioctl proxy-config cluster deploy/my-app | grep hostname

# Check endpoints
istioctl proxy-config endpoint deploy/my-app | grep hostname

# Check CoreDNS health
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20

# Check Sidecar config
kubectl get sidecar -n my-namespace -o yaml
```

DNS debugging in Istio is a process of elimination. Start from the application layer and work your way down through the proxy, CoreDNS, and the Istio service registry. Most problems fall into a handful of categories, and once you've built the muscle memory for these debugging commands, you can diagnose issues pretty quickly.
