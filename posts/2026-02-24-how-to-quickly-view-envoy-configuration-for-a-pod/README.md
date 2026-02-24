# How to Quickly View Envoy Configuration for a Pod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Kubernetes, Debugging, Service Mesh, Proxy

Description: How to inspect and understand the Envoy proxy configuration for any pod in your Istio service mesh using istioctl and direct API calls.

---

Every pod in an Istio mesh has an Envoy sidecar proxy that handles all inbound and outbound traffic. The configuration of that proxy is generated dynamically by istiod based on your Istio resources (VirtualServices, DestinationRules, etc.) and the Kubernetes service registry. When traffic is not behaving as expected, looking at the actual Envoy configuration is often the fastest way to figure out what is going on.

Here are the practical ways to inspect Envoy configuration for any pod.

## Using istioctl proxy-config

The `istioctl proxy-config` command (often shortened to `pc`) is your primary tool. It queries the Envoy configuration through the control plane and presents it in a readable format.

### View Listeners

Listeners define what ports and protocols the proxy is listening on:

```bash
istioctl proxy-config listeners deploy/my-app -n default
```

Output looks like:

```
ADDRESSES     PORT  MATCH                        DESTINATION
10.96.0.1     443   Trans: raw_buffer; App: http  Cluster: outbound|443||kubernetes.default.svc.cluster.local
0.0.0.0       80    Trans: raw_buffer; App: http  Route: 80
0.0.0.0       15001 ALL                           PassthroughCluster
0.0.0.0       15006 Trans: tls; App: istio-http   InboundPassthroughCluster
0.0.0.0       15090 ALL                           Inline Route: /stats/prometheus*
```

Port 15001 is the outbound listener (all outgoing traffic goes through here), and 15006 is the inbound listener (incoming traffic from other services).

### View Routes

Routes show how requests are matched and forwarded:

```bash
istioctl proxy-config routes deploy/my-app -n default
```

For a specific port:

```bash
istioctl proxy-config routes deploy/my-app -n default --port 80
```

This shows the route table for port 80, including any VirtualService rules that apply.

### View Clusters

Clusters represent the backend services that Envoy can send traffic to:

```bash
istioctl proxy-config clusters deploy/my-app -n default
```

This lists every service endpoint the proxy knows about, including the load balancing policy and circuit breaking settings:

```
SERVICE FQDN                           PORT   SUBSET   DIRECTION   TYPE
api-server.backend.svc.cluster.local   8080   -        outbound    EDS
frontend.default.svc.cluster.local     80     -        outbound    EDS
kubernetes.default.svc.cluster.local   443    -        outbound    EDS
```

### View Endpoints

Endpoints show the actual pod IPs behind each cluster:

```bash
istioctl proxy-config endpoints deploy/my-app -n default
```

Filter for a specific service:

```bash
istioctl proxy-config endpoints deploy/my-app -n default \
  --cluster "outbound|8080||api-server.backend.svc.cluster.local"
```

This shows individual pod IPs and their health status:

```
ENDPOINT            STATUS   OUTLIER CHECK   CLUSTER
10.244.1.15:8080    HEALTHY  OK              outbound|8080||api-server.backend.svc.cluster.local
10.244.2.22:8080    HEALTHY  OK              outbound|8080||api-server.backend.svc.cluster.local
```

## Getting Full JSON Configuration

For detailed analysis, dump the full configuration in JSON:

```bash
istioctl proxy-config all deploy/my-app -n default -o json > envoy-config.json
```

This file can be large (thousands of lines), but it contains everything. You can search through it for specific hosts, routes, or settings.

To get JSON output for a specific section:

```bash
istioctl proxy-config routes deploy/my-app -n default -o json
```

## Direct Envoy Admin API

Every Envoy sidecar exposes an admin interface on port 15000. You can access it directly for even more detailed information:

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/config_dump
```

This returns the complete Envoy configuration dump. It is a lot of data, but you can filter it:

```bash
# Get just the dynamic route configuration
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/config_dump?resource=dynamic_route_configs

# Get listener configuration
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/config_dump?resource=dynamic_listeners
```

Other useful admin endpoints:

```bash
# View all clusters and their status
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/clusters

# View server info (Envoy version, uptime, etc.)
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/server_info

# View current stats
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats

# View hot restart info
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/hot_restart_version
```

## Comparing Configuration Between Pods

Sometimes you need to compare the Envoy configuration of two pods to understand why they behave differently. Dump both and diff them:

```bash
istioctl proxy-config routes deploy/my-app-v1 -n default -o json > routes-v1.json
istioctl proxy-config routes deploy/my-app-v2 -n default -o json > routes-v2.json
diff routes-v1.json routes-v2.json
```

## Checking if a VirtualService Is Applied

If you created a VirtualService but traffic is not routing correctly, verify it shows up in the proxy configuration:

```bash
istioctl proxy-config routes deploy/my-app -n default -o json | \
  python3 -c "import sys,json; [print(json.dumps(r,indent=2)) for r in json.load(sys.stdin) if 'my-service' in json.dumps(r)]"
```

Or more simply:

```bash
istioctl proxy-config routes deploy/my-app -n default -o json | grep -A20 "my-service"
```

If your VirtualService is not appearing in the routes, the proxy might not have synced yet. Check sync status:

```bash
istioctl proxy-status
```

## Viewing Bootstrap Configuration

The bootstrap configuration is set when the sidecar starts and does not change during the pod's lifetime:

```bash
istioctl proxy-config bootstrap deploy/my-app -n default -o json
```

This shows tracing configuration, stats settings, admin interface settings, and other startup parameters.

## Reading Envoy Stats

Envoy stats tell you what the proxy is actually doing at runtime:

```bash
# Overall request stats
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep http

# Specific upstream cluster stats
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "cluster.outbound|8080||api-server"

# Connection pool stats
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep cx_active
```

Key stats to watch:

- `upstream_cx_active`: Active connections to upstream services
- `upstream_rq_active`: Active requests in flight
- `upstream_rq_total`: Total requests sent
- `upstream_rq_5xx`: 5xx responses from upstream
- `membership_total`: Number of endpoints in a cluster

## Using the Envoy Admin Dashboard

For a visual view, you can port-forward the admin interface:

```bash
kubectl port-forward deploy/my-app -n default 15000:15000
```

Then open `http://localhost:15000` in your browser. This gives you a dashboard with links to all the admin endpoints, including config dump, stats, clusters, and more.

## Summary

The Envoy configuration is the source of truth for how traffic actually flows through your mesh. When your VirtualService or DestinationRule is not doing what you expect, checking the proxy configuration is the best way to understand what is really happening. Start with `istioctl proxy-config` for a high-level view, then drill into the JSON output or the Envoy admin API for details.
