# How to Configure IPv6 on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, IPv6, Networking, Kubernetes, Linux Networking

Description: Step-by-step guide to enabling and configuring IPv6 networking on Talos Linux nodes for both host-level and Kubernetes pod networking.

---

IPv6 adoption continues to grow, and if you are running Talos Linux clusters in environments that require IPv6 connectivity, you need to know how to configure it properly. Talos Linux supports IPv6 out of the box, but getting it working correctly for both host-level networking and Kubernetes pod networking takes some deliberate configuration.

This guide walks through everything you need to set up IPv6 on your Talos Linux nodes, from basic interface configuration to ensuring your Kubernetes workloads can communicate over IPv6.

## Why IPv6 on Talos Linux?

There are several reasons you might want to run IPv6 on your Talos Linux cluster:

- Your data center or cloud provider requires or strongly prefers IPv6
- You are running out of private IPv4 address space in large deployments
- You need end-to-end IPv6 connectivity for certain applications
- Regulatory or compliance requirements mandate IPv6 support
- You want to future-proof your infrastructure

Talos Linux handles IPv6 through the same declarative machine configuration model used for IPv4, making it relatively straightforward to set up.

## Configuring Static IPv6 Addresses

To assign a static IPv6 address to a Talos Linux node, update the machine configuration's network section:

```yaml
# Static IPv6 configuration in machine config
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 2001:db8:1::10/64    # Static IPv6 address
          - 192.168.1.10/24       # You can also keep IPv4 alongside
        routes:
          - network: ::/0          # IPv6 default route
            gateway: 2001:db8:1::1
          - network: 0.0.0.0/0    # IPv4 default route
            gateway: 192.168.1.1
```

Apply this configuration using talosctl:

```bash
# Apply the updated machine config
talosctl -n <node-ip> apply-config --file machine-config.yaml

# Verify the IPv6 address was assigned
talosctl -n <node-ip> get addresses

# Check that the IPv6 route is in the routing table
talosctl -n <node-ip> get routes | grep "::"
```

## Configuring IPv6 via SLAAC

If your network supports Stateless Address Autoconfiguration (SLAAC), Talos Linux can pick up IPv6 addresses from router advertisements. To enable this, you configure the interface without a static IPv6 address but with IPv6 enabled:

```yaml
# Enable SLAAC on an interface
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true          # This handles IPv4 DHCP
        # IPv6 SLAAC is handled by accepting router advertisements
```

By default, Talos Linux accepts router advertisements on interfaces. If you want to be explicit about it, you can control this behavior:

```yaml
# Explicit SLAAC configuration
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
  # Kernel sysctl to accept router advertisements
  sysctls:
    net.ipv6.conf.eth0.accept_ra: "1"
    net.ipv6.conf.eth0.autoconf: "1"
```

## Configuring DHCPv6

For environments that use DHCPv6 for address assignment, configure it in the machine config:

```yaml
# DHCPv6 configuration
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true           # IPv4 DHCP
        dhcpOptions:
          ipv6: true         # Enable DHCPv6
```

Verify that DHCPv6 is working:

```bash
# Check DHCPv6 client status
talosctl -n <node-ip> logs networkd | grep -i dhcpv6

# Verify IPv6 address was obtained
talosctl -n <node-ip> get addresses | grep "2[0-9a-f]"
```

## Setting Up IPv6 DNS Resolvers

Do not forget to configure IPv6 DNS resolvers if your DNS infrastructure supports them:

```yaml
# Configure IPv6 nameservers
machine:
  network:
    nameservers:
      - 2001:4860:4860::8888    # Google Public DNS IPv6
      - 2001:4860:4860::8844
      - 8.8.8.8                  # Keep IPv4 DNS as fallback
```

Verify DNS resolution works over IPv6:

```bash
# Check configured resolvers
talosctl -n <node-ip> get resolvers

# Test DNS resolution
talosctl -n <node-ip> read /etc/resolv.conf
```

