# Tune Calico on Self-Managed AWS Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, AWS, Self-Managed

Description: A comprehensive guide to tuning Calico networking on self-managed Kubernetes clusters running on AWS EC2, covering VPC-aware IPAM, MTU optimization, and BGP configurations for production readiness.

---

## Introduction

Running Calico on self-managed Kubernetes clusters on AWS EC2 gives you full control over networking configuration - but also full responsibility for tuning it. Unlike EKS with managed node groups, self-managed clusters require you to explicitly configure Calico to work optimally within the AWS VPC networking model.

Current-generation AWS EC2 instances support jumbo frames with an MTU of 9001 bytes. Calico can leverage these large MTUs to improve throughput when properly configured, but the usable MTU still depends on the full path traffic takes. Additionally, Calico can run without VXLAN or IPIP overlays only when the underlying AWS network has routes for the pod CIDRs.

This guide covers the key tuning areas for running Calico in production on AWS: MTU optimization for EC2 jumbo frames, cross-AZ traffic routing, IPAM configuration, and Felix performance parameters.

## Prerequisites

- Self-managed Kubernetes cluster on AWS EC2 (kubeadm, kops, or similar)
- Calico v3.x installed
- `calicoctl` v3.x configured against the cluster
- IAM permissions to modify EC2 security groups if needed
- `kubectl` with cluster-admin access

## Step 1: Configure MTU for EC2 Jumbo Frames

AWS EC2 instances within a VPC support MTU up to 9001 bytes. Configuring Calico to use jumbo frames significantly improves throughput for large data transfers.

```bash
# Check the current MTU on EC2 instance network interfaces

ip link show eth0

# For operator installs, set the Calico network MTU.
# VXLAN overhead is 50 bytes, so use 8951 for AWS jumbo-frame paths.
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":8951}}}'

# For manifest-based installs, patch calico-config instead and restart calico-node.
kubectl patch configmap/calico-config -n kube-system --type merge \
  -p '{"data":{"veth_mtu":"8951"}}'
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 2: Configure Direct Routing via VPC Route Tables

For clusters where pod CIDRs are explicitly routed in the VPC, configure Calico to use direct routing instead of an overlay, reducing encapsulation overhead. This is not automatic with Calico CNI on AWS: VPC route tables must route pod CIDR blocks to the node ENIs, and EC2 source/destination checks must be disabled for nodes that forward pod traffic.

```yaml
# Configure IP pool with no overlay for same-VPC direct routing
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: aws-direct-pool
spec:
  cidr: 192.168.0.0/16
  # Disable both overlay modes for direct VPC routing
  ipipMode: Never
  vxlanMode: Never
  # Disable SNAT when the VPC and downstream networks route pod CIDRs back.
  natOutgoing: false
  # Route pod CIDRs directly via VPC route tables and node ENIs
  nodeSelector: all()
```

Ensure VPC route tables have routes for each pod CIDR block pointing to the respective node ENI. If return paths outside the VPC do not know the pod CIDR, keep `natOutgoing: true` for those egress paths.

## Step 3: Optimize Cross-AZ Traffic

Cross-AZ traffic incurs additional cost and latency. Calico does not choose a cheaper route between replicas based on availability zone labels, but you can use Calico IP pools with node selectors to allocate per-AZ pod CIDR blocks. This makes VPC routes and flow logs easier to reason about and lets you align scheduling or service topology controls with the pod ranges.

```yaml
# Example AZ-specific pool
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: aws-use1a-pool
spec:
  cidr: 192.168.0.0/18
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: false
  nodeSelector: "topology.kubernetes.io/zone == 'us-east-1a'"
```

Label nodes with their AWS availability zone for IPAM pool selection:

```bash
# Apply AZ labels to nodes (typically set automatically by cloud-controller-manager)
kubectl label node <node-name> topology.kubernetes.io/zone=us-east-1a
```

## Step 4: Tune Felix for AWS Scale

Production AWS clusters often run hundreds of pods per node. Tune Felix to handle this scale efficiently.

```bash
# Apply Felix configuration for large iptables-based clusters
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesRefreshInterval": "3m",
    "routeRefreshInterval": "90s",
    "ipv6Support": false
  }
}'
```

## Step 5: Configure BGP for Multi-AZ Clusters

For clusters with large BGP meshes, configure BGP route reflectors to avoid full-mesh overhead. Route reflectors are a scaling feature for Calico BGP sessions; they do not replace AWS VPC route table configuration when you need pod CIDRs to be routable by the VPC.

```yaml
# Configure nodes to peer with route reflector nodes
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-route-reflectors
spec:
  nodeSelector: all()
  peerSelector: route-reflector == 'true'
```

## Best Practices

- Use AWS jumbo-frame MTU values only on paths that support them; Calico documents 8951 for IPv4 VXLAN over AWS jumbo frames
- Disable NAT outgoing only when pod CIDRs are routed directly and return traffic can reach those pod CIDRs
- Use AZ-specific IP pools to assign pods in the same AZ similar IP blocks
- Monitor `felix_int_dataplane_failures_total` Prometheus metric for dataplane errors
- Configure EC2 security groups to allow BGP (TCP 179) between nodes if using BGP mode
- Use spot instances only in node groups where pods can tolerate interruption

## Conclusion

Tuning Calico on self-managed AWS Kubernetes unlocks significant performance advantages over default configurations. By leveraging EC2 jumbo frames, configuring direct VPC routing, and optimizing Felix for scale, you can build a high-performance network layer that meets production SLAs and minimizes cross-AZ networking costs.
