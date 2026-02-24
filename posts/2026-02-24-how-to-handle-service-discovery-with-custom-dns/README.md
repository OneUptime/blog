# How to Handle Service Discovery with Custom DNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Service Discovery, Kubernetes, CoreDNS

Description: Configure custom DNS resolution in Istio for service discovery when you need to use non-standard hostnames or integrate with external DNS systems.

---

Kubernetes has its own DNS system (CoreDNS) that handles service discovery within the cluster. Services get DNS names like `my-service.namespace.svc.cluster.local`. But real-world environments are messier than that. You might need custom DNS names for external services, internal naming conventions that don't follow the Kubernetes pattern, or integration with corporate DNS infrastructure. Istio provides several mechanisms for handling custom DNS alongside standard Kubernetes DNS.

## How DNS Works in Istio

When a pod in the mesh makes a DNS request, the flow depends on your Istio configuration:

1. The application resolves a hostname through the pod's DNS configuration (usually CoreDNS)
2. If Istio's DNS proxy is enabled, the sidecar intercepts DNS queries and can answer them directly
3. The resolved IP address is used by the application, but the sidecar proxy routes based on the original hostname (not the IP)

This separation between DNS resolution and traffic routing is important. Istio routes traffic based on the hostname in the `Host` header (for HTTP) or the SNI (for TLS), not the resolved IP.

## Enabling Istio's DNS Proxy

Istio includes a DNS proxy in the sidecar that can resolve hostnames for ServiceEntry resources. This is particularly useful for services registered with ServiceEntry that don't exist in Kubernetes DNS.

Enable it mesh-wide:

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

Or enable it per workload with a pod annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
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
      - name: my-service
        image: myregistry/my-service:v1
```

With `DNS_CAPTURE` enabled, the sidecar intercepts all DNS queries from the application. With `DNS_AUTO_ALLOCATE`, Istio automatically assigns virtual IP addresses to ServiceEntry hosts that don't have an explicit address.

## Using ServiceEntry for Custom DNS Names

Register external services with custom hostnames:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: legacy-crm
  namespace: backend
spec:
  hosts:
  - "crm.internal.company.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

If the DNS proxy is enabled, pods in the mesh can resolve `crm.internal.company.com` even if it's not in Kubernetes DNS, as long as the upstream DNS server knows about it.

For hosts that only exist in your ServiceEntry (no real DNS record), use `resolution: STATIC` with explicit addresses:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: internal-legacy-db
  namespace: backend
spec:
  hosts:
  - "legacy-db.mycompany"
  location: MESH_EXTERNAL
  ports:
  - number: 3306
    name: mysql
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.20.30.40
```

With `DNS_AUTO_ALLOCATE` enabled, Istio assigns a virtual IP to `legacy-db.mycompany` so DNS queries return a routable address. The sidecar then intercepts traffic to that virtual IP and routes it to the actual endpoint (10.20.30.40).

## Integrating with External DNS

If your organization uses a corporate DNS server for internal service discovery, you need to make sure Kubernetes pods can resolve those names.

Option 1: Configure CoreDNS to forward specific domains to your corporate DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
    internal.company.com:53 {
        forward . 10.0.0.2 10.0.0.3
        cache 30
    }
```

This tells CoreDNS to forward queries for `*.internal.company.com` to your corporate DNS servers (10.0.0.2 and 10.0.0.3) and handle everything else normally.

Option 2: If you're using Istio's DNS proxy, create ServiceEntry resources for the corporate services and let the DNS proxy handle resolution:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: corp-services
  namespace: backend
spec:
  hosts:
  - "*.internal.company.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

The wildcard host tells Istio that any hostname matching `*.internal.company.com` is a valid destination.

## Custom DNS for Service Aliases

Sometimes you want a friendly name for an existing Kubernetes service. For example, instead of calling `user-service.backend.svc.cluster.local`, you want to use `users.api`:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: users-api-alias
  namespace: backend
spec:
  hosts:
  - "users.api"
  location: MESH_INTERNAL
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: STATIC
  endpoints:
  - address: user-service.backend.svc.cluster.local
    ports:
      http: 8080
```

With the DNS proxy enabled, applications can resolve `users.api` and traffic gets routed to the real `user-service`.

## Handling Split-Horizon DNS

Split-horizon DNS is when the same hostname resolves to different addresses depending on where the query comes from. This is common when you have services that are accessible both internally and externally.

For example, `api.example.com` might resolve to a public IP from the internet but should resolve to an internal ClusterIP from within the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: api-internal
  namespace: backend
spec:
  hosts:
  - "api.example.com"
  location: MESH_INTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: STATIC
  endpoints:
  - address: api-service.backend.svc.cluster.local
    ports:
      https: 8443
```

When pods in the mesh try to reach `api.example.com`, Istio routes them to the internal service instead of going out to the public IP and back in.

## DNS Troubleshooting

When DNS isn't working as expected in the mesh, here's how to debug:

Check what the pod's DNS configuration looks like:

```bash
kubectl exec deploy/my-service -n backend -- cat /etc/resolv.conf
```

Test DNS resolution from inside the pod:

```bash
kubectl exec deploy/my-service -n backend -- nslookup my-other-service.backend.svc.cluster.local
```

If Istio's DNS proxy is enabled, check the sidecar logs for DNS activity:

```bash
kubectl logs deploy/my-service -c istio-proxy -n backend | grep "dns"
```

Check if the DNS proxy is intercepting queries:

```bash
istioctl proxy-config listener deploy/my-service -n backend --port 15053
```

Port 15053 is the DNS proxy listener. If it exists, DNS interception is active.

Verify that ServiceEntry hostnames are resolvable:

```bash
kubectl exec deploy/my-service -n backend -- nslookup legacy-db.mycompany
```

If using `DNS_AUTO_ALLOCATE`, you should see a virtual IP address (usually from the 240.0.0.0/4 range).

## Performance Considerations

DNS resolution adds latency to every new connection. A few things to keep in mind:

CoreDNS caching reduces the impact of DNS lookups. The default TTL is 30 seconds, which is fine for most use cases.

Istio's DNS proxy adds its own caching layer. For ServiceEntry hosts, the proxy can respond immediately without querying CoreDNS.

If you're seeing high DNS latency, check CoreDNS pod health and resource usage:

```bash
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

Custom DNS in Istio gives you flexibility to handle naming conventions that go beyond Kubernetes defaults. Whether you're integrating with corporate DNS, creating service aliases, or handling split-horizon scenarios, the combination of CoreDNS configuration and Istio ServiceEntry resources covers most use cases.
