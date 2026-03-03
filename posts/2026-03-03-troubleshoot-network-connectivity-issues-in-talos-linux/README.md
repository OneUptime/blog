# How to Troubleshoot Network Connectivity Issues in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Troubleshooting, Kubernetes, Linux Networking

Description: A practical guide to diagnosing and fixing common network connectivity issues in Talos Linux clusters using talosctl and system resources.

---

Network connectivity problems in Talos Linux can be frustrating because you do not have traditional shell access to debug things the way you would on a standard Linux distribution. There is no SSH, no bash, and no package manager to install tcpdump on the fly. But Talos provides its own set of tools through `talosctl` that give you everything you need to track down and fix networking issues.

This guide covers the most common network connectivity problems in Talos Linux and walks through practical troubleshooting steps for each one.

## Understanding the Talos Networking Stack

Before diving into troubleshooting, it helps to understand how Talos Linux handles networking. Talos uses a declarative networking model where all network configuration is specified in the machine configuration file. The `networkd` service processes this configuration and applies it at boot time.

Key components in the Talos networking stack include:

- **networkd**: Manages interfaces, addresses, routes, and DNS
- **containerd**: Handles container networking for system services
- **CNI plugin**: Manages pod networking (Flannel by default)
- **kube-proxy or its replacement**: Handles service networking

## Step 1: Check Basic Interface Status

Start by verifying that your network interfaces are up and have the correct addresses:

```bash
# List all network interfaces
talosctl -n <node-ip> get links

# Check IP addresses assigned to interfaces
talosctl -n <node-ip> get addresses

# View the routing table
talosctl -n <node-ip> get routes
```

Look for interfaces that should be up but are showing as down. Check that the IP addresses match what you expect from your machine configuration.

```bash
# Get detailed interface information
talosctl -n <node-ip> get links eth0 -o yaml

# Check for link carrier detection
talosctl -n <node-ip> get links eth0 -o yaml | grep -i carrier
```

## Step 2: Verify DNS Resolution

DNS issues are one of the most common causes of connectivity problems. Talos Linux uses its own DNS resolver for host-level resolution:

```bash
# Check configured DNS resolvers
talosctl -n <node-ip> get resolvers

# Verify DNS resolution is working
talosctl -n <node-ip> get hostdns

# Check the actual resolve configuration
talosctl -n <node-ip> read /etc/resolv.conf
```

If DNS is not resolving properly, check that your upstream DNS servers are reachable:

```bash
# Test connectivity to DNS servers
talosctl -n <node-ip> netstat | grep :53

# Check for DNS-related errors in system logs
talosctl -n <node-ip> logs networkd | grep -i dns
```

## Step 3: Test Connectivity Between Nodes

If individual nodes have network access but cannot communicate with each other, the problem is likely in your cluster networking setup:

```bash
# Check if the node can reach other control plane nodes
talosctl -n <node-ip> get members

# Verify etcd cluster connectivity
talosctl -n <node-ip> get etcdmembers

# Check the Kubernetes node status
talosctl -n <node-ip> get nodestatus
```

For pod-to-pod networking issues, examine the CNI plugin:

```bash
# Check CNI pod status (example for Flannel)
kubectl get pods -n kube-flannel -o wide

# Look at CNI logs for errors
kubectl logs -n kube-flannel -l app=flannel --tail=50
```

## Step 4: Examine Network Configuration

Sometimes the issue is a misconfiguration in the machine config. Review the applied configuration:

```bash
# Dump the current machine configuration
talosctl -n <node-ip> get machineconfig -o yaml

# Check the network section specifically
talosctl -n <node-ip> get machineconfig -o yaml | grep -A 50 "network:"
```

Common configuration mistakes include:

- Wrong subnet mask on interface addresses
- Missing or incorrect default gateway
- Conflicting interface names
- DHCP not working because the wrong interface was specified

