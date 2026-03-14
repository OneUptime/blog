# Troubleshoot Calico on Self-Managed GCE Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, GCE, Google Cloud, Self-Managed

Description: A guide to diagnosing and resolving networking issues when running Calico on self-managed Kubernetes clusters deployed on Google Compute Engine (GCE) instances.

---

## Introduction

Self-managed Kubernetes on GCE with Calico provides full control over your networking stack on Google Cloud. Unlike GKE's managed environment, self-managed clusters give you freedom to configure Calico however you need, but also require you to manage GCE-specific networking requirements.

GCE networking differs from AWS and Azure in important ways: GCE uses software-defined networking with no concept of source/destination checks, but firewall rules must explicitly allow Calico's protocols, and GCE's network routes can be used to enable native pod routing without overlays.

## Prerequisites

- Self-managed Kubernetes cluster on GCE
- `kubectl` and `calicoctl` installed
- Google Cloud SDK (`gcloud`) configured with project access
- Access to GCE Firewall rules

## Step 1: Configure GCE Firewall Rules for Calico

Create firewall rules to allow Calico's required protocols between nodes.

```bash
# Create a firewall rule allowing IPIP (protocol 4) between nodes
gcloud compute firewall-rules create allow-calico-ipip \
  --network <network-name> \
  --allow tcp:179,udp:4789,udp:5473,protocol:4 \
  --source-tags kubernetes-node \
  --target-tags kubernetes-node \
  --description "Allow Calico BGP, VXLAN, Typha, and IPIP between nodes"

# Verify the firewall rule is created
gcloud compute firewall-rules describe allow-calico-ipip
```

## Step 2: Check Calico Status on GCE Nodes

Verify Calico components are running correctly.

```bash
# Check Calico DaemonSet status
kubectl get daemonset -n kube-system calico-node

# Check node pod health
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Inspect logs for a failing node pod
kubectl logs -n kube-system <calico-node-pod>

# Check BGP status
calicoctl node status
```

## Step 3: Leverage GCE Routes for Native Pod Routing

GCE supports custom routes that can be used for overlay-free pod routing.

```bash
# For BGP mode with no overlay, add GCE routes for pod CIDRs
# This allows pods to communicate natively without IPIP or VXLAN

# Get pod CIDR for a specific node
NODE_POD_CIDR=$(kubectl get node <node-name> -o jsonpath='{.spec.podCIDR}')
NODE_NETWORK=$(kubectl get node <node-name> -o jsonpath='{.status.addresses[0].address}')

# Create a GCE route for this node's pod CIDR
gcloud compute routes create pod-route-<node-name> \
  --network <network-name> \
  --destination-range ${NODE_POD_CIDR} \
  --next-hop-instance <gce-instance-name> \
  --next-hop-instance-zone <zone>
```

## Step 4: Disable Overlay Encapsulation for GCE Route-Based Networking

With GCE custom routes, you can run Calico without any overlay.

```yaml
# ippool-no-overlay-gce.yaml - IP pool without overlay for GCE route-based networking
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  # Disable both IPIP and VXLAN - rely on GCE routes
  ipipMode: Never
  vxlanMode: Never
  # Disable NAT since routes handle routing
  natOutgoing: false
```

```bash
calicoctl apply -f ippool-no-overlay-gce.yaml
```

## Step 5: Validate Cross-Node Pod Connectivity

Confirm pods can communicate across GCE instances.

```bash
# Schedule pods on different nodes and test connectivity
kubectl run test-pod-1 --image=busybox --overrides='{"spec":{"nodeName":"<node-1>"}}' -- sleep 3600
kubectl run test-pod-2 --image=busybox --overrides='{"spec":{"nodeName":"<node-2>"}}' -- sleep 3600

POD2_IP=$(kubectl get pod test-pod-2 -o jsonpath='{.status.podIP}')

# Test connectivity
kubectl exec test-pod-1 -- ping -c 3 ${POD2_IP}

# Check routing path (should go through GCE route if configured)
kubectl exec test-pod-1 -- traceroute ${POD2_IP}
```

## Best Practices

- Create GCE firewall rules before deploying Calico-nodes need to communicate during initialization
- Use GCE custom routes for overlay-free networking to achieve the best performance
- Apply GCE instance tags consistently to simplify firewall rule management
- Monitor GCE route count-there is a limit per VPC network (250 routes by default)
- Test cross-zone connectivity explicitly, as GCE zones are separate fault domains

## Conclusion

Self-managed Calico on GCE benefits from GCE's flexible networking model, including the ability to create custom routes that eliminate the need for overlay encapsulation. By configuring appropriate firewall rules and optionally using GCE routes for pod routing, you can build a high-performance Calico networking configuration on Google Cloud.
