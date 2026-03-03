# How to Debug Istiod with istioctl proxy-status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, istioctl, Debugging, Kubernetes, Service Mesh

Description: A hands-on guide to using istioctl proxy-status to check the synchronization state between Istiod and Envoy sidecars in your Istio mesh.

---

Istiod is the brain of your Istio mesh. It takes your high-level configuration (VirtualServices, DestinationRules, Gateways) and translates it into Envoy proxy configuration that gets pushed to every sidecar. When this translation or distribution breaks down, traffic stops working correctly. The `istioctl proxy-status` command is your primary tool for checking if Istiod and your sidecars are on the same page.

## What proxy-status Actually Shows

When you run `istioctl proxy-status` (or the shorthand `istioctl ps`), it queries Istiod's debug endpoints and shows you the synchronization state for every connected proxy:

```bash
istioctl proxy-status
```

The output looks like this:

```text
NAME                                  CLUSTER        CDS     LDS     EDS     RDS     ECDS    ISTIOD
httpbin-74fb669cc6-abc12.default      Kubernetes     SYNCED  SYNCED  SYNCED  SYNCED  -       istiod-5d4f4f46d4-xyz89
productpage-v1-6b746f74dc-def34.default  Kubernetes  SYNCED  SYNCED  SYNCED  SYNCED  -       istiod-5d4f4f46d4-xyz89
reviews-v1-545db77b95-ghi56.default   Kubernetes     SYNCED  SYNCED  SYNCED  SYNCED  -       istiod-5d4f4f46d4-xyz89
```

Each column corresponds to an xDS API type:

- **CDS** (Cluster Discovery Service) - Information about upstream clusters (services)
- **LDS** (Listener Discovery Service) - Listener configuration (ports, protocols)
- **EDS** (Endpoint Discovery Service) - IP addresses and ports of service instances
- **RDS** (Route Discovery Service) - Routing rules for HTTP traffic
- **ECDS** (Extension Config Discovery Service) - Wasm plugin and extension configs
- **ISTIOD** - Which Istiod instance this proxy is connected to

## Understanding Sync States

There are three states you'll see:

**SYNCED** means the proxy acknowledged the latest config version that Istiod sent. Everything is working as expected.

**STALE** means Istiod pushed an update, but the proxy hasn't acknowledged it yet. This is a problem. It could mean the proxy is overloaded, there's a network issue between the proxy and Istiod, or the proxy is stuck processing the previous config.

**NOT SENT** means Istiod hasn't sent any configuration of that type to the proxy. This is normal for ECDS if you're not using Wasm extensions. It's a problem for CDS, LDS, EDS, or RDS.

## Diagnosing STALE Proxies

If you spot a STALE proxy, here's how to dig deeper.

First, check how long it's been stale. Run proxy-status again after 30 seconds. If it's still stale, there's likely a real issue.

Next, check the sidecar proxy logs for errors:

```bash
kubectl logs httpbin-74fb669cc6-abc12 -c istio-proxy -n default --tail=50
```

Look for connection errors to Istiod, xDS stream disconnections, or NACK messages (which mean the proxy rejected the config).

Check if the Istiod pod itself is healthy:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl logs -n istio-system deployment/istiod --tail=100
```

Common causes of STALE proxies include:

- **High memory pressure on the sidecar.** If the proxy doesn't have enough memory to process a large config update, it can get stuck. Check resource limits on the istio-proxy container.
- **Network policies blocking traffic.** Sidecars connect to Istiod on port 15012 (xDS over gRPC). If a NetworkPolicy blocks this, configs can't sync.
- **Too many services in the mesh.** Large meshes with thousands of services generate huge Envoy configs. Sidecar resources (the Istio Sidecar CRD, not the proxy container) can help limit what each proxy receives.

## Checking a Specific Proxy in Detail

You can target a single proxy to see exactly what's different between what Istiod intended and what the proxy has:

```bash
istioctl proxy-status httpbin-74fb669cc6-abc12.default
```

When there's a mismatch, this shows a diff of the configuration. This is incredibly useful because it tells you exactly which part of the config is out of sync.

The output uses the standard diff format, with lines prefixed by `+` showing what Istiod wants to send and `-` showing what the proxy currently has.

## Filtering by Namespace or Revision

In a large mesh, the default output of proxy-status can be overwhelming. Filter by namespace:

```bash
istioctl proxy-status | grep "\.production"
```

If you're running canary upgrades with revisions:

```bash
istioctl proxy-status --revision canary
```

This only shows proxies connected to the Istiod instance with that revision label. It's essential when you're in the middle of a control plane upgrade and want to verify that proxies are migrating to the new version.

## Verifying After Configuration Changes

After applying a new VirtualService or DestinationRule, run proxy-status to confirm the change propagated:

```bash
kubectl apply -f my-virtualservice.yaml
sleep 5
istioctl proxy-status
```

All affected proxies should show SYNCED. If some are STALE, the new config hasn't reached them yet. In a healthy mesh, propagation takes seconds. If it's taking minutes, something is wrong with the control plane.

## Debugging Istiod Health Directly

When proxy-status shows widespread issues, the problem is likely with Istiod itself rather than individual proxies. Check Istiod's health:

```bash
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/syncz
```

The `syncz` endpoint returns the sync status from Istiod's perspective. It tells you how many proxies are connected and their sync state.

Other useful debug endpoints:

```bash
# List all connected proxies
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/connections

# Check push status
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/push_status

# See config distribution
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/config_distribution
```

## Monitoring Push Metrics

Istiod exposes Prometheus metrics about config pushes. These are great for setting up alerts:

```text
pilot_xds_pushes{type="cds"}       - Total CDS pushes
pilot_xds_pushes{type="lds"}       - Total LDS pushes
pilot_proxy_convergence_time       - Time for a config change to reach all proxies
pilot_xds_push_errors              - Number of failed pushes
pilot_xds_config_size_bytes        - Size of the config being pushed
```

If `pilot_xds_push_errors` is increasing, Istiod is failing to push configs to some proxies. If `pilot_proxy_convergence_time` is climbing, the mesh is getting slower at distributing changes.

Set up a Grafana dashboard or Prometheus alert for these metrics. They'll catch problems before users notice.

## Scaling Istiod for Large Meshes

If proxy-status consistently shows STALE proxies and Istiod metrics show high push latency, you might need to scale the control plane.

Horizontal scaling:

```bash
kubectl scale deployment istiod -n istio-system --replicas=3
```

Or increase resource limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "4"
            memory: 8Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
```

Also consider using Sidecar resources to limit the scope of configuration each proxy receives:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This tells proxies in the `production` namespace to only receive config for services in their own namespace and `istio-system`. It dramatically reduces the config size and push overhead.

## Practical Workflow

Here's the debugging workflow I follow when something goes wrong:

1. Run `istioctl proxy-status` to get an overview
2. If everything is SYNCED, the issue is in the config itself (use `istioctl analyze`)
3. If proxies are STALE, check Istiod logs and the specific proxy logs
4. If proxies are not showing up at all, check sidecar injection and network connectivity to Istiod
5. For persistent issues, check Istiod metrics and consider scaling

The proxy-status command is the first thing to run, every time. It takes two seconds and immediately tells you whether the problem is in the control plane or the data plane. That distinction saves hours of debugging.
