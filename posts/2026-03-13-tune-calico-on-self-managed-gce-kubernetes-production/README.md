# Tune Calico on Self-Managed GCE Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, gce, gcp, kubernetes, networking, production, performance-tuning

Description: Learn how to tune Calico networking on self-managed Kubernetes clusters running on Google Compute Engine, leveraging GCE's network capabilities for optimal production performance.

---

## Introduction

Google Compute Engine provides a high-performance global network with features like jumbo frames and custom routing that Calico can leverage for excellent Kubernetes networking. Self-managed Kubernetes clusters on GCE have the flexibility to configure Calico optimally for the GCE network model, which differs significantly from AWS and Azure.

GCE's software-defined network supports custom routes at the VPC level, making it possible to configure Calico without any overlay encapsulation by advertising pod CIDRs directly to the GCE VPC routing table. This native routing approach eliminates VXLAN or IPIP overhead and maximizes throughput for inter-node pod traffic.

This guide covers GCE-specific Calico tuning, including native routing configuration, MTU optimization for GCE's 8896-byte jumbo frame support, IPAM topology awareness, and Felix parameters suited to GCE's networking characteristics.

## Prerequisites

- Self-managed Kubernetes cluster on GCE instances (kubeadm, kops, or GKE-compatible tooling)
- Calico v3.x installed
- `calicoctl` v3.x configured
- `gcloud` CLI with compute.admin permissions
- `kubectl` with cluster-admin access
- GCE network configured with custom route support enabled

## Step 1: Enable GCE Custom Routes for Pod CIDRs

GCE allows adding custom routes to a VPC that point pod CIDRs to specific VM instances, enabling overlay-free Calico routing.

```bash
# Add a custom route for each node's pod CIDR
# Replace NODE_POD_CIDR and INSTANCE_NAME with actual values
gcloud compute routes create calico-pod-route-node1 \
  --network=default \
  --destination-range=192.168.1.0/26 \
  --next-hop-instance=k8s-node-1 \
  --next-hop-instance-zone=us-central1-a \
  --priority=1000

# Verify the route was created
gcloud compute routes list --filter="name:calico-pod-route*"
```

## Step 2: Configure Calico IPPool for Native GCE Routing

With GCE custom routes in place, configure the Calico IPPool to use native routing (no overlay).

```yaml
# IP pool with no encapsulation — relies on GCE custom routes
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: gce-native-pool
spec:
  cidr: 192.168.0.0/16
  # No overlay needed — GCE VPC routes handle pod traffic
  ipipMode: Never
  vxlanMode: Never
  # natOutgoing enables SNAT for traffic leaving the cluster
  natOutgoing: true
  blockSize: 26
  nodeSelector: all()
```

## Step 3: Optimize MTU for GCE Jumbo Frames

GCE supports jumbo frames with MTU up to 8896 bytes on most VM types. Configure Calico to take advantage of this.

```bash
# Verify the MTU on GCE instance network interface
ip link show ens4 | grep mtu

# Set Felix vethMTU to match GCE jumbo frame MTU
# Use 8846 to account for potential encapsulation headers (50 bytes safety margin)
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"vethMTU": 8846}}'
```

Update the calico-config ConfigMap to apply the jumbo MTU to new pods:

```yaml
# Update calico-config to apply jumbo MTU to pod interfaces
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: calico-system
data:
  # Set MTU for pod veth interfaces to leverage GCE jumbo frames
  veth_mtu: "8846"
```

## Step 4: Configure Felix for GCE Network Performance

Tune Felix parameters for GCE's high-performance network environment.

```bash
# Apply GCE-optimized Felix settings
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "routeSource": "WorkloadIPs",
    "iptablesRefreshInterval": "90s",
    "routeRefreshInterval": "90s",
    "ipv6Support": false,
    "reportingInterval": "0s",
    "prometheusMetricsEnabled": true
  }
}'
```

## Step 5: Configure GCE Firewall Rules for Calico

GCE firewall rules must allow Calico's inter-node communication.

```bash
# Allow BGP traffic between nodes (TCP 179) if using BGP mode
gcloud compute firewall-rules create allow-calico-bgp \
  --network=default \
  --allow=tcp:179 \
  --source-tags=k8s-node \
  --target-tags=k8s-node \
  --description="Allow Calico BGP between Kubernetes nodes"

# Allow Typha (TCP 5473) for large clusters
gcloud compute firewall-rules create allow-calico-typha \
  --network=default \
  --allow=tcp:5473 \
  --source-tags=k8s-node \
  --target-tags=k8s-node \
  --description="Allow Calico Typha communication"
```

## Best Practices

- Use GCE custom routes for overlay-free pod networking — it reduces latency and CPU overhead
- Leverage GCE jumbo frames by setting MTU to 8846 or higher based on your VM type
- Enable Calico Prometheus metrics and integrate with Google Cloud Monitoring
- Use GCP network tags consistently with Calico node selectors for policy enforcement
- Run `calicoctl node status` after MTU changes to verify tunnels are healthy
- Place Typha replicas on dedicated nodes in large GCE clusters (50+ nodes)

## Conclusion

Self-managed Kubernetes on GCE with properly tuned Calico achieves excellent networking performance by leveraging GCE's native routing capabilities and jumbo frame support. Configuring overlay-free routing, optimizing MTU for GCE's network, and tuning Felix parameters produces a production-ready Calico deployment that fully utilizes GCE's high-performance global network infrastructure.
