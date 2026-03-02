# How to Handle DNS for VM Workloads in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Virtual Machine, Service Mesh, Networking

Description: Learn how to properly configure DNS resolution for virtual machine workloads integrated into an Istio service mesh.

---

When you add VMs to an Istio mesh, one of the first things that breaks is DNS. Kubernetes pods resolve service names through kube-dns or CoreDNS automatically, but VMs sitting outside the cluster do not have that luxury. They need a way to resolve Kubernetes service names like `my-service.my-namespace.svc.cluster.local` to the right addresses. Istio has built-in mechanisms to handle this, but you need to set them up correctly.

## The DNS Problem for VMs

Inside a Kubernetes cluster, every pod gets a `/etc/resolv.conf` that points to the cluster DNS server. When a pod calls `my-service.my-namespace.svc.cluster.local`, CoreDNS resolves it to the ClusterIP. Simple.

VMs do not have access to the cluster DNS. If you try to resolve a Kubernetes service name from a VM, you get nothing. The VM's DNS server has no idea what `.svc.cluster.local` means.

There are a few ways to solve this, and the right approach depends on your setup.

## Option 1: Istio DNS Proxy

The cleanest solution is to use Istio's built-in DNS proxy. When enabled, the Istio sidecar on the VM intercepts DNS queries and resolves Kubernetes service names locally.

First, make sure DNS capture is enabled in your mesh configuration:

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

You can also enable it per-workload by setting the proxy metadata in the WorkloadGroup:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: my-vm-group
  namespace: my-namespace
spec:
  metadata:
    labels:
      app: my-app
  template:
    serviceAccount: my-service-account
    network: vm-network
  probe:
    httpGet:
      port: 8080
```

With DNS capture enabled, the Istio agent on the VM starts a local DNS proxy on port 15053. It intercepts DNS queries through iptables rules and resolves them using information from istiod.

To verify it is working on the VM:

```bash
# Check if the DNS proxy is listening
ss -tulnp | grep 15053

# Test resolution through the proxy
dig @localhost -p 15053 my-service.my-namespace.svc.cluster.local

# Check iptables rules for DNS capture
sudo iptables -t nat -L ISTIO_OUTPUT | grep 15053
```

## Option 2: Configure VM DNS to Forward to Cluster DNS

If you cannot use the Istio DNS proxy, another approach is to configure the VM's DNS resolver to forward `.svc.cluster.local` queries to the Kubernetes DNS service.

First, expose the Kubernetes DNS service externally. You can do this through a load balancer or the east-west gateway:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dns-external
  namespace: kube-system
spec:
  type: LoadBalancer
  selector:
    k8s-app: kube-dns
  ports:
  - name: dns
    port: 53
    protocol: UDP
    targetPort: 53
  - name: dns-tcp
    port: 53
    protocol: TCP
    targetPort: 53
```

Then configure the VM's DNS to forward specific domains. If the VM uses systemd-resolved:

```bash
# Create a drop-in configuration
sudo mkdir -p /etc/systemd/resolved.conf.d/

# Add cluster DNS forwarding
cat <<EOF | sudo tee /etc/systemd/resolved.conf.d/istio.conf
[Resolve]
DNS=<CLUSTER_DNS_EXTERNAL_IP>
Domains=~svc.cluster.local
EOF

sudo systemctl restart systemd-resolved
```

If the VM uses dnsmasq:

```bash
# Add to /etc/dnsmasq.d/istio.conf
server=/svc.cluster.local/<CLUSTER_DNS_EXTERNAL_IP>
```

## Option 3: Use ServiceEntry with Resolution

For cases where you only need to reach a few specific services from your VMs, you can use ServiceEntry resources with explicit resolution. This avoids the DNS problem entirely by using IP addresses.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-db
  namespace: my-namespace
spec:
  hosts:
  - my-database.my-namespace.svc.cluster.local
  location: MESH_INTERNAL
  ports:
  - number: 3306
    name: mysql
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.0.0.100
    labels:
      app: my-database
```

With `resolution: STATIC`, Istio does not need DNS to find the endpoint. It uses the address directly.

## DNS Auto-Allocation

When you enable `ISTIO_META_DNS_AUTO_ALLOCATE`, Istio automatically assigns virtual IPs to ServiceEntry hosts that do not have explicit addresses. This is particularly useful for external services that VMs need to reach.

Without auto-allocation, a ServiceEntry for an external service might look like this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-namespace
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

With auto-allocation enabled, Istio assigns a virtual IP from the 240.240.0.0/16 range to `api.external-service.com`. The Istio DNS proxy on the VM resolves the hostname to this virtual IP, and Envoy then routes the traffic to the actual endpoint.

You can check the allocated addresses:

```bash
# Check what IPs have been auto-allocated
istioctl proxy-config cluster <vm-workload> | grep "api.external-service.com"
```

## Debugging DNS Issues

When DNS is not working correctly for VM workloads, here is how to track down the problem.

Check if the Istio agent is properly capturing DNS:

```bash
# On the VM, check the agent logs
journalctl -u istio | grep -i dns

# Check if iptables DNS redirect is in place
sudo iptables -t nat -L -n | grep 15053

# Test raw DNS resolution (bypassing the proxy)
dig @8.8.8.8 my-service.my-namespace.svc.cluster.local
```

If the DNS proxy is running but not resolving names, the issue might be that istiod has not pushed the necessary configuration. Check the proxy status:

```bash
istioctl proxy-status | grep <vm-workload-name>
```

If the status shows STALE, the VM is not getting config updates from istiod. If it shows NOT CONNECTED, there is a network connectivity issue between the VM and the control plane.

## Handling Split-Horizon DNS

In many setups, VMs need to resolve both Kubernetes service names and regular external DNS names. The Istio DNS proxy handles this through a split-horizon approach.

When a DNS query arrives at the Istio DNS proxy:

1. If the name matches a known Kubernetes service or ServiceEntry, it resolves it locally
2. If the name is unknown, it forwards the query to the VM's upstream DNS server

This means you do not lose normal DNS resolution when you enable the Istio DNS proxy. Regular domains like `google.com` still resolve through the VM's configured DNS server.

You can verify this behavior:

```bash
# This should resolve through Istio
dig my-service.my-namespace.svc.cluster.local

# This should forward to upstream DNS
dig google.com
```

## Performance Considerations

The Istio DNS proxy adds a small amount of latency to DNS queries. For most workloads this is negligible, but if your VM makes a very high volume of DNS queries, you might want to consider:

- Enabling DNS caching on the VM (the Istio DNS proxy does cache, but local caching adds another layer)
- Using headless services where possible to reduce the number of DNS lookups
- Setting appropriate TTL values in your ServiceEntry resources

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: cached-external
  namespace: my-namespace
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

Getting DNS right for VM workloads is one of the foundational steps for a successful VM-to-mesh integration. The Istio DNS proxy is the recommended approach for most setups because it requires the least external infrastructure and works seamlessly with the rest of the Istio configuration. Once DNS is working, everything else - traffic routing, mTLS, observability - falls into place much more naturally.
