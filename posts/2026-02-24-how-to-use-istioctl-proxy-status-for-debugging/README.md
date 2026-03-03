# How to Use istioctl proxy-status for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Kubernetes

Description: A practical guide to using istioctl proxy-status to diagnose configuration sync issues and debug Istio proxy connectivity problems.

---

When something goes wrong in Istio, one of the first things to check is whether all the Envoy proxies have received the correct configuration from the Istio control plane (istiod). A proxy that is out of sync with the control plane will behave based on stale or missing configuration, which leads to all sorts of confusing problems. The `istioctl proxy-status` command is your tool for checking this.

## What proxy-status Shows You

The `istioctl proxy-status` command (also available as `istioctl ps` for short) contacts the Istio control plane and asks it about the synchronization state of every proxy in the mesh. It compares what istiod has sent to each proxy against what the proxy has acknowledged receiving.

Run it:

```bash
istioctl proxy-status
```

The output looks like:

```text
NAME                                          CLUSTER        CDS        LDS        EDS        RDS        ECDS       ISTIOD
httpbin-74fb669cc6-5wq2r.default              Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED     NOT SENT   istiod-7d4f5b7c4f-x2q9p
productpage-v1-6b746f74dc-9rlmh.bookinfo     Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED     NOT SENT   istiod-7d4f5b7c4f-x2q9p
reviews-v1-5984b4b776-7kqvz.bookinfo         Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED     NOT SENT   istiod-7d4f5b7c4f-x2q9p
```

## Understanding the Columns

Each column represents a different type of Envoy configuration (called xDS in Envoy terminology):

**CDS (Cluster Discovery Service)**: Defines the upstream clusters (services) that Envoy knows about. Each Kubernetes service becomes a cluster in Envoy's configuration.

**LDS (Listener Discovery Service)**: Defines the network listeners on the proxy. These determine what ports and protocols the proxy accepts traffic on.

**EDS (Endpoint Discovery Service)**: Provides the actual IP addresses and ports of the pods backing each service. This is how Envoy knows where to send traffic.

**RDS (Route Discovery Service)**: Defines HTTP routing rules. VirtualService configurations end up here.

**ECDS (Extension Config Discovery Service)**: Used for Wasm plugins and other extensions. "NOT SENT" is normal if you are not using these features.

**ISTIOD**: Shows which istiod instance this proxy is connected to. In a multi-replica istiod setup, proxies connect to different instances.

## Status Values

The status for each xDS type can be one of:

- **SYNCED**: The proxy has the latest configuration. Everything is good.
- **NOT SENT**: The control plane has not sent this config type to the proxy. This is normal for ECDS unless you are using extensions.
- **STALE**: The proxy has not acknowledged the latest configuration. This means config is being pushed but the proxy has not confirmed it yet. If this persists for more than a few seconds, there is a problem.

## Diagnosing Common Issues

### Problem: A Proxy Shows STALE

If a proxy shows STALE for any xDS type, it means istiod pushed a configuration update but the proxy did not acknowledge it:

```text
NAME                                      CDS        LDS        EDS        RDS
httpbin-74fb669cc6-5wq2r.default          STALE      SYNCED     SYNCED     SYNCED
```

Common causes:
1. The proxy is overloaded and cannot process configuration fast enough
2. There is a network issue between the proxy and istiod
3. The configuration is too large and is hitting gRPC message size limits
4. The proxy is crashing and restarting

Check the proxy logs:

```bash
kubectl logs httpbin-74fb669cc6-5wq2r -c istio-proxy -n default --tail=50
```

Look for errors related to configuration processing.

### Problem: A Proxy Is Missing

If a pod that should have a sidecar does not appear in `proxy-status`, the sidecar was not injected:

```bash
# Check if the namespace has injection enabled
kubectl get namespace default --show-labels | grep istio-injection

# Check if the pod has the sidecar container
kubectl get pod httpbin-74fb669cc6-5wq2r -n default -o jsonpath='{.spec.containers[*].name}'
```

If the sidecar is there but not showing up, it might not be connecting to istiod. Check connectivity:

```bash
kubectl exec httpbin-74fb669cc6-5wq2r -c istio-proxy -n default -- \
  curl -s localhost:15000/clusters | head -5
```

### Problem: Proxy Connected to Wrong istiod

In multi-cluster or multi-revision setups, a proxy might connect to the wrong istiod instance:

```text
NAME                                      ISTIOD
httpbin-74fb669cc6-5wq2r.default          istiod-canary-abc123
reviews-v1-5984b.bookinfo                 istiod-7d4f5b7c4f-x2q9p
```

This happens when you have multiple Istio revisions installed. Check which revision the namespace is labeled with:

```bash
kubectl get namespace default --show-labels | grep istio.io/rev
```

## Checking Specific Proxy Status

Get detailed status for a single proxy:

```bash
istioctl proxy-status httpbin-74fb669cc6-5wq2r.default
```

This shows the configuration diff between what istiod wants to send and what the proxy currently has. It is very useful for debugging config sync issues.

## Using proxy-status in Scripts

You can use proxy-status in monitoring scripts to detect sync issues:

```bash
#!/bin/bash
# Check for any STALE proxies
STALE_COUNT=$(istioctl proxy-status 2>/dev/null | grep -c "STALE")

if [ "$STALE_COUNT" -gt 0 ]; then
  echo "WARNING: $STALE_COUNT proxies are STALE"
  istioctl proxy-status | grep "STALE"
  exit 1
else
  echo "OK: All proxies are SYNCED"
fi
```

## Comparing Proxy Configuration

When two proxies should have the same configuration but are behaving differently, compare their status:

```bash
istioctl proxy-status productpage-v1-abc.bookinfo
istioctl proxy-status productpage-v1-def.bookinfo
```

If one is SYNCED and the other is STALE, you have found your problem. The stale proxy is working with old configuration.

## Filtering Output

For large meshes with hundreds of proxies, filter the output:

```bash
# Show only proxies in a specific namespace
istioctl proxy-status | grep "\.bookinfo"

# Show only unhealthy proxies
istioctl proxy-status | grep -v "SYNCED.*SYNCED.*SYNCED.*SYNCED"

# Count proxies per istiod instance
istioctl proxy-status | awk '{print $NF}' | sort | uniq -c
```

## Performance Considerations

In very large meshes (1000+ proxies), `proxy-status` can take a while because it queries the control plane for every proxy's state. If you just need to check a specific proxy, use:

```bash
istioctl proxy-status <pod-name>.<namespace>
```

This is much faster because it only queries the state of one proxy.

## When to Use proxy-status

Run `proxy-status` when:
- You just applied a VirtualService or DestinationRule and it does not seem to take effect
- Traffic is routing to unexpected destinations
- You deployed new pods and they are not getting mesh traffic
- After upgrading Istio to verify all proxies picked up the new configuration
- As a regular health check in monitoring dashboards

The `istioctl proxy-status` command is the starting point for almost any Istio debugging session. It tells you whether the configuration pipeline from istiod to Envoy is working correctly, which is the foundation everything else depends on. If proxies are not in sync, nothing else matters until you fix that.
