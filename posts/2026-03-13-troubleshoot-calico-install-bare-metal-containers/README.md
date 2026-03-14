# How to Troubleshoot Installation Issues with Calico on Bare Metal with Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Troubleshooting

Description: A diagnostic guide for resolving Calico installation failures on bare metal Kubernetes clusters running containerized workloads.

---

## Introduction

Bare metal Kubernetes clusters introduce hardware-level failure modes that cloud environments abstract away. Calico installation issues on bare metal often trace back to network interface selection problems, kernel module availability, firewall rules on physical switches blocking BGP traffic, and container runtime socket permission issues. Diagnosing these requires working across multiple layers: Kubernetes, Calico, the container runtime, and the Linux networking stack.

Unlike cloud environments where the network is largely managed, bare metal requires you to verify every component. The good news is that you have full access to all logs and the underlying OS, making diagnosis more thorough even if it takes more steps.

This guide covers the most common Calico installation failures on bare metal with containers and how to resolve them.

## Prerequisites

- Calico partially or fully installed on a bare metal Kubernetes cluster
- Cluster admin `kubectl` access
- SSH access to all nodes
- `calicoctl` installed

## Step 1: Check Calico Pod Status

```bash
kubectl get pods -n calico-system
kubectl get pods -n tigera-operator
kubectl describe pod -n calico-system -l k8s-app=calico-node | tail -30
```

## Step 2: Examine calico-node Logs

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=60
```

Common bare metal specific errors:
- `Failed to find interface matching` — Calico cannot identify the correct NIC
- `Operation not permitted` — kernel module not loaded or permission issue
- `Address family not supported` — IPv6 kernel support missing

## Step 3: Fix NIC Selection

On bare metal servers with bonded NICs, VLAN interfaces, or multiple physical ports, Calico may pick the wrong interface.

```bash
# List all interfaces on a node
ip link show
ip addr show

# Fix the interface selection
kubectl set env ds/calico-node -n calico-system \
  IP_AUTODETECTION_METHOD=interface=bond0
```

## Step 4: Check Kernel Modules

Calico requires specific kernel modules depending on the dataplane:

```bash
# For IPIP encapsulation
modprobe ipip
lsmod | grep ipip

# For VXLAN encapsulation
modprobe vxlan
lsmod | grep vxlan

# For eBPF
uname -r  # Must be 5.3+
```

Add modules to load at boot:

```bash
echo "ipip" >> /etc/modules-load.d/calico.conf
echo "vxlan" >> /etc/modules-load.d/calico.conf
```

## Step 5: Verify Container Runtime Integration

```bash
# Check containerd socket
ls -la /run/containerd/containerd.sock

# Check CRI-O socket
ls -la /var/run/crio/crio.sock

# Verify CNI plugins are installed
ls /opt/cni/bin/
```

## Step 6: Inspect iptables

If BGP is not working, check that iptables is not blocking port 179.

```bash
iptables -L INPUT -n -v | grep 179
iptables -A INPUT -p tcp --dport 179 -j ACCEPT
iptables -A OUTPUT -p tcp --sport 179 -j ACCEPT
```

## Conclusion

Troubleshooting Calico on bare metal with containers requires checking pod logs for NIC selection errors, verifying kernel modules are loaded, confirming the container runtime socket is accessible, and ensuring firewall rules allow BGP traffic. These hardware-level checks are unique to bare metal environments and are the first places to look when standard cloud troubleshooting steps do not resolve the issue.
