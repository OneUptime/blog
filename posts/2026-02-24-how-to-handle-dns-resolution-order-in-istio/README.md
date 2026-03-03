# How to Handle DNS Resolution Order in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Service Discovery, Kubernetes, Envoy

Description: Understanding and configuring DNS resolution order in Istio to handle service discovery correctly across namespaces and external services.

---

DNS resolution in Istio adds a layer on top of Kubernetes' standard DNS behavior. When your application resolves a hostname, the request goes through Kubernetes DNS (CoreDNS), but the actual routing decision is made by Envoy based on Istio's service registry. This dual nature can lead to confusion, especially when you're dealing with short names, cross-namespace services, external services, and headless services.

Getting DNS resolution order right is important because a wrong resolution can mean traffic goes to the wrong place, bypasses the mesh, or fails entirely.

## How DNS Works in Istio

When your application calls `http://reviews:9080`, here's what happens:

1. The application asks the OS resolver for the IP of `reviews`
2. The OS resolver queries CoreDNS (configured via `/etc/resolv.conf`)
3. CoreDNS resolves `reviews.default.svc.cluster.local` to the ClusterIP (say, `10.96.45.12`)
4. The application connects to `10.96.45.12:9080`
5. iptables intercepts the connection and redirects to Envoy
6. Envoy looks at the original destination (`10.96.45.12:9080`) and matches it to a known service in its configuration
7. Envoy resolves the actual endpoint (pod IP) using its service registry and forwards the traffic

The key insight: DNS gives your application the ClusterIP, but Envoy ignores that and uses its own endpoint list for actual routing. The ClusterIP is just a trigger that helps Envoy identify which service you're talking to.

## The Search Domain Order

Kubernetes sets up DNS search domains in `/etc/resolv.conf`:

```bash
kubectl exec my-pod -- cat /etc/resolv.conf
```

Output:

```text
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

When your app resolves `reviews`, the resolver tries these in order:
1. `reviews.default.svc.cluster.local`
2. `reviews.svc.cluster.local`
3. `reviews.cluster.local`
4. `reviews` (as a bare name)

The `ndots:5` option means any name with fewer than 5 dots gets the search domains appended. This is why `reviews` triggers the search list, but `api.example.com` (3 dots) also triggers it, which can cause unnecessary DNS queries.

## Optimizing ndots

The default `ndots:5` causes extra DNS lookups for external hostnames. Every call to `api.example.com` triggers 4 failed lookups before the actual resolution succeeds. For services that call many external APIs, this adds latency.

You can reduce `ndots` on your pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      dnsConfig:
        options:
          - name: ndots
            value: "2"
      containers:
        - name: my-app
          image: my-app:latest
```

With `ndots:2`, a name like `api.example.com` (which has 2 dots) resolves directly without trying the search domains first. Internal short names like `reviews` (0 dots) still go through the search list.

## Istio DNS Proxy

Istio includes an optional DNS proxy that runs inside the sidecar. When enabled, DNS queries from the application go to Envoy first, which can resolve them using Istio's service registry without hitting CoreDNS:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

Or enable it per-pod:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

When DNS capture is enabled:

1. iptables redirects DNS (UDP port 53) traffic to Envoy
2. Envoy checks its local service registry first
3. If the hostname is a known mesh service, Envoy returns the ClusterIP directly
4. If not, Envoy forwards the query to the upstream DNS server (CoreDNS)

The `DNS_AUTO_ALLOCATE` option assigns virtual IPs to ServiceEntry hosts that don't have one. This is useful for external services that need to be routed through the mesh.

## Handling Cross-Namespace Resolution

When service `A` in namespace `alpha` calls service `B` in namespace `beta`, it can use:

```text
http://service-b.beta:8080
http://service-b.beta.svc:8080
http://service-b.beta.svc.cluster.local:8080
```

All three resolve correctly through DNS. But in Istio, the Sidecar resource can limit which services are visible to a given namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: alpha
spec:
  egress:
    - hosts:
        - "./*"
        - "beta/*"
        - "istio-system/*"
```

This limits namespace `alpha` to only see services in its own namespace, the `beta` namespace, and `istio-system`. DNS resolution might succeed for a service in namespace `gamma`, but Envoy won't have a route for it and the request will fail.

## ServiceEntry DNS Resolution

For external services, you create ServiceEntry resources. The `resolution` field controls how Envoy resolves the endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Resolution options:

- **DNS** - Envoy resolves the hostname at connection time and caches the result. The DNS TTL is respected.
- **STATIC** - You provide explicit IP addresses in the `endpoints` field. No DNS resolution.
- **NONE** - The caller provides the IP. Used for wildcard hosts.

```yaml
# STATIC resolution with explicit endpoints
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-db
spec:
  hosts:
    - db.internal.example.com
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 10.0.5.100
    - address: 10.0.5.101
```

## DNS Resolution for Headless Services

Headless services (ClusterIP: None) don't have a virtual IP. DNS resolves directly to pod IPs. Istio handles this differently from regular services:

```bash
# DNS for a regular service returns the ClusterIP
nslookup reviews.default.svc.cluster.local
# Returns: 10.96.45.12

# DNS for a headless service returns pod IPs
nslookup reviews-headless.default.svc.cluster.local
# Returns: 10.244.1.15, 10.244.2.23, 10.244.3.8
```

Envoy creates individual endpoints for each pod of a headless service. When your app resolves the headless service name, it gets a pod IP directly, and Envoy matches that to the specific endpoint.

## Debugging DNS Issues

When DNS resolution isn't working as expected:

```bash
# Check what DNS returns inside the pod
kubectl exec my-pod -c istio-proxy -- dig +short reviews.default.svc.cluster.local

# Check if Istio DNS proxy is capturing DNS
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep dns

# Look at the resolv.conf
kubectl exec my-pod -- cat /etc/resolv.conf

# Check if Envoy knows about the service
istioctl proxy-config cluster my-pod | grep reviews

# Check endpoints
istioctl proxy-config endpoint my-pod --cluster "outbound|9080||reviews.default.svc.cluster.local"
```

A common issue is when DNS resolves correctly but Envoy doesn't have a matching cluster. This happens when the Sidecar resource limits the egress scope, or when the service exists in a namespace that the proxy isn't configured to watch.

## DNS and the Outbound Traffic Policy

When `outboundTrafficPolicy` is `REGISTRY_ONLY`, DNS resolution might succeed (CoreDNS knows about the service) but Envoy blocks the traffic because it's not in the mesh registry. This causes confusing errors - the hostname resolves fine, but connections fail.

```bash
# This might resolve but the connection gets a 502
kubectl exec my-pod -- curl http://unknown-service:8080
```

Always check both DNS resolution and Envoy's cluster configuration when debugging connectivity issues. DNS is only half the story in Istio.
