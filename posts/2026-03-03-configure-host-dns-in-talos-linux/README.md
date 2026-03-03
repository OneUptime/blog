# How to Configure Host DNS in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Networking, Kubernetes, CoreDNS

Description: A practical guide to configuring host-level DNS resolution in Talos Linux including upstream resolvers, host DNS forwarding, and troubleshooting DNS issues.

---

DNS configuration in Talos Linux works differently than in most Linux distributions. There is no /etc/resolv.conf that you can just edit, no systemd-resolved service to configure, and no nsswitch.conf to tweak. Instead, Talos manages DNS through its machine configuration and provides a built-in host DNS proxy that handles resolution for system-level processes.

Understanding how Talos handles DNS at the host level is important because misconfigurations here can cascade into Kubernetes DNS problems, image pull failures, and general connectivity issues.

## How Host DNS Works in Talos Linux

Talos Linux introduced a host DNS feature that runs a local DNS proxy on each node. This proxy listens on a local address and forwards DNS queries to the configured upstream resolvers. The host DNS proxy serves two main purposes:

1. It provides DNS resolution for Talos system services (like the kubelet) that need to resolve hostnames before Kubernetes CoreDNS is available
2. It can optionally forward cluster DNS queries to CoreDNS once the cluster is up, creating a unified DNS resolution path

The host DNS proxy runs as part of the Talos init system, so it starts very early in the boot process and is available before any containers are running.

## Configuring Upstream DNS Resolvers

The most basic DNS configuration is setting your upstream resolvers in the machine config:

```yaml
# Configure upstream DNS servers
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
      - 1.1.1.1
```

These resolvers are used by the host DNS proxy for all upstream lookups. Apply and verify:

```bash
# Apply the configuration
talosctl -n <node-ip> apply-config --file machine-config.yaml

# Check configured resolvers
talosctl -n <node-ip> get resolvers

# Verify the resolv.conf that Talos generates
talosctl -n <node-ip> read /etc/resolv.conf
```

If you are using DHCP, the DNS servers provided by your DHCP server will be used automatically unless you override them in the machine config:

```yaml
# DHCP with DNS override
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
    # These override DHCP-provided DNS
    nameservers:
      - 10.0.0.53    # Your internal DNS server
      - 8.8.8.8       # Fallback public DNS
```

## Enabling Host DNS Forwarding

Talos Linux v1.6 and later supports host DNS forwarding, which allows the host DNS proxy to forward queries for cluster domains (like `.cluster.local`) to CoreDNS:

```yaml
# Enable host DNS forwarding
machine:
  features:
    hostDNS:
      enabled: true
      forwardKubeDNSToHost: true
```

When `forwardKubeDNSToHost` is enabled, the host DNS proxy intercepts DNS queries from pods and can resolve both external domains (by forwarding to upstream resolvers) and cluster-internal domains (by forwarding to CoreDNS).

This is particularly useful for:

- Pods that need to resolve both cluster services and external hostnames
- System containers that run outside the normal Kubernetes DNS resolution path
- Environments where you want a single DNS resolution point for all queries

```bash
# Verify host DNS is enabled
talosctl -n <node-ip> get hostdnsstatus

# Check the host DNS proxy is listening
talosctl -n <node-ip> get addresses | grep "169.254"
```

## Configuring Custom DNS Search Domains

You can configure DNS search domains that are appended to unqualified hostnames:

```yaml
# Configure search domains
machine:
  network:
    searchDomains:
      - example.com
      - internal.example.com
```

This means when a system process tries to resolve "myhost", it will also try "myhost.example.com" and "myhost.internal.example.com".

## Configuring Static Host Entries

For hosts that you need to resolve without DNS, or for overriding DNS responses, use the extraHostEntries field:

```yaml
# Add static host entries (like /etc/hosts)
machine:
  network:
    extraHostEntries:
      - ip: 192.168.1.50
        aliases:
          - registry.local
          - docker-registry.local
      - ip: 192.168.1.51
        aliases:
          - nfs-server.local
      - ip: 10.0.0.100
        aliases:
          - api.internal.company.com
```