## Configuring Kubernetes for IPv6

Getting IPv6 on the host is only half the story. You also need to configure Kubernetes to use IPv6 for pod and service networking.

### Setting Up IPv6 Pod CIDR

Update your cluster configuration to specify an IPv6 pod CIDR:

```yaml
# Cluster configuration for IPv6 pod networking
cluster:
  network:
    podSubnets:
      - 2001:db8:pod::/48       # IPv6 pod CIDR
    serviceSubnets:
      - 2001:db8:svc::/112      # IPv6 service CIDR
    cni:
      name: custom              # You will likely need a custom CNI for IPv6
```

### Configuring the CNI for IPv6

If you are using Flannel (the default CNI in Talos), note that Flannel has limited IPv6 support. For full IPv6 pod networking, consider using Cilium or Calico instead.

Here is an example of configuring Cilium with IPv6:

```yaml
# Cilium Helm values for IPv6 support
ipv6:
  enabled: true
ipam:
  mode: kubernetes
  operator:
    clusterPoolIPv6PodCIDRList:
      - 2001:db8:pod::/48
    clusterPoolIPv6MaskSize: 120
```

## Verifying IPv6 Connectivity

Once everything is configured, run through these verification steps:

```bash
# Check that the node has IPv6 addresses
talosctl -n <node-ip> get addresses | grep -i "inet6\|2[0-9a-f]"

# Verify IPv6 routes exist
talosctl -n <node-ip> get routes | grep "::"

# Check that pods got IPv6 addresses
kubectl get pods -o wide --all-namespaces | head -20

# Test IPv6 connectivity from a pod
kubectl run test-ipv6 --rm -it --image=busybox -- ping6 -c 4 2001:4860:4860::8888
```

## Common IPv6 Configuration Issues

### Link-Local Addresses Not Appearing

Every interface should have a link-local IPv6 address (starting with fe80::) even without any explicit configuration. If these are missing, IPv6 might be disabled at the kernel level:

```bash
# Check if IPv6 is enabled
talosctl -n <node-ip> read /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should return "0" (IPv6 enabled)

# If IPv6 is disabled, enable it via sysctls
```

```yaml
# Enable IPv6 in machine config
machine:
  sysctls:
    net.ipv6.conf.all.disable_ipv6: "0"
    net.ipv6.conf.default.disable_ipv6: "0"
```

### Neighbor Discovery Issues

If you can ping local addresses but not remote ones, check for neighbor discovery problems:

```bash
# Check the IPv6 neighbor table
talosctl -n <node-ip> get neighbors | grep "2[0-9a-f]"

# Look for ND-related kernel messages
talosctl -n <node-ip> dmesg | grep -i "neigh\|nd\|icmpv6"
```

### Router Advertisement Problems

If SLAAC is not working, verify that router advertisements are being received:

```bash
# Check for RA acceptance settings
talosctl -n <node-ip> read /proc/sys/net/ipv6/conf/eth0/accept_ra

# Capture router advertisements with packet capture
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "icmp6 and ip6[40] == 134" --duration 60s -o ra.pcap
```

## IPv6 Privacy Extensions

For security, you might want to enable IPv6 privacy extensions which generate temporary addresses:

```yaml
# Enable IPv6 privacy extensions
machine:
  sysctls:
    net.ipv6.conf.all.use_tempaddr: "2"
    net.ipv6.conf.default.use_tempaddr: "2"
```

## Conclusion

Configuring IPv6 on Talos Linux is well-supported but requires attention to detail across multiple layers - host networking, DNS, Kubernetes pod networking, and CNI configuration. Start with host-level IPv6 to make sure your nodes have proper connectivity, then work your way up to Kubernetes networking. If you need full IPv6 pod networking, plan on using a CNI like Cilium or Calico that has mature IPv6 support rather than relying on Flannel. Test thoroughly at each layer before moving to the next, and use talosctl's diagnostic commands to verify everything is working as expected.
