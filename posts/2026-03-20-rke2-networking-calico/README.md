# How to Configure RKE2 Networking with Calico - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Calico, CNI, Networking, BGP, Rancher

Description: Learn how to configure Calico as the CNI plugin for RKE2, including BGP routing, IP address management, and advanced network policies.

Calico is a high-performance networking solution that provides both pod networking and network policy enforcement for Kubernetes. Unlike Canal which uses Flannel for networking, pure Calico can use BGP for routing, making it ideal for environments that need native IP routing without overlay networks. This guide covers deploying and configuring Calico as the CNI in RKE2.

## Prerequisites

- RKE2 cluster (or being installed)
- Understanding of BGP routing (for BGP mode)
- Network infrastructure that supports BGP peering (for BGP mode)

## Step 1: Install RKE2 with Calico CNI

```yaml
# /etc/rancher/rke2/config.yaml - Use Calico as CNI

cni: calico

# Pod network CIDR
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
```

```bash
# Install RKE2 with Calico
curl -sfL https://get.rke2.io | sudo sh -

# The config must be in place before starting
sudo systemctl enable rke2-server
sudo systemctl start rke2-server
```

## Step 2: Verify Calico Installation

```bash
# Check Calico pods are running
kubectl get pods -n kube-system | grep calico

# Check Calico DaemonSet
kubectl get daemonset -n kube-system | grep calico

# Verify Calico node status
kubectl exec -n kube-system \
  $(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1) \
  -- calico-node --bird-ready

# Check Calico CRDs
kubectl get crd | grep projectcalico
```

## Step 3: Configure Calico IP Pools

Calico uses IP pools to define the CIDR ranges for pod IPs:

```yaml
# calico-ippool.yaml - Configure IP address allocation
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  # CIDR for pod IPs (must match cluster-cidr in RKE2 config)
  cidr: 10.42.0.0/16

  # Encapsulation mode
  # ipipMode options: Always, CrossSubnet, Never
  # vxlanMode options: Always, CrossSubnet, Never
  ipipMode: CrossSubnet  # Use IPIP only for cross-subnet traffic
  vxlanMode: Never

  # Disable NAT for outgoing traffic (BGP mode)
  natOutgoing: true

  # Allow scheduling on all nodes
  nodeSelector: all()

  # Block size for per-node CIDR allocation
  blockSize: 26  # /26 per node = 64 IPs per node
```

## Step 4: Configure BGP Peering

For environments with BGP-capable routers, configure Calico to use BGP:

```yaml
# bgp-config.yaml - Configure global BGP settings
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Local AS number for the cluster
  asNumber: 64512

  # Announce service IPs via BGP
  serviceClusterIPs:
  - cidr: 10.43.0.0/16

  serviceLoadBalancerIPs:
  - cidr: 10.0.100.0/24
---
# bgp-peer.yaml - Configure BGP peer (router/spine switch)
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: spine-router-1
spec:
  # Remote BGP peer IP
  peerIP: 10.0.0.1

  # Remote AS number
  asNumber: 64500

  # Optional: Only peer with specific nodes
  # nodeSelector: "rack == rack1"
```

## Step 5: Configure Advanced Network Policies

Calico supports GlobalNetworkPolicy for cluster-wide rules beyond standard Kubernetes NetworkPolicy:

```yaml
# global-deny-all.yaml - Deny all traffic by default
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  # Apply to all pods
  selector: all()
  types:
  - Ingress
  - Egress

  # Only allow DNS egress by default
  egress:
  - action: Allow
    protocol: UDP
    destination:
      nets: []
      ports: [53]
  - action: Allow
    protocol: TCP
    destination:
      ports: [53]
---
# allow-kube-system.yaml - Allow kube-system communications
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-kube-system
spec:
  selector: all()
  ingress:
  - action: Allow
    source:
      namespaceSelector: kubernetes.io/metadata.name == "kube-system"
  egress:
  - action: Allow
    destination:
      namespaceSelector: kubernetes.io/metadata.name == "kube-system"
```

## Step 6: Configure Calico for High Performance

```yaml
# HelmChartConfig to tune Calico performance
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-calico
  namespace: kube-system
spec:
  valuesContent: |-
    calico:
      # Enable eBPF dataplane for high performance
      # Requires kernel 5.3+
      # bpfEnabled: true

      # MTU configuration
      # Set to network MTU minus 20 bytes for IPIP
      # or minus 50 for VXLAN
      mtu: "1480"

      # Felix configuration
      felixConfiguration:
        # BPF logging level
        bpfLogLevel: "Off"
        # Health check port
        healthPort: 9099
```

## Step 7: Monitor Calico Network Health

```bash
# Check the health of all Calico nodes
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Use calicoctl for detailed status
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.26.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl

export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Check node status
calicoctl node status

# Check BGP peers
calicoctl get bgppeers

# Check IP pools
calicoctl get ippools -o wide

# Check workload endpoints
calicoctl get workloadendpoints -A | head -20
```

## Conclusion

Calico as the RKE2 CNI provides superior networking performance and policy capabilities compared to Canal, especially in environments where BGP routing is available. The ability to use BGP for pod routing eliminates the overhead of overlay networks, resulting in near-native network performance. For organizations requiring advanced network policies, GlobalNetworkPolicy provides capabilities that go beyond standard Kubernetes NetworkPolicy. Consider Calico when you need fine-grained network control, high throughput requirements, or integration with existing BGP network infrastructure.
