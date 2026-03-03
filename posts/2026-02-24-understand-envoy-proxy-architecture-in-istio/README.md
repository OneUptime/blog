# How to Understand Envoy Proxy Architecture in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Proxy, Architecture, Kubernetes, Service Mesh

Description: A detailed look at how Envoy proxy works inside Istio, including its threading model, filter chains, and configuration flow.

---

Envoy is the data plane of Istio. Every feature Istio provides - traffic routing, load balancing, mTLS, observability - is implemented by Envoy. Understanding how Envoy works inside Istio makes you much more effective at debugging issues, tuning performance, and understanding why things behave the way they do.

## The Big Picture

When Istio injects a sidecar into your pod, it adds two things: the Envoy proxy container (called istio-proxy) and an init container (istio-init) that sets up iptables rules. These iptables rules redirect all inbound and outbound traffic through Envoy. Your application never talks directly to the network - every connection passes through Envoy.

```text
[App Container] <-> [Envoy Proxy] <-> [Network] <-> [Envoy Proxy] <-> [App Container]
     Pod A                                                                  Pod B
```

## Configuration Flow

Envoy does not know about Istio concepts like VirtualServices or DestinationRules. istiod translates those high-level Istio resources into Envoy's native configuration language and pushes it to each sidecar using the xDS protocol.

The xDS (discovery service) APIs include:

- **LDS (Listener Discovery Service)** - Defines what ports Envoy listens on and what filter chains to apply
- **RDS (Route Discovery Service)** - Defines HTTP routing rules (from VirtualService resources)
- **CDS (Cluster Discovery Service)** - Defines upstream clusters (backend service endpoints)
- **EDS (Endpoint Discovery Service)** - Provides the actual IP addresses of backend pods
- **SDS (Secret Discovery Service)** - Delivers TLS certificates for mTLS

When you create a VirtualService, istiod converts it into Envoy route configuration and pushes it via RDS. When pods come and go, istiod updates the endpoint list via EDS. This all happens dynamically without restarting Envoy.

Check the configuration that istiod has pushed to a sidecar:

```bash
# See all listeners
istioctl proxy-config listeners <pod-name>

# See all routes
istioctl proxy-config routes <pod-name>

# See all clusters (upstream services)
istioctl proxy-config clusters <pod-name>

# See all endpoints
istioctl proxy-config endpoints <pod-name>

# See TLS secrets
istioctl proxy-config secret <pod-name>
```

## Listeners and Filter Chains

Envoy uses listeners to accept incoming connections. In an Istio sidecar, there are two main types of listeners:

**Virtual listeners** - One for each port that services in the mesh listen on. For example, if a service listens on port 8080, there will be a listener on `0.0.0.0:8080` that handles outbound traffic to that port.

**The virtualInbound listener** - A single listener on port 15006 that handles all inbound traffic to the pod.

Each listener has a filter chain. The filter chain is a series of network filters that process each connection. For HTTP traffic, it typically looks like:

```text
Connection -> TLS Inspector -> HTTP Connection Manager -> HTTP Filters -> Router
```

The HTTP filters include:

1. **envoy.filters.http.jwt_authn** - JWT validation
2. **envoy.filters.http.rbac** - Authorization (from AuthorizationPolicy)
3. **istio.metadata_exchange** - Propagates service metadata
4. **envoy.filters.http.fault** - Fault injection (from VirtualService fault rules)
5. **envoy.filters.http.cors** - CORS handling
6. **istio.stats** - Generates Istio metrics
7. **envoy.filters.http.router** - Routes requests to upstream clusters

You can see the exact filter chain:

```bash
istioctl proxy-config listeners <pod-name> -o json | jq '.[0].filterChains[0].filters'
```

## Clusters and Load Balancing

In Envoy terminology, a "cluster" is a group of upstream hosts that Envoy can send traffic to. For each Kubernetes Service in the mesh, Envoy has one or more clusters. With subsets (from DestinationRules), you get additional clusters:

```bash
istioctl proxy-config clusters <pod-name> --fqdn my-service.default.svc.cluster.local
```

Output might show:

```text
SERVICE FQDN                              PORT  SUBSET  DIRECTION  TYPE
my-service.default.svc.cluster.local      8080  -       outbound   EDS
my-service.default.svc.cluster.local      8080  v1      outbound   EDS
my-service.default.svc.cluster.local      8080  v2      outbound   EDS
```

Each cluster has endpoints (actual pod IPs). Envoy uses the configured load balancing algorithm (round robin, least request, etc.) to distribute traffic across endpoints.

## The Threading Model

Envoy uses a multi-threaded architecture with a main thread and worker threads:

- **Main thread** - Handles configuration updates, stats flushing, and admin interface
- **Worker threads** - Handle actual request processing

Each worker thread runs its own event loop and processes connections independently. By default, Istio configures Envoy with 2 worker threads. You can adjust this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 4
```

Or per-pod:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 4
```

Setting concurrency to 0 means Envoy uses as many threads as there are CPU cores available to the container.

## Connection Handling

When an outbound request leaves your application:

1. iptables redirects it to Envoy on port 15001 (outbound)
2. Envoy's outbound listener matches the destination address and port
3. The matched filter chain processes the request
4. The HTTP router filter looks up the route configuration
5. The route matches the request to an upstream cluster
6. Envoy picks an endpoint from the cluster using the load balancer
7. If mTLS is enabled, Envoy establishes a TLS connection to the upstream Envoy
8. The request is forwarded

For inbound traffic:

1. iptables redirects the connection to port 15006 (inbound)
2. The virtualInbound listener matches the original destination port
3. TLS is terminated (for mTLS connections)
4. The filter chain processes the request (RBAC, stats, etc.)
5. The request is forwarded to the application on localhost

## Connection Pools

Envoy maintains connection pools to upstream services. This is configured through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
        maxRetries: 3
```

You can see active connection pool stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep cx_active
```

## The Admin Interface

Every Envoy sidecar runs an admin interface on port 15000. It exposes configuration, stats, and debugging tools:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/help
```

Key admin endpoints:

- `/config_dump` - Full Envoy configuration
- `/stats` - All statistics
- `/clusters` - Cluster and endpoint status
- `/listeners` - Active listeners
- `/ready` - Readiness status

## Pilot Agent (istio-proxy entrypoint)

The istio-proxy container does not run Envoy directly. It runs `pilot-agent`, which is an Istio component that:

- Starts and manages the Envoy process
- Generates the Envoy bootstrap configuration
- Handles certificate rotation through SDS
- Provides health check endpoints
- Manages graceful shutdown

Understanding Envoy's architecture helps demystify a lot of Istio behavior. When traffic is not routing correctly, you can check the listeners and routes. When you see connection errors, you can look at cluster endpoints. When performance is an issue, you can examine the threading and connection pool configuration. The istioctl proxy-config commands are your best friends for this kind of debugging.
