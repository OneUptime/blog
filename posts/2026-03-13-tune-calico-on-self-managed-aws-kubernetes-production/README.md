# Tune Calico on Self-Managed AWS Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, aws, kubernetes, networking, production, performance-tuning, ec2

Description: A comprehensive guide to tuning Calico networking on self-managed Kubernetes clusters running on AWS EC2, covering VPC-aware IPAM, MTU optimization, and BGP configurations for production readiness.

---

## Introduction

Running Calico on self-managed Kubernetes clusters on AWS EC2 gives you full control over networking configuration — but also full responsibility for tuning it. Unlike EKS with managed node groups, self-managed clusters require you to explicitly configure Calico to work optimally within the AWS VPC networking model.

AWS EC2 instances communicate over Elastic Network Interfaces (ENIs) with a default network MTU of 9001 bytes (jumbo frames) within a VPC. Calico can leverage these large MTUs to dramatically improve throughput when properly configured. Additionally, AWS VPC routing can be used in place of VXLAN or IPIP overlays when pod CIDRs are advertised via BGP.

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

# Set Felix vethMTU to match EC2 jumbo frame MTU for VXLAN
# VXLAN overhead is 50 bytes, so use 8951 for jumbo-frame VPCs
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"vethMTU": 8951}}'
```

## Step 2: Configure Direct Routing via VPC Route Tables

For clusters where all nodes are in the same VPC, configure Calico to use direct routing instead of an overlay, reducing encapsulation overhead.

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
  natOutgoing: true
  # Route pod CIDRs directly via EC2 instance routing
  nodeSelector: all()
```

Ensure VPC route tables have routes for the pod CIDR pointing to respective EC2 instances.

## Step 3: Optimize Cross-AZ Traffic

Cross-AZ traffic incurs additional cost and latency. Configure Calico to prefer within-AZ routing using topology hints.

```bash
# Set Felix to use node zone labels for route optimization
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "routeSource": "WorkloadIPs",
    "useInternalDataplaneDriver": false,
    "iptablesRefreshInterval": "90s"
  }
}'
```

Label nodes with their AWS availability zone for IPAM topology awareness:

```bash
# Apply AZ labels to nodes (typically set automatically by cloud-controller-manager)
kubectl label node <node-name> topology.kubernetes.io/zone=us-east-1a
```

## Step 4: Tune Felix for AWS Scale

Production AWS clusters often run hundreds of pods per node. Tune Felix to handle this scale efficiently.

```bash
# Apply high-throughput Felix configuration
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesMarkMask": "0xffff0000",
    "maxIpsetSize": 1048576,
    "routeRefreshInterval": "90s",
    "ipv6Support": false,
    "bpfEnabled": false
  }
}'
```

## Step 5: Configure BGP for Multi-AZ Clusters

For clusters spanning multiple AZs, configure BGP route reflectors to avoid full-mesh overhead.

```yaml
# Configure a BGP peer pointing to a route reflector
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: aws-route-reflector
spec:
  # IP of the route reflector node in the VPC
  peerIP: 10.0.1.10
  asNumber: 64512
  # Only peer with nodes in the same AZ to reduce cross-AZ BGP traffic
  nodeSelector: "topology.kubernetes.io/zone == 'us-east-1a'"
```

## Best Practices

- Enable jumbo frames (MTU 9001) on EC2 instances and set Calico vethMTU accordingly
- Disable NAT outgoing when pod CIDRs are routed directly in the VPC
- Use topology-aware IPAM to assign pods in the same AZ similar IP blocks
- Monitor `felix_int_dataplane_failures_total` Prometheus metric for dataplane errors
- Configure EC2 security groups to allow BGP (TCP 179) between nodes if using BGP mode
- Use spot instances only in node groups where pods can tolerate interruption

## Conclusion

Tuning Calico on self-managed AWS Kubernetes unlocks significant performance advantages over default configurations. By leveraging EC2 jumbo frames, configuring direct VPC routing, and optimizing Felix for scale, you can build a high-performance network layer that meets production SLAs and minimizes cross-AZ networking costs.
