# Configure IPv6 Control Plane with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv6, Networking, CNI

Description: Learn how to configure an IPv6 control plane in Kubernetes using Calico, enabling dual-stack or pure IPv6 cluster networking for modern infrastructure requirements.

---

## Introduction

IPv6 adoption in Kubernetes clusters is accelerating as organizations exhaust IPv4 address space and embrace next-generation networking standards. Calico provides robust support for IPv6 control planes, enabling you to run pods, services, and node communication entirely over IPv6 or in a dual-stack configuration.

Configuring an IPv6 control plane requires coordinating changes across the Kubernetes API server, kubelet, kube-controller-manager, and Calico itself. Each component must be instructed to advertise and accept IPv6 CIDRs, and Calico's IP pool must be configured with an appropriate IPv6 prefix.

This guide walks through enabling IPv6 in Calico's control plane, configuring IP pools with IPv6 ranges, and validating end-to-end IPv6 connectivity across your cluster nodes and pods.

## Prerequisites

- Kubernetes cluster (v1.24+) with nodes that have IPv6 addresses
- Calico v3.25+ installed
- `calicoctl` CLI installed and configured
- Node OS with IPv6 kernel support enabled (`sysctl net.ipv6.conf.all.forwarding=1`)
- Kubernetes API server configured with `--service-cluster-ip-range` including an IPv6 range

## Step 1: Enable IPv6 Forwarding on All Nodes

Before configuring Calico, ensure IPv6 forwarding is enabled on every node in your cluster.

```bash
# Enable IPv6 forwarding on the current node (run on each node)
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Make the setting persistent across reboots
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
sudo sysctl -p /etc/sysctl.d/99-ipv6.conf
```

## Step 2: Configure Calico FelixConfiguration for IPv6

Update Calico's FelixConfiguration to enable IPv6 dataplane support.

```yaml
# felix-ipv6.yaml - FelixConfiguration enabling IPv6 in the dataplane
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Enable IPv6 support in the Felix dataplane agent
  ipv6Support: true
  # Use iptables backend compatible with IPv6 (ip6tables)
  iptablesBackend: Auto
```

Apply the configuration using `calicoctl`:

```bash
# Apply FelixConfiguration with calicoctl
calicoctl apply -f felix-ipv6.yaml
```

## Step 3: Create an IPv6 IP Pool

Define an IPv6 IP pool that Calico will use to assign addresses to pods.

```yaml
# ippool-ipv6.yaml - IPv6 IP pool for pod address assignment
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv6-ippool
spec:
  # Use an IPv6 CIDR; choose a range appropriate for your environment
  cidr: fd00:10:244::/48
  # Enable BGP route advertisement for this pool
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  # Disable if you don't want this pool used for new allocations
  disabled: false
  # Node selector; use "all()" to apply to all nodes
  nodeSelector: all()
```

```bash
# Create the IPv6 IP pool
calicoctl create -f ippool-ipv6.yaml

# Verify the pool was created
calicoctl get ippools -o wide
```

## Step 4: Validate IPv6 Connectivity

Deploy a test pod and verify it receives an IPv6 address and can reach other pods.

```bash
# Deploy a simple test pod
kubectl run ipv6-test --image=nicolaka/netshoot --restart=Never -- sleep 3600

# Check the pod's IP addresses (should show an IPv6 address)
kubectl get pod ipv6-test -o jsonpath='{.status.podIPs}'

# Test IPv6 connectivity from within the pod
kubectl exec ipv6-test -- ping6 -c 3 fd00:10:244::1
```

## Best Practices

- Always test IPv6 connectivity between nodes before enabling Calico's IPv6 pool
- Use `/48` or `/64` prefixes for pod CIDRs to allow sufficient address space per node
- Enable dual-stack (IPv4 + IPv6) if you need backward compatibility with IPv4-only services
- Monitor `calicoctl node status` after enabling IPv6 to verify BGP sessions establish correctly
- Ensure your CNI configuration file (usually in `/etc/cni/net.d/`) references IPv6 settings

## Conclusion

Enabling an IPv6 control plane with Calico requires coordinated changes to both Kubernetes and Calico configuration. By enabling IPv6 forwarding, configuring FelixConfiguration, and creating an IPv6 IP pool, your cluster can assign and route IPv6 addresses natively. This foundation supports modern, scalable infrastructure and prepares your cluster for a fully IPv6-native future.
