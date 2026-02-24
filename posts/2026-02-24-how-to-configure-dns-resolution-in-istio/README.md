# How to Configure DNS Resolution in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Service Mesh, Kubernetes, Networking

Description: A hands-on guide to configuring DNS resolution in Istio, covering DNS proxying, ServiceEntry resolution, and troubleshooting DNS-related issues.

---

DNS resolution in Istio has evolved quite a bit over the years. In earlier versions, Istio largely relied on Kubernetes DNS (CoreDNS) for all name resolution. Starting with Istio 1.8, the sidecar proxy gained its own DNS proxy capability, which solves several long-standing issues around accessing external services and handling multi-cluster setups.

Understanding how DNS works in your Istio mesh helps you troubleshoot connectivity problems and configure access to both internal and external services correctly.

## How DNS Works in an Istio Mesh

When a pod with an Istio sidecar makes a DNS query, the request can follow two paths depending on your configuration:

1. Traditional path: The DNS query goes to CoreDNS (or your cluster DNS), which resolves it normally.
2. Istio DNS proxy path: The sidecar's built-in DNS proxy intercepts the query, checks if it knows the answer from Istio's service registry, and either responds directly or forwards to the upstream DNS server.

The Istio DNS proxy is useful because it knows about ServiceEntries that CoreDNS has no idea about. If you define a ServiceEntry for an external service with a hostname, CoreDNS won't resolve it (unless you also add an ExternalName service). But Istio's DNS proxy can resolve it because it has access to the full Istio service registry.

## Enabling the DNS Proxy

The DNS proxy is enabled through the Istio mesh configuration. You can enable it globally or per-workload.

To enable globally, update your IstioOperator or Helm values:

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

With Helm:

```bash
helm upgrade istio-base istio/base -n istio-system

helm upgrade istiod istio/istiod -n istio-system \
  --set meshConfig.defaultConfig.proxyMetadata.ISTIO_META_DNS_CAPTURE="true" \
  --set meshConfig.defaultConfig.proxyMetadata.ISTIO_META_DNS_AUTO_ALLOCATE="true"
```

The two settings do different things:

- `ISTIO_META_DNS_CAPTURE` enables the DNS proxy in the sidecar. All DNS queries from the application are intercepted by the sidecar.
- `ISTIO_META_DNS_AUTO_ALLOCATE` automatically assigns virtual IPs to ServiceEntries that don't have addresses. This lets Envoy route TCP traffic to these services without needing NONE resolution.

You can also enable it per-workload using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ISTIO_META_DNS_CAPTURE: "true"
            ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

## ServiceEntry DNS Resolution Modes

When you create a ServiceEntry, the `resolution` field controls how the proxy resolves the destination addresses. This is where many people get confused.

### DNS Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

With `resolution: DNS`, the proxy performs a DNS lookup on the host to get IP addresses, then load balances across them. The proxy caches the DNS results and refreshes them based on the TTL.

### DNS_ROUND_ROBIN Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-db
  namespace: default
spec:
  hosts:
    - db.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS_ROUND_ROBIN
```

`DNS_ROUND_ROBIN` is similar to `DNS` but uses the DNS result directly for round-robin load balancing without health checking individual endpoints. This is useful when you trust the DNS provider to only return healthy endpoints.

### STATIC Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-service
  namespace: default
spec:
  hosts:
    - static.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.1.2.3
    - address: 10.1.2.4
```

With `STATIC` resolution, you provide the IP addresses directly. No DNS lookup happens.

### NONE Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: passthrough-service
  namespace: default
spec:
  hosts:
    - "*.external.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

`NONE` means the proxy uses the original destination IP that the application resolved. This is a passthrough mode - the proxy doesn't do its own resolution.

## Handling External Service DNS

One common scenario is accessing external services that the mesh doesn't know about. By default, Istio's outbound traffic policy determines what happens:

```yaml
meshConfig:
  outboundTrafficPolicy:
    mode: ALLOW_ANY  # or REGISTRY_ONLY
```

With `ALLOW_ANY`, traffic to unknown services passes through. With `REGISTRY_ONLY`, only services in Istio's registry (Kubernetes services + ServiceEntries) are accessible.

When using `REGISTRY_ONLY`, you need ServiceEntries for every external service. This is where the DNS proxy becomes valuable. Without it, creating a ServiceEntry for `api.external.com` wouldn't help if CoreDNS can resolve it but Istio doesn't have a VIP for it. With the DNS proxy and auto-allocate enabled, Istio assigns a virtual IP and handles the resolution.

## Wildcard DNS Entries

Sometimes you need to allow access to all subdomains of an external service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: wildcard-external
  namespace: default
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
```

For wildcard entries, `resolution: NONE` is typically the right choice because you can't DNS-resolve a wildcard. The proxy passes through whatever IP the application resolved.

## Debugging DNS Resolution Issues

Start by checking if the DNS proxy is active for your pod:

```bash
istioctl proxy-config bootstrap <pod-name> -n default | grep -i dns
```

Test DNS resolution from inside the pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET /dns_resolve?proxyID=my-pod.default
```

Check the Envoy clusters for your ServiceEntry:

```bash
istioctl proxy-config cluster <pod-name> -n default | grep external
```

Look at the listener configuration for outbound traffic:

```bash
istioctl proxy-config listener <pod-name> -n default --port 443
```

If DNS resolution seems to work from the pod but connections still fail, check if the traffic is being routed to the PassthroughCluster or the BlackHoleCluster:

```bash
istioctl proxy-config route <pod-name> -n default -o json | grep -A5 "blackhole\|passthrough"
```

## DNS Proxy and Multi-Cluster

In multi-cluster Istio setups, the DNS proxy is almost essential. Services in remote clusters aren't in your local CoreDNS. The Istio DNS proxy knows about services across all clusters in the mesh and can resolve them directly.

Without the DNS proxy, you would need to create ServiceEntries or use DNS forwarding to access services in remote clusters. With the DNS proxy enabled, resolution just works because istiod feeds the proxy information about all services across the mesh.

## Performance Considerations

The DNS proxy adds a small overhead to every DNS query because it goes through the sidecar. In practice, this overhead is negligible - usually under a millisecond. But if your application makes a very high volume of DNS queries, you might want to monitor the sidecar's resource usage.

The DNS cache in the sidecar respects TTLs, so frequently accessed hostnames are resolved from cache. This can actually improve DNS performance compared to going to CoreDNS every time, especially in large clusters where CoreDNS might be under load.

Getting DNS right in Istio sets the foundation for reliable connectivity to both mesh-internal and external services. Enable the DNS proxy, use appropriate resolution modes in your ServiceEntries, and you will save yourself a lot of debugging time.
