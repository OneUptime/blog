# How to Understand Envoy Sidecar Proxy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Sidecar Proxy, Kubernetes, Service Mesh

Description: A practical explanation of Envoy sidecar proxy in Istio, covering how it works, what it does, and how to inspect and debug it in your Kubernetes cluster.

---

Envoy is the engine that makes Istio work. Every feature you use in Istio - traffic routing, mTLS, observability, retries - is actually implemented by Envoy. Istio's control plane just tells Envoy what to do. If you want to really understand Istio, you need to understand Envoy.

## What Is Envoy?

Envoy is a high-performance proxy written in C++ that was originally built at Lyft. It is designed to be a universal data plane for service mesh architectures. Istio chose Envoy as its sidecar proxy because of its extensibility, performance, and rich feature set.

In Istio, Envoy runs as a sidecar container called `istio-proxy` in every pod. It intercepts all inbound and outbound network traffic for the application container in the same pod.

```bash
# Look at the Envoy version running in your mesh
kubectl exec deploy/my-app -c istio-proxy -- envoy --version
```

## How Envoy Gets Its Configuration

Unlike a traditional proxy where you write a static config file, Envoy in Istio gets its configuration dynamically from the control plane. The process works like this:

1. Envoy starts with a minimal bootstrap configuration
2. The bootstrap config tells Envoy where to find the control plane (istiod)
3. Envoy connects to istiod using the xDS (discovery service) API
4. Istiod sends the full mesh configuration to Envoy
5. Whenever configuration changes, istiod pushes updates in real time

You can see the bootstrap configuration:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
    cat /etc/istio/proxy/envoy-rev.json | python3 -m json.tool | head -50
```

And the dynamically received configuration:

```bash
# Full Envoy config dump
istioctl proxy-config all deploy/my-app -n default -o json
```

## Envoy's Internal Architecture

Envoy processes requests through a pipeline of components:

### Listeners

Listeners are network sockets where Envoy accepts connections. In Istio, each sidecar has several important listeners:

```bash
istioctl proxy-config listeners deploy/my-app -n default
```

Key listeners:
- **0.0.0.0:15001** - Outbound catch-all listener. All outgoing traffic redirected by iptables lands here.
- **0.0.0.0:15006** - Inbound catch-all listener. All incoming traffic lands here.
- **Service-specific listeners** - One for each service in the mesh (e.g., 10.96.10.20:8080 for service-b)

### Filter Chains

Each listener has one or more filter chains that process the request. Filters are plugins that perform specific functions:

- **HTTP Connection Manager** - Parses HTTP protocol
- **Router** - Makes routing decisions based on VirtualService config
- **RBAC** - Enforces authorization policies
- **Fault** - Injects faults for testing
- **Stats** - Collects metrics

### Routes

Routes map incoming requests to upstream clusters based on matching rules:

```bash
istioctl proxy-config routes deploy/my-app -n default
```

This shows the routing table that Envoy uses to decide where to send requests. The routes are generated from your VirtualService definitions.

### Clusters

Clusters represent upstream services that Envoy can send traffic to:

```bash
istioctl proxy-config clusters deploy/my-app -n default
```

Each Kubernetes Service becomes an Envoy cluster. The cluster configuration includes load balancing policy, circuit breaker settings, and TLS context.

### Endpoints

Endpoints are the actual pod IP addresses within each cluster:

```bash
istioctl proxy-config endpoints deploy/my-app -n default \
    --cluster "outbound|8080||service-b.default.svc.cluster.local"
```

## Debugging Envoy

When requests are not routing correctly, Envoy's admin interface is your best friend. It is available on port 15000 of the istio-proxy container:

```bash
# Open the admin interface
kubectl port-forward deploy/my-app 15000:15000

# Then in another terminal
curl localhost:15000/help
```

Useful admin endpoints:

```bash
# Check server info
curl localhost:15000/server_info

# View runtime stats
curl localhost:15000/stats

# View Envoy clusters and their health
curl localhost:15000/clusters

# View active configuration
curl localhost:15000/config_dump

# View active connections
curl localhost:15000/connections

# Check readiness
curl localhost:15000/ready
```

## Envoy Logging

Envoy has granular logging that you can enable per-component:

```bash
# Set logging level for a specific component
kubectl exec deploy/my-app -c istio-proxy -- \
    curl -X POST "localhost:15000/logging?connection=debug"

# Set all logging to debug (warning: very verbose)
kubectl exec deploy/my-app -c istio-proxy -- \
    curl -X POST "localhost:15000/logging?level=debug"

# Check current logging levels
kubectl exec deploy/my-app -c istio-proxy -- \
    curl localhost:15000/logging
```

For access logs, check the istio-proxy container logs:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=20
```

A typical access log entry looks like:

```
[2024-01-15T10:30:45.123Z] "GET /api/data HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.68.0" "abc-123-def" "service-b:8080" "10.244.1.5:8080" outbound|8080||service-b.default.svc.cluster.local 10.244.2.3:45678 10.96.10.20:8080 10.244.2.3:55555 - default
```

The fields include: timestamp, method, path, protocol, response code, upstream cluster, latency, and more.

## Envoy Metrics

Each sidecar exposes Prometheus metrics on port 15020:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
    curl -s localhost:15020/stats/prometheus | head -30
```

Key metrics to watch:

```
# Total requests by destination and response code
istio_requests_total{destination_service="service-b.default.svc.cluster.local",response_code="200"}

# Request duration histogram
istio_request_duration_milliseconds_bucket{...}

# Active connections
envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||service-b.default.svc.cluster.local"}

# Connection pool overflow
envoy_cluster_upstream_cx_overflow{...}
```

## Envoy Certificates

Each Envoy sidecar holds certificates for mTLS:

```bash
istioctl proxy-config secret deploy/my-app -n default
```

This shows:
- **default** - The workload certificate used for mTLS
- **ROOTCA** - The root CA certificate for validating peer certificates

You can inspect the certificate details:

```bash
istioctl proxy-config secret deploy/my-app -n default -o json | \
    jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
    base64 -d | openssl x509 -text -noout
```

This will show you the SPIFFE identity, validity period, and issuer of the workload certificate.

## Resource Consumption

Each Envoy sidecar consumes resources. The defaults in Istio are:

```yaml
resources:
  requests:
    cpu: 10m
    memory: 40Mi
  limits:
    cpu: 2000m
    memory: 1Gi
```

For production, tune these based on your traffic patterns. A sidecar handling 1000 RPS might use 50-100m CPU and 60-80 MB memory.

Monitor sidecar resource usage:

```bash
kubectl top pods -n default --containers | grep istio-proxy
```

## Envoy Filters

If you need to customize Envoy behavior beyond what Istio's APIs offer, you can use the EnvoyFilter resource:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inlineCode: |
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-custom-header", "added-by-envoy")
            end
```

Use EnvoyFilter sparingly, as it couples your configuration to specific Envoy internals and can break during Istio upgrades.

Envoy is the foundation of everything Istio does. When you configure a VirtualService, you are really configuring Envoy routes. When you enable mTLS, you are configuring Envoy TLS contexts. Knowing how to inspect and debug Envoy directly will save you hours of troubleshooting when things go sideways in your mesh.
