# How to Configure DNS Nameservers in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Networking, Kubernetes, Configuration

Description: A practical guide to configuring DNS nameservers in Talos Linux for reliable name resolution across your Kubernetes cluster.

---

DNS resolution is foundational to everything in a Kubernetes cluster. Nodes need to resolve hostnames to pull container images, contact NTP servers, and communicate with external services. Inside the cluster, CoreDNS handles service discovery, but the nodes themselves rely on the DNS nameservers you configure at the machine level. If DNS is misconfigured, image pulls fail, certificates cannot be validated, and the cluster grinds to a halt.

This post covers how to configure DNS nameservers in Talos Linux, where the settings apply, and how to troubleshoot DNS issues.

## Machine-Level DNS Configuration

DNS nameservers in Talos Linux are configured in the `machine.network.nameservers` field:

```yaml
# machine-config.yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
      - 1.1.1.1
```

These nameservers are used by the Talos node itself for resolving external hostnames. They are not the same as the DNS servers used by Kubernetes pods (which use CoreDNS).

The nameservers are tried in order. If the first server does not respond, Talos falls back to the second, and so on. Having at least two nameservers provides redundancy.

## Where Machine DNS Is Used

Machine-level DNS resolution is used by several Talos components:

- **Container image pulls** - containerd resolves registry hostnames (like `ghcr.io`, `docker.io`) using the configured nameservers
- **NTP synchronization** - If your NTP servers are specified as hostnames (like `time.cloudflare.com`), they need DNS to resolve
- **Log forwarding** - If your log endpoint uses a hostname
- **API server communication** - When nodes need to reach the control plane endpoint by hostname
- **Extension services** - Any system extension that connects to external services

## Configuring DNS During Cluster Setup

When generating a new Talos configuration, add DNS settings through a config patch:

```bash
# Using a patch file
cat > dns-patch.yaml << 'EOF'
machine:
  network:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
EOF

talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @dns-patch.yaml
```

Or inline:

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"network": {"nameservers": ["10.0.0.2", "10.0.0.3"]}}}'
```

## DNS from DHCP vs. Static Configuration

If your interface uses DHCP, the DHCP server typically provides DNS nameservers. When you also specify nameservers in `machine.network.nameservers`, the static configuration takes precedence:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
    # These override any DNS servers from DHCP
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
```

If you want to use the DNS servers from DHCP, simply do not set `machine.network.nameservers`:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
    # No nameservers specified - uses DHCP-provided DNS
```

## Corporate DNS Servers

In corporate environments, you typically have internal DNS servers that can resolve both internal hostnames (like `registry.corp.internal`) and external ones (through forwarding):

```yaml
machine:
  network:
    nameservers:
      # Primary corporate DNS
      - 10.0.0.2
      # Secondary corporate DNS
      - 10.0.0.3
      # Fallback to public DNS
      - 8.8.8.8
```

The fallback to a public DNS server is optional but helpful. If your internal DNS servers are temporarily down, the node can still resolve public hostnames.

## Internal and Split-Horizon DNS

Some environments use split-horizon DNS, where internal and external queries are handled by different servers. In this case, your corporate DNS servers should be the only ones configured, since they handle the routing internally:

```yaml
machine:
  network:
    nameservers:
      # Corporate DNS handles both internal and external resolution
      - 10.0.0.2
      - 10.0.0.3
```

Do not add public DNS servers alongside split-horizon DNS servers, because queries for internal domains might accidentally go to the public server and fail to resolve.

## Applying DNS Changes to Running Nodes

To change DNS settings on a running node:

```bash
# Update nameservers on a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"nameservers": ["10.0.0.2", "10.0.0.3", "8.8.8.8"]}}}'
```

The change takes effect quickly without a reboot. Talos updates the resolver configuration and subsequent DNS queries use the new servers.

## Verifying DNS Configuration

Check that your DNS settings are applied correctly:

```bash
# View configured resolvers
talosctl get resolvers --nodes 192.168.1.10

