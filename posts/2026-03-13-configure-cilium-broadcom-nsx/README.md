# Configure Cilium with Broadcom NSX

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, EBPF

Description: Learn how to configure Cilium to work alongside Broadcom NSX (formerly VMware NSX-T) for Kubernetes clusters running on NSX-managed infrastructure, enabling both NSX and eBPF-based networking...

---

## Introduction

Broadcom NSX (formerly VMware NSX-T) provides software-defined networking for vSphere-based infrastructure. When running Kubernetes on NSX-managed environments, you can deploy Cilium as the Kubernetes CNI on top of NSX's virtual networking, combining NSX's network virtualization with Cilium's eBPF-based policy enforcement and observability.

In this configuration, NSX handles the underlay networking - creating logical switches, routers, and segments for VM and node connectivity - while Cilium manages pod networking, network policy, and observability within the Kubernetes cluster. The two systems operate at different layers and complement each other.

This guide covers the integration points between Cilium and NSX, and how to configure Cilium for optimal operation in NSX-managed environments.

## Prerequisites

- Kubernetes cluster nodes running on VMware VMs managed by NSX
- NSX-T 3.x or NSX 4.x configured with logical segments for node connectivity
- Cilium CLI and `kubectl` available
- Access to NSX Manager for network configuration

## Step 1: Prepare NSX Network Configuration for Kubernetes

Configure NSX components required for the Kubernetes cluster.

```bash
# NSX configuration steps (performed in NSX Manager UI or API):
# 1. Create a Logical Segment for Kubernetes nodes
# 2. Create a Tier-1 Gateway for cluster traffic
# 3. Configure NAT rules for pod egress (if using Cilium with NAT)
# 4. Set MTU on the logical segment to accommodate VXLAN overhead
#    Recommended: Set segment MTU to 1600+ to allow for overlay headers

# Verify NSX logical segment is reachable from Kubernetes nodes
ping <nsx-gateway-ip>

# Check node-to-node connectivity (essential for Cilium)
# From node1: ping <node2-ip>
```

## Step 2: Install Cilium with NSX-Compatible Configuration

Deploy Cilium with settings appropriate for NSX-managed networks.

```bash
# Install Cilium using Helm with NSX-compatible settings
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with VXLAN disabled (NSX provides L2 between nodes)
# and with appropriate MTU settings for NSX overlay networks
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set tunnel=disabled \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.244.0.0/16" \
  --set mtu=1400 \
  --set nativeRoutingCIDR="10.0.0.0/8"
```

## Step 3: Configure Cilium for NSX Segment MTU

NSX overlays add header overhead - configure Cilium's MTU accordingly.

```yaml
# cilium-configmap-nsx.yaml
# Adjust Cilium MTU settings for NSX overlay networks
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Set MTU below NSX segment MTU to account for encapsulation headers
  # NSX VXLAN adds ~50 bytes; set Cilium MTU conservatively
  mtu: "1400"
  # Use native routing since NSX provides L2/L3 connectivity between nodes
  tunnel: "disabled"
  # Enable native routing for pod-to-pod traffic
  auto-direct-node-routes: "true"
```

```bash
# Apply the ConfigMap and restart Cilium DaemonSet
kubectl apply -f cilium-configmap-nsx.yaml
kubectl -n kube-system rollout restart daemonset/cilium

# Verify Cilium is healthy after restart
cilium status
```

## Step 4: Verify Pod-to-Pod Connectivity Through NSX

Test that pods can communicate across nodes via NSX segments.

```bash
# Deploy test pods on different nodes
kubectl run pod-node1 --image=busybox \
  --overrides='{"spec":{"nodeName":"k8s-node-1"}}' -- sleep 3600

kubectl run pod-node2 --image=busybox \
  --overrides='{"spec":{"nodeName":"k8s-node-2"}}' -- sleep 3600

# Test cross-node pod connectivity through NSX
POD2_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- ping -c 3 $POD2_IP

# Run Cilium connectivity test
cilium connectivity test
```

## Step 5: Apply Cilium Network Policies

Enforce Kubernetes network policies using Cilium's eBPF engine on NSX infrastructure.

```yaml
# nsx-cilium-policy.yaml
# CiliumNetworkPolicy that works transparently with NSX networking
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

```bash
# Apply the policy
kubectl apply -f nsx-cilium-policy.yaml

# Verify policy enforcement using Hubble
cilium hubble enable
hubble observe --namespace production --follow
```

## Best Practices

- Set Cilium's MTU to at least 100 bytes below the NSX segment's configured MTU to prevent fragmentation
- Use native routing mode (tunnel=disabled) when NSX provides full L3 reachability between all nodes
- Monitor both NSX flow data and Hubble flows to get a complete picture of traffic in hybrid environments
- Coordinate MTU settings with the NSX network team - mismatched MTU causes silent packet drops
- Test connectivity after every NSX segment or gateway configuration change before deploying workloads

## Conclusion

Cilium and Broadcom NSX work together effectively, with NSX providing the underlay network infrastructure and Cilium delivering eBPF-based policy enforcement and observability at the Kubernetes pod level. By configuring appropriate MTU settings and using native routing mode, you achieve efficient pod networking with the full Cilium feature set operating on top of NSX-managed infrastructure.
