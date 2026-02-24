# How to Handle DNS Resolution in Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Service Mesh, Kubernetes, Networking

Description: Understanding how DNS resolution works in Istio and how to configure it properly for both internal and external service communication.

---

DNS resolution in a service mesh is more nuanced than most people expect. When Istio is in the picture, there are multiple layers involved in turning a hostname into an IP address, and understanding those layers is key to avoiding some of the most frustrating debugging sessions you'll ever have.

## How DNS Works Without Istio

In a standard Kubernetes setup, DNS is straightforward. CoreDNS runs as a cluster addon, and every pod gets a `/etc/resolv.conf` that points to the CoreDNS service IP. When your app resolves a hostname like `my-service.default.svc.cluster.local`, the query goes to CoreDNS, which looks it up in the Kubernetes API and returns the ClusterIP.

For external names like `api.github.com`, the query bubbles up through the CoreDNS forwarding chain until it reaches an upstream DNS server that can resolve it.

## How DNS Changes with Istio

Istio doesn't fundamentally change the DNS resolution path by default. Your app still queries CoreDNS the same way. What changes is what happens AFTER DNS resolution, when the actual TCP connection is made.

Here's the sequence:

1. App resolves `my-service.default.svc.cluster.local` via CoreDNS
2. CoreDNS returns the ClusterIP (e.g., `10.96.0.15`)
3. App opens a connection to `10.96.0.15:8080`
4. The Envoy sidecar intercepts this connection via iptables
5. Envoy looks up the destination in its own service registry
6. Envoy routes the connection based on Istio rules (VirtualService, DestinationRule, etc.)

The important thing to understand is that Istio maintains its own service registry that's separate from DNS. This registry is built from Kubernetes Services, ServiceEntries, and other Istio configuration. The sidecar knows about all services in the mesh and can route traffic based on hostnames, not just IPs.

## DNS and ServiceEntry

This is where things get interesting. When you define a ServiceEntry for an external host, Istio adds it to the sidecar's service registry. But that doesn't automatically make the hostname resolvable via DNS:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

With `resolution: DNS`, the sidecar resolves the hostname using the system DNS when it needs to connect. With `resolution: STATIC`, you provide the IP addresses directly in the ServiceEntry endpoints.

There's also `resolution: NONE`, which means no resolution at all. The sidecar uses the original destination IP from the connection. This is useful for passthrough scenarios.

## The DNS Proxy Option

As mentioned in the DNS proxy section, Istio can intercept DNS queries and resolve them in the sidecar. When enabled, this changes the flow:

1. App tries to resolve a hostname
2. iptables redirects the DNS query to the sidecar
3. Sidecar checks if the name is in the Istio service registry
4. If yes, responds directly
5. If no, forwards to upstream DNS

Enable it with:

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

## Handling Short Names vs FQDNs

Kubernetes DNS handles short names through the search domains in `/etc/resolv.conf`. If your pod is in the `default` namespace, resolving `my-service` will try:

1. `my-service.default.svc.cluster.local`
2. `my-service.svc.cluster.local`
3. `my-service.cluster.local`

This works the same with Istio. However, if you're using the DNS proxy, be aware that the sidecar matches against FQDNs in its registry. The short name resolution still happens through the search domain expansion, just locally in the sidecar instead of at CoreDNS.

## Cross-Namespace DNS Resolution

Services in other namespaces are accessible using their FQDN:

```
my-service.other-namespace.svc.cluster.local
```

Or the shorter form:

```
my-service.other-namespace
```

Istio handles cross-namespace routing transparently. As long as the sidecar has the service in its registry (which it does by default for all Kubernetes services), traffic will be routed correctly.

If you've limited the sidecar's scope using the Sidecar resource, make sure the target namespace is included:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "other-namespace/*"
    - "istio-system/*"
```

Without the target namespace in the egress hosts, the sidecar won't know about services in that namespace, even though DNS resolution through CoreDNS would still work. This creates a confusing situation where DNS resolves fine but connections fail.

## Multicluster DNS Resolution

In a multicluster Istio setup, services in remote clusters need special DNS handling. There are a few approaches:

### Shared DNS Zone
Set up CoreDNS to forward queries for the shared domain to both clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
    }
    global:53 {
        forward . 10.0.0.10 10.1.0.10
    }
```

### Istio DNS Proxy with Auto-Allocate
The simpler approach. Enable DNS auto-allocation and the sidecar will assign virtual IPs to remote services:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

## Debugging DNS Issues

When DNS problems come up, here's how to troubleshoot:

### Check resolv.conf
```bash
kubectl exec -it deploy/my-app -c my-app -- cat /etc/resolv.conf
```

### Test resolution from the app container
```bash
kubectl exec -it deploy/my-app -c my-app -- nslookup my-service.default.svc.cluster.local
```

### Test resolution from the sidecar
```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET clusters | grep my-service
```

### Check DNS stats (if DNS proxy is enabled)
```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns
```

### Check CoreDNS logs
```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

## Common DNS Gotchas in Istio

1. **ServiceEntry without DNS**: If you create a ServiceEntry with `resolution: NONE` and no DNS proxy, the hostname might resolve through external DNS to a different IP than what Istio expects. This can cause routing issues.

2. **ndots setting**: The default `ndots: 5` in Kubernetes means that names with fewer than 5 dots get the search domains appended first. This can cause extra DNS queries. Some teams lower this to `ndots: 2` for better performance.

3. **DNS caching**: Envoy's DNS proxy caches results, but the application container's resolver might have its own cache (like nscd or systemd-resolved). Multiple caching layers can make TTL behavior unpredictable.

4. **IPv6**: If your cluster has IPv6 enabled, DNS queries might return AAAA records. Make sure your Istio configuration handles both address families.

Understanding how DNS interacts with Istio saves you from a lot of head-scratching. The key takeaway is that DNS resolution and traffic routing are separate concerns in Istio, and getting them both right requires attention to how they interact.
