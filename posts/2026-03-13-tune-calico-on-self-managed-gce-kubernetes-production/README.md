# Tune Calico on Self-Managed GCE Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, GCE, Google Cloud, Self-Managed

Description: Learn how to tune Calico networking on self-managed Kubernetes clusters running on Google Compute Engine, leveraging GCE's network capabilities for optimal production performance.

---

## Introduction

Google Compute Engine provides a high-performance global network with features like jumbo frames and custom routing that Calico can leverage for excellent Kubernetes networking. Self-managed Kubernetes clusters on GCE have the flexibility to configure Calico optimally for the GCE network model, which differs significantly from AWS and Azure.

GCE's software-defined network supports custom routes at the VPC level, making it possible to configure Calico without any overlay encapsulation by routing pod CIDRs directly through the GCE VPC routing table. This native routing approach eliminates VXLAN or IPIP overhead and maximizes throughput for inter-node pod traffic.

This guide covers GCE-specific Calico tuning, including native routing configuration, MTU optimization for GCE's 8896-byte jumbo frame support, IPAM topology awareness, and Felix parameters suited to GCE's networking characteristics.

## Prerequisites

- Self-managed Kubernetes cluster on GCE instances (kubeadm, kops, or GKE-compatible tooling)
- Calico v3.x installed
- `calicoctl` v3.x configured
- `gcloud` CLI with compute.admin permissions
- `kubectl` with cluster-admin access
- GCE nodes created with IP forwarding enabled (`--can-ip-forward`) so they can act as route next hops for pod CIDRs
- GCE VPC route quotas sized for one route per Calico IPAM block or node pod CIDR

## Step 1: Enable GCE Custom Routes for Pod CIDRs

GCE allows adding custom routes to a VPC that point pod CIDRs to specific VM instances, enabling overlay-free Calico routing.

```bash
# Add a custom route for each node's pod CIDR

# Replace NODE_POD_CIDR and INSTANCE_NAME with actual values.
# The next-hop instance must have been created with --can-ip-forward.
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
# IP pool with no encapsulation - relies on GCE custom routes
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: gce-native-pool
spec:
  cidr: 192.168.0.0/16
  # No overlay needed - GCE VPC routes handle pod traffic
  ipipMode: Never
  vxlanMode: Never
  # natOutgoing enables SNAT for traffic leaving the cluster
  natOutgoing: true
  blockSize: 26
  nodeSelector: all()
```

## Step 3: Optimize MTU for GCE

GCE VPC networks can use MTU values such as 1460, 1500, or jumbo frames up to 8896 bytes depending on the network configuration and VM support. Configure Calico to use the actual VPC/NIC MTU, and only subtract encapsulation overhead if you enable VXLAN, IP-in-IP, or WireGuard.

```bash
# Verify the MTU on the interface used for node egress
ip route get 8.8.8.8
ip link show <interface-from-route-output>

# For operator-based installs, set Calico MTU to the VPC/NIC MTU for no-overlay routing.
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":8896}}}'
```

For manifest-based installs, update the `calico-config` ConfigMap to apply the MTU to new pods:

```yaml
# Update calico-config to apply jumbo MTU to pod interfaces
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: kube-system
data:
  # Set to the VPC/NIC MTU for no-overlay routing; use 1460 or 1500 if your VPC is not jumbo-frame enabled.
  veth_mtu: "8896"
```

## Step 4: Configure Felix for GCE Network Performance

Tune Felix parameters for GCE's high-performance network environment.

```bash
# Apply GCE-optimized Felix settings
calicoctl patch felixconfiguration default --patch='{
  "spec": {
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

- Use GCE custom routes for overlay-free pod networking - it reduces latency and CPU overhead
- Leverage GCE jumbo frames only when the VPC and VM NIC MTU are configured for jumbo frames; use the path MTU as the Calico MTU for no-overlay routing
- Enable Calico Prometheus metrics and integrate with Google Cloud Monitoring
- Use GCP network tags consistently with Calico node selectors for policy enforcement
- Restart Calico node pods after manifest-based MTU changes and recreate workloads so new pod veth interfaces get the updated MTU
- Place Typha replicas on dedicated nodes in large GCE clusters (50+ nodes)

## Conclusion

Self-managed Kubernetes on GCE with properly tuned Calico achieves excellent networking performance by leveraging GCE's native routing capabilities and jumbo frame support. Configuring overlay-free routing, optimizing MTU for GCE's network, and tuning Felix parameters produces a production-ready Calico deployment that fully utilizes GCE's high-performance global network infrastructure.