This is handy for local services like container registries, NFS servers, or internal APIs that you do not want to publish in your DNS infrastructure.

```bash
# Verify host entries are applied
talosctl -n <node-ip> read /etc/hosts
```

## How DNS Flows Through the System

Understanding the DNS flow helps with troubleshooting. Here is how a DNS query travels through Talos Linux:

1. A system process (like kubelet) makes a DNS query
2. The query goes to the host DNS proxy (listening on 127.0.0.53 or a link-local address)
3. The host DNS proxy checks if the query is for a cluster domain (e.g., .cluster.local)
4. If it is a cluster domain and forwarding is enabled, the query goes to CoreDNS
5. If it is an external domain, the query goes to the configured upstream resolvers
6. The response travels back the same path

For pods, the flow is slightly different:

1. A pod makes a DNS query
2. The query goes to CoreDNS (based on the pod's /etc/resolv.conf)
3. CoreDNS resolves cluster-internal names directly
4. CoreDNS forwards external queries to the upstream resolvers configured in its ConfigMap

## Configuring CoreDNS Upstream Resolvers

CoreDNS in Kubernetes has its own upstream resolver configuration, separate from the host DNS:

```yaml
# CoreDNS ConfigMap - forwards to host DNS proxy
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

When host DNS forwarding is enabled, CoreDNS's `/etc/resolv.conf` points to the host DNS proxy, creating a clean resolution chain.

## Troubleshooting Host DNS Issues

### DNS Not Resolving at All

```bash
# Check if the host DNS proxy is running
talosctl -n <node-ip> services | grep dns

# Verify the resolvers are configured
talosctl -n <node-ip> get resolvers

# Check for DNS errors in logs
talosctl -n <node-ip> logs dns-resolve-cache

# Test resolution directly
talosctl -n <node-ip> read /etc/resolv.conf
```

### Slow DNS Resolution

If DNS queries are slow, one of your upstream resolvers might be unreachable or timing out:

```bash
# Check which resolvers are being used and their response times
talosctl -n <node-ip> logs dns-resolve-cache | grep -i "timeout\|slow\|error"

# Use packet capture to diagnose
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "port 53" --duration 10s -o dns.pcap
```

Consider reordering your nameservers so the fastest one is first, or remove unreachable resolvers.

### DNS Working on Host but Not in Pods

If host-level DNS works but pod DNS fails, the issue is likely in CoreDNS:

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Look at CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Verify CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml

# Test DNS from a pod
kubectl run dns-test --rm -it --image=busybox -- nslookup kubernetes.default.svc.cluster.local
```

### DHCP Overriding Manual DNS Settings

If DHCP keeps overwriting your manually configured DNS servers:

```yaml
# Explicitly set nameservers to override DHCP
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        dhcpOptions:
          routeMetric: 100
    nameservers:
      - 10.0.0.53    # These take priority over DHCP-provided DNS
```

## Performance Tuning

For large clusters with many DNS queries, consider these tuning options:

```yaml
# Increase DNS cache and connection limits
machine:
  features:
    hostDNS:
      enabled: true
      forwardKubeDNSToHost: true
```

On the CoreDNS side, increase the cache size and enable prefetching:

```yaml
# CoreDNS performance tuning in ConfigMap
cache 300 {
    success 9984
    denial 9984
    prefetch 10 60s 10%
}
```

## Conclusion

Host DNS in Talos Linux provides a reliable foundation for name resolution across your entire cluster. The key decisions you need to make are which upstream resolvers to use, whether to enable host DNS forwarding for unified resolution, and how to handle any local name resolution needs through static host entries. Get the host DNS right, and you will avoid a whole class of connectivity problems that stem from DNS misconfiguration. Start simple with well-known public resolvers, verify everything works, then add complexity like custom search domains and host DNS forwarding as needed.
