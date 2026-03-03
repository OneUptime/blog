# How to Troubleshoot Network Connectivity in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Kubernetes, Troubleshooting, CNI

Description: A hands-on guide to diagnosing network connectivity problems in Talos Linux, covering host networking, CNI issues, and inter-node communication.

---

Network connectivity problems in Talos Linux can be particularly challenging to debug because Talos does not include traditional networking tools like `ping`, `traceroute`, or `netstat`. You cannot SSH into a Talos node and run diagnostics the way you would on Ubuntu or CentOS. Instead, you need to rely on `talosctl` and Kubernetes-level tooling to find and fix network issues.

This guide covers the common network problems you will encounter and the Talos-specific ways to diagnose them.

## Understanding Talos Networking

Talos Linux networking operates at two levels:

1. **Host-level networking** - Configured through the machine configuration, handles physical/virtual network interfaces, IP addresses, routes, and DNS
2. **Pod networking** - Managed by the CNI plugin (flannel by default), handles pod-to-pod and pod-to-service communication

Problems at either level can cause connectivity failures, and the troubleshooting approach differs for each.

## Diagnosing Host-Level Network Issues

Start by checking the basic network configuration on the node:

```bash
# Check network interfaces and their status
talosctl -n <node-ip> get links

# Check IP addresses assigned to interfaces
talosctl -n <node-ip> get addresses

# Check routing table
talosctl -n <node-ip> get routes

# Check DNS resolver configuration
talosctl -n <node-ip> get resolvers
```

If the node has no IP address or the wrong IP, check the machine configuration network section:

```yaml
machine:
  network:
    hostname: talos-worker-1
    interfaces:
      - interface: eth0
        dhcp: true
        # Or static:
        # addresses:
        #   - 192.168.1.100/24
        # routes:
        #   - network: 0.0.0.0/0
        #     gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

## Testing Connectivity Between Nodes

To verify that nodes can communicate with each other, check from the Kubernetes level:

```bash
# Check if all nodes are visible to the cluster
kubectl get nodes -o wide

# Check node internal IPs
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}'
```

You can also deploy a debug pod to test connectivity:

```bash
# Deploy a debug pod with networking tools
kubectl run netdebug --image=nicolaka/netshoot --restart=Never -- sleep 3600

# Use it to test connectivity
kubectl exec -it netdebug -- ping <other-node-ip>
kubectl exec -it netdebug -- traceroute <other-node-ip>
kubectl exec -it netdebug -- curl -k https://<api-server-ip>:6443/healthz
```

## Diagnosing Pod-to-Pod Connectivity

If pods on different nodes cannot communicate, the problem is likely with the CNI plugin. Talos ships with flannel as the default CNI.

```bash
# Check if flannel pods are running
kubectl -n kube-system get pods -l app=flannel

# Check flannel logs for errors
kubectl -n kube-system logs -l app=flannel --tail=50
```

Common flannel issues include:

- Interface misconfiguration (flannel cannot find the right interface)
- MTU mismatches between the overlay and the physical network
- Backend mode incompatibility

Check the flannel configuration:

```bash
# View the flannel ConfigMap
kubectl -n kube-system get configmap kube-flannel-cfg -o yaml
```

If flannel is not working, verify that the pod CIDR does not overlap with your node network:

```yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16    # Must not overlap with node network
    serviceSubnets:
      - 10.96.0.0/12     # Must not overlap with node or pod network
```

## Diagnosing Service Connectivity

If pods can communicate directly but services are not reachable, the issue may be with kube-proxy:

```bash
# Check kube-proxy pods
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# Check kube-proxy logs
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=50
```

Verify that service endpoints are being populated:

```bash
# Check endpoints for a specific service
kubectl get endpoints <service-name> -n <namespace>

# If endpoints are empty, the service selector may not match any pods
kubectl get pods -l <service-selector-labels> -n <namespace>
```

## MTU Issues

MTU mismatches are a sneaky source of network problems. Everything appears to work until you try to transfer larger packets, then connections hang or drop. This is common in cloud environments with encapsulation overhead.

Check the MTU on the node interfaces:

```bash
# Check interface details including MTU
talosctl -n <node-ip> get links -o yaml
```

If you are running in an environment with reduced MTU (like inside a VPN or with VXLAN overlay), configure it in the machine config:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1450  # Reduced from default 1500 for overlay overhead
```

Also configure the CNI to use the correct MTU:

```yaml
cluster:
  network:
    cni:
      name: flannel
```

## DNS Issues at the Host Level

Talos nodes need DNS resolution for things like pulling container images. If the node DNS is not working:

```bash
# Check DNS resolver configuration
talosctl -n <node-ip> get resolvers

# Check if DNS resolution works
talosctl -n <node-ip> get hostdnsconfig
```

Make sure the nameservers in your machine configuration are reachable:

```yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

## VLAN and Bond Configuration

If you are using VLANs or bonded interfaces, misconfigurations can prevent all network traffic:

```yaml
machine:
  network:
    interfaces:
      # Bond configuration
      - interface: bond0
        bond:
          mode: 802.3ad
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.100/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1

      # VLAN configuration
      - interface: eth0.100
        addresses:
          - 10.100.0.50/24
```

Check that the bond or VLAN is configured correctly:

```bash
# Verify bond status
talosctl -n <node-ip> get links | grep bond

# Verify VLAN interfaces
talosctl -n <node-ip> get links | grep vlan
```

## Packet Capture for Deep Debugging

When all else fails, you can capture packets on a Talos node using `talosctl pcap`:

```bash
# Capture packets on eth0 for 30 seconds
talosctl -n <node-ip> pcap --interface eth0 --duration 30s > capture.pcap

# Open the capture in Wireshark for analysis
wireshark capture.pcap
```

This is extremely useful for diagnosing subtle issues like TCP resets, TLS handshake failures, or routing problems that are not visible at the application level.

## Network Policy Interference

If you have deployed a network policy controller (like Calico or Cilium instead of flannel), network policies might be blocking traffic:

```bash
# List all network policies
kubectl get networkpolicies -A

# Check if a specific namespace has restrictive policies
kubectl get networkpolicies -n <namespace> -o yaml
```

A default-deny network policy will block all traffic unless explicit allow rules are in place. If you recently deployed a network policy and things stopped working, check the policy first.

## Summary

Network troubleshooting on Talos Linux requires a different approach than traditional Linux. Use `talosctl` to inspect host-level networking, deploy debug pods for application-level testing, and use `talosctl pcap` for deep packet analysis. Most network issues come down to incorrect interface configuration, CNI problems, or firewall rules blocking required ports.