# Test DNS resolution from the node
talosctl get addresses --nodes 192.168.1.10
```

You can also verify that specific domains resolve correctly by checking if services that depend on DNS are working:

```bash
# If image pulls work, DNS is resolving registry hostnames
talosctl image pull --nodes 192.168.1.10 docker.io/library/busybox:latest

# Check NTP sync (requires resolving NTP server hostname)
talosctl service timed --nodes 192.168.1.10
```

## DNS and CoreDNS

It is important to understand the relationship between machine DNS and Kubernetes CoreDNS:

**Machine DNS** (what we are configuring here):
- Configured in `machine.network.nameservers`
- Used by the Talos node and its system services
- Used for resolving container registry hostnames, NTP servers, etc.

**CoreDNS**:
- Runs as a Kubernetes deployment inside the cluster
- Handles DNS for pods and services (`.cluster.local` domain)
- Uses upstream DNS servers to resolve external names
- Configured through Kubernetes ConfigMaps

CoreDNS typically uses the host node's DNS configuration as its upstream resolver. So your machine DNS settings indirectly affect how pods resolve external names too.

If you need to customize CoreDNS behavior (like adding custom stub domains), that is done through Kubernetes, not through the Talos machine config:

```yaml
# CoreDNS ConfigMap for custom domains
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  custom.server: |
    corp.internal:53 {
      forward . 10.0.0.2 10.0.0.3
    }
```

## Multiple DNS Configurations for Different Purposes

In some advanced setups, you might want different DNS servers for different interfaces. Talos applies the `machine.network.nameservers` globally, but you can influence DNS behavior per interface through DHCP:

```yaml
machine:
  network:
    interfaces:
      # Management interface - gets DNS from DHCP
      - interface: eth0
        dhcp: true
      # Storage interface - no DNS needed
      - interface: eth1
        addresses:
          - 10.10.0.20/24
    # Global DNS fallback
    nameservers:
      - 8.8.8.8
```

## Air-Gapped DNS

In air-gapped environments, you need internal DNS servers that can resolve the hostnames your cluster needs:

```yaml
machine:
  network:
    nameservers:
      - 10.0.0.2
```

Make sure your internal DNS server has entries for:
- Your container registry (if using a private registry)
- Your NTP servers (if using hostnames)
- Your log aggregation endpoint (if using a hostname)
- Any other services the Talos nodes need to reach

## Troubleshooting DNS Issues

**Image pull failures** - If pods cannot pull images with errors like "could not resolve host," check the machine DNS configuration. The node needs to resolve the registry hostname.

```bash
# Check if DNS is configured
talosctl get resolvers --nodes 192.168.1.10
```

**NTP sync failures** - If time sync fails and you use NTP hostnames, DNS might not be working. Try using IP addresses for NTP servers as a workaround.

**Slow DNS resolution** - If the first DNS server in the list is unreachable, queries will time out before falling back to the next server. This causes delays across the system. Remove unreachable servers from the list.

**DNS server order matters** - Put your fastest, most reliable DNS server first. The fallback servers are only used when the primary fails, and the failover takes time.

## Best Practices

Always configure at least two DNS nameservers for redundancy. A single DNS server is a single point of failure.

Put internal DNS servers before public ones. Internal queries to internal servers resolve faster and do not leak internal hostnames to the internet.

Test DNS resolution after configuring it. Do not assume it works just because the configuration was applied.

Keep your DNS configuration consistent across all nodes. If one node uses different DNS servers, it might behave differently from the rest of the cluster, leading to confusing issues.

## Conclusion

DNS configuration in Talos Linux is a simple but critical piece of your cluster setup. Set your nameservers in the machine config, verify they work, and make sure they can resolve all the hostnames your node needs. Remember that machine DNS and Kubernetes CoreDNS serve different purposes and are configured in different places. Get the machine DNS right, and CoreDNS will handle the rest for your workloads.