```yaml
# Example of a correct network configuration
machine:
  network:
    hostname: worker-01
    interfaces:
      - interface: eth0
        dhcp: true
        # Or use static addressing
        # addresses:
        #   - 192.168.1.100/24
        # routes:
        #   - network: 0.0.0.0/0
        #     gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

## Step 5: Check Firewall and Packet Filtering

Talos Linux applies certain packet filtering rules by default. If you suspect traffic is being dropped, check the nftables rules:

```bash
# View current nftables rules
talosctl -n <node-ip> get nftableschain

# Check for dropped packets in kernel logs
talosctl -n <node-ip> dmesg | grep -i drop

# Look for connection tracking issues
talosctl -n <node-ip> dmesg | grep conntrack
```

## Step 6: Investigate DHCP Issues

If your node uses DHCP and is not getting an address, walk through these checks:

```bash
# Check DHCP client status
talosctl -n <node-ip> get dhcpclientstatus

# Look for DHCP-related logs
talosctl -n <node-ip> logs networkd | grep -i dhcp

# Verify the correct interface is configured for DHCP
talosctl -n <node-ip> get machineconfig -o yaml | grep -B 2 -A 5 dhcp
```

DHCP problems often come down to the interface name being different than expected. Talos names interfaces based on the kernel driver, so `eth0` on one machine might be `enp0s3` on another. Check what interfaces are actually present:

```bash
# List all available interfaces and their driver names
talosctl -n <node-ip> get links -o yaml
```

## Step 7: Debug Service-Level Connectivity

For Kubernetes service connectivity problems, the issue is often with kube-proxy or the service CIDR configuration:

```bash
# Check kube-proxy status
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Look at kube-proxy logs for issues
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# Verify service CIDR does not overlap with node or pod CIDRs
talosctl -n <node-ip> get machineconfig -o yaml | grep -i cidr
```

## Step 8: Check for MTU Mismatches

MTU mismatches can cause subtle connectivity issues where small packets work fine but larger transfers fail or are extremely slow:

```bash
# Check MTU on all interfaces
talosctl -n <node-ip> get links -o yaml | grep -i mtu

# Verify CNI MTU matches the physical interface MTU (minus overhead)
kubectl get configmap -n kube-flannel kube-flannel-cfg -o yaml | grep -i mtu
```

If you are running on a cloud provider or inside VMs with overlay networking, you may need to reduce the MTU to account for encapsulation overhead:

```yaml
# Adjust MTU in machine config
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1450  # Reduced for VXLAN overlay
```

## Step 9: Examine Kernel Network Parameters

Talos allows you to set sysctl parameters that affect networking:

```bash
# Check current sysctl values
talosctl -n <node-ip> read /proc/sys/net/ipv4/ip_forward
talosctl -n <node-ip> read /proc/sys/net/ipv4/conf/all/rp_filter

# Look for network-related kernel messages
talosctl -n <node-ip> dmesg | grep -i "net\|eth\|link"
```

Important sysctl values for Kubernetes networking:

```yaml
# Machine config sysctl settings
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.bridge.bridge-nf-call-iptables: "1"
    net.bridge.bridge-nf-call-ip6tables: "1"
```

## Step 10: Using Packet Capture

When all else fails, you can capture packets on a Talos node using the `talosctl pcap` command:

```bash
# Capture packets on eth0
talosctl -n <node-ip> pcap --interface eth0 --duration 30s -o capture.pcap

# Capture only specific traffic
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "port 6443" -o api-traffic.pcap

# Analyze the capture with Wireshark or tcpdump on your local machine
tcpdump -r capture.pcap -nn
```

This is your most powerful debugging tool. It lets you see exactly what traffic is flowing through the interface, what is being dropped, and where connections are failing.

## Conclusion

Troubleshooting network issues in Talos Linux requires a different approach than traditional Linux distributions, but the tools available through talosctl are surprisingly capable. Start with the basics - interface status, IP addresses, and routes - and work your way up through DNS, CNI, and service networking. The `talosctl pcap` command is your best friend when you need to get down to the packet level. Most network issues in Talos boil down to either a machine configuration error or a CNI plugin problem, so those are usually the best places to focus your investigation.
