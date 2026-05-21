# How to Set Up DNS Proxying in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Proxy, Kubernetes, Service Mesh, Networking

Description: A detailed guide to setting up DNS proxying in Istio to intercept and resolve DNS queries locally in the sidecar for better performance and multicluster support.

---

DNS proxying in Istio intercepts DNS queries from your application containers and resolves them inside the sidecar proxy. Instead of every DNS query going to CoreDNS, the Istio agent handles resolution locally using the Istio service registry. Queries for services the agent does not know about still get forwarded to the upstream DNS server.

This feature was introduced to solve real problems. Multicluster service discovery, VM integration, and ServiceEntry resolution all work better when the sidecar controls DNS. And as a bonus, you get reduced load on CoreDNS and faster DNS resolution for mesh services.

## How DNS Proxying Works Under the Hood

When DNS proxying is enabled, the iptables rules installed by the sidecar init container or Istio CNI redirect outgoing DNS packets on port 53 from the application container to the Istio agent running in the sidecar on port 15053. The agent acts as a DNS server with the following resolution logic:

1. Check if the hostname matches a service in the Istio service registry
2. If yes, return the cluster IP (for Kubernetes services) or an auto-allocated VIP (for ServiceEntry hosts)
3. If no, forward the query to the upstream DNS server (CoreDNS or whatever is configured in the pod's resolv.conf)

The agent stores a local mapping of domain names to IP addresses, so lookups it can answer directly avoid a round trip to the upstream DNS server.

## Enabling DNS Proxying

### Mesh-Wide

The most common approach is to enable it for all sidecars through MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
  # Optional for older Istio releases; enabled by default in current releases.
  values:
    pilot:
      env:
        PILOT_ENABLE_IP_AUTOALLOCATE: "true"
```

Apply the configuration:

```bash
istioctl install -f dns-proxy-config.yaml
```

After applying, restart your workloads to pick up the new configuration:

```bash
kubectl rollout restart deployment -n my-namespace
```

### Per Workload

If you want to enable DNS proxying for specific workloads only:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ISTIO_META_DNS_CAPTURE: "true"
    spec:
      containers:
        - name: my-app
          image: my-app:v1
```

### Disabling for Specific Workloads

If DNS proxying is enabled mesh-wide but you want to disable it for a specific workload:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

## Understanding Address Auto-Allocation

This setting deserves special attention. When IP auto-allocation is enabled, Istio automatically assigns virtual IP addresses to ServiceEntry hosts that do not have a static address configured. In current Istio releases, this is controlled by the `PILOT_ENABLE_IP_AUTOALLOCATE` environment variable on istiod, which defaults to `true`, and can be overridden per ServiceEntry with the `networking.istio.io/enable-autoallocate-ip` label.

Why does this matter? Consider a TCP ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-mysql
spec:
  hosts:
    - mysql.external.com
  ports:
    - number: 3306
      name: tcp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

Without auto-allocation, the DNS query for `mysql.external.com` returns the real external IP. The sidecar cannot distinguish between different TCP services on the same port because it only sees the IP and port. With auto-allocation, the DNS proxy returns a unique virtual IP for `mysql.external.com`, and the sidecar can route based on that VIP to the correct backend.

For HTTP services, this is less of an issue because the Host header provides routing information. But for TCP services, auto-allocated VIPs are essential for correct routing when you have multiple ServiceEntry hosts.

## Verifying DNS Proxying is Active

Check that the iptables rules are redirecting DNS:

```bash
kubectl exec deploy/my-app -c my-app -n default -- \
  iptables-save | grep 53
```

You should see rules redirecting DNS traffic on port 53 to the Istio agent on port 15053. If your workload uses Istio CNI or a minimal container image that does not include `iptables-save`, verify with a DNS lookup instead.

Check DNS resolution from inside the app container:

```bash
kubectl exec deploy/my-app -c my-app -n default -- nslookup kubernetes.default
```

Check the Istio agent logs for DNS activity:

```bash
kubectl logs deploy/my-app -c istio-proxy -n default | grep -i dns
```

## DNS Proxying with Multicluster

One of the primary use cases for DNS proxying is multicluster service discovery. In a multicluster mesh, a service running in cluster B is not in cluster A's Kubernetes DNS (CoreDNS). Without DNS proxying, a pod in cluster A cannot resolve the service name.

With DNS proxying enabled, the resolution works because:

1. The pod queries for `service.namespace.svc.cluster.local`
2. The DNS proxy intercepts the query
3. The Istio agent checks the service registry, which includes remote cluster services
4. The agent returns the appropriate address (direct pod IP for same-network, gateway IP for different-network)

No special CoreDNS configuration is needed.

## DNS Proxying with ServiceEntry

DNS proxying improves ServiceEntry behavior for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
```

With DNS proxying, when your app resolves `api.example.com`, the proxy can intercept the query and apply any address mapping or VIP assignment. Without it, the app resolves the hostname through CoreDNS and gets the real IP, which limits Istio's ability to apply routing rules.

## Performance Considerations

DNS proxying reduces load on CoreDNS because the sidecar handles most lookups locally. In large clusters where CoreDNS is already under pressure, this can be significant.

The Istio agent keeps local service mappings, so lookups it can answer directly avoid going to CoreDNS.

Memory overhead is minimal. The agent keeps the DNS data it needs in memory.

## Troubleshooting DNS Proxying

**DNS queries timing out**: Check that the iptables rules are correctly set up. If the init container failed to configure iptables, DNS queries might go to a black hole:

```bash
kubectl logs deploy/my-app -c istio-init -n default
```

If you use Istio CNI instead of the init container, check the Istio CNI pod logs in the `istio-system` namespace.

**Incorrect resolution for external hosts**: If an external hostname resolves to the wrong IP, it might be because auto-allocation assigned a VIP. Check whether the ServiceEntry has an explicit `spec.addresses` value or the `networking.istio.io/enable-autoallocate-ip` label, then verify the DNS response from the application container:

```bash
kubectl exec deploy/my-app -c my-app -n default -- nslookup api.example.com
```

**Upstream DNS failures**: If the agent cannot reach the upstream DNS server, all non-mesh DNS queries will fail. Check the resolv.conf configuration:

```bash
kubectl exec deploy/my-app -c my-app -n default -- cat /etc/resolv.conf
```

**NDOTS interaction**: Kubernetes pods typically have `ndots:5` in resolv.conf, which causes short hostnames to be tried with cluster domain suffixes first. The DNS proxy respects this, so external hostname resolution behavior should be the same as without the proxy.

DNS proxying is a lightweight feature that provides tangible benefits. Enable it mesh-wide unless you have a specific reason not to. The performance improvement from local resolution and the multicluster DNS support make it worth the minimal overhead.
