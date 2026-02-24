# How to Configure Istio DNS Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Proxy, Kubernetes, Service Mesh, Networking

Description: A hands-on guide to configuring Istio DNS proxy to improve DNS resolution performance and enable DNS-based routing for mesh services.

---

Istio includes a DNS proxy built into the sidecar that can intercept DNS queries from your application and resolve them locally. This cuts down on DNS resolution latency and enables some features that are not possible with standard Kubernetes DNS, like resolving services across multicluster meshes without custom CoreDNS configuration.

The DNS proxy sits inside the Envoy sidecar (technically the istio-agent that runs alongside Envoy). When enabled, it captures DNS queries from the application container, resolves them using Istio's service registry, and only forwards unknown queries to the upstream DNS server (usually CoreDNS).

## Why Use Istio DNS Proxy?

There are a few practical reasons:

1. **Multicluster DNS resolution**: In a multicluster mesh, services in remote clusters are not in your local Kubernetes DNS. The Istio DNS proxy knows about them through the service registry and can resolve them without needing a custom DNS setup.

2. **Reduced DNS load**: The proxy caches DNS responses and serves them locally, reducing the number of queries hitting CoreDNS. In large clusters with thousands of pods, this can make a meaningful difference.

3. **VM integration**: When you add VMs to the mesh, they need to resolve Kubernetes service names. The DNS proxy on the VM can handle this without configuring the VM's system DNS.

4. **ServiceEntry DNS**: If you define ServiceEntry resources with DNS names, the proxy ensures they resolve correctly within the mesh.

## Enabling DNS Proxy Globally

You can enable the DNS proxy through the mesh configuration. Update your IstioOperator or ConfigMap:

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

Or if you are editing the istio ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

Add under `defaultConfig`:

```yaml
defaultConfig:
  proxyMetadata:
    ISTIO_META_DNS_CAPTURE: "true"
    ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

After changing the mesh config, restart your workload pods to pick up the new proxy configuration:

```bash
kubectl rollout restart deployment -n my-namespace
```

## What Each Setting Does

**ISTIO_META_DNS_CAPTURE**: When set to `"true"`, the sidecar intercepts DNS queries on port 53 from the application container. The queries go to the local Istio agent instead of directly to CoreDNS.

**ISTIO_META_DNS_AUTO_ALLOCATE**: When set to `"true"`, Istio automatically assigns virtual IPs to ServiceEntry hosts that do not already have an address. This is important for TCP services defined via ServiceEntry, because without a VIP, Envoy cannot distinguish between different TCP services on the same port.

## Enabling DNS Proxy Per Workload

If you do not want to enable DNS proxy mesh-wide, you can do it per pod using annotations:

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

This approach lets you test the feature on specific workloads before rolling it out everywhere.

## How DNS Resolution Works with the Proxy

When the DNS proxy is active, here is the resolution order:

1. The application makes a DNS query (e.g., for `httpbin.default.svc.cluster.local`)
2. The iptables rules redirect the query to the Istio agent on the sidecar
3. The agent checks if the name matches a service in the Istio service registry
4. If it matches, the agent responds immediately with the cluster IP (or the auto-allocated VIP for ServiceEntry hosts)
5. If it does not match, the agent forwards the query to the upstream DNS server

You can verify DNS proxy is active by checking the iptables rules:

```bash
kubectl exec -n my-namespace my-pod -c istio-proxy -- \
  pilot-agent request GET /dns_resolve?proxyID=my-pod.my-namespace
```

Or check the proxy configuration:

```bash
istioctl proxy-config bootstrap my-pod -n my-namespace -o json | \
  grep -A5 "dns"
```

## DNS Proxy with ServiceEntry

One of the best use cases for the DNS proxy is with ServiceEntry. Consider an external API that your application calls:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

With DNS proxy and auto-allocation enabled, Istio assigns a virtual IP to `api.external-service.com`. When your app resolves this hostname, the DNS proxy returns the virtual IP, and Envoy routes the traffic through the mesh with full observability and policy enforcement.

Without the DNS proxy, the application would resolve the hostname through CoreDNS and get the real external IP. Traffic would still go through the sidecar (because of iptables redirect), but certain features like traffic splitting by hostname would not work for TCP services.

## DNS Proxy in Multicluster

In a multicluster mesh, services in remote clusters are not in the local Kubernetes DNS. The DNS proxy solves this:

```bash
# A service running in cluster 2 but not in cluster 1's DNS
# With DNS proxy, pods in cluster 1 can resolve it:
curl http://remote-service.remote-namespace.svc.cluster.local
```

The Istio agent knows about remote services through the control plane's service discovery. When a pod queries for a service that exists only in a remote cluster, the DNS proxy resolves it using the service registry, returning the correct cluster IP or gateway address.

## Monitoring DNS Proxy

The DNS proxy exposes metrics that you can scrape with Prometheus:

- `istio_agent_dns_requests_total`: Total number of DNS requests handled
- `istio_agent_dns_upstream_requests_total`: Requests forwarded to upstream DNS
- `istio_agent_dns_failures_total`: Failed DNS resolutions

These metrics help you understand how much DNS load the proxy is handling versus forwarding.

## Troubleshooting

If DNS resolution fails after enabling the proxy, check these things:

```bash
# Check if DNS capture is actually enabled in the proxy config
istioctl proxy-config bootstrap my-pod -n my-namespace | grep DNS

# Check the istio-agent logs for DNS errors
kubectl logs my-pod -c istio-proxy -n my-namespace | grep -i dns

# Test resolution from inside the proxy
kubectl exec my-pod -c istio-proxy -n my-namespace -- \
  nslookup kubernetes.default.svc.cluster.local localhost
```

A common issue is that the iptables rules are not set up correctly. This can happen if the init container did not run properly. Check the init container logs:

```bash
kubectl logs my-pod -c istio-init -n my-namespace
```

The DNS proxy is a small but useful feature that improves both performance and functionality in your Istio mesh. For multicluster setups and VM integration, it is practically essential.
