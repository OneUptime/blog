# Configure Calico on Self-Managed GCE Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, GCE, Google Cloud, Self-Managed

Description: A guide to deploying Calico on a self-managed Kubernetes cluster running on Google Compute Engine, with network configuration optimized for GCE's VPC networking.

---

## Introduction

Google Compute Engine (GCE) provides a flexible infrastructure for self-managed Kubernetes clusters. Unlike GKE which comes with managed networking, GCE VMs give you full control over the CNI plugin and networking configuration.

Calico on GCE can leverage GCE's native routing capabilities. Because GCE VPCs support custom static routes, you can configure Calico without encapsulation by advertising pod CIDRs as GCE routes - eliminating the overlay networking overhead. Alternatively, VXLAN encapsulation works seamlessly when you don't have permission to manage GCE routes.

This guide covers both approaches: encapsulated Calico for simplicity and non-encapsulated Calico with GCE route programming for performance.

## Prerequisites

- GCE VMs with Ubuntu 22.04 (1 control plane, 2+ workers) in the same VPC
- GCE Firewall rules configured to allow cluster traffic
- kubeadm, kubelet, and kubectl installed
- Google Cloud SDK (`gcloud`) for firewall configuration

## Step 1: Configure GCE Firewall Rules

Set up the firewall rules required for Calico.

```bash
# Get your VPC network name
NETWORK_NAME="kubernetes-network"
PROJECT="my-gcp-project"

# Allow all traffic within the cluster (internal)
gcloud compute firewall-rules create allow-internal-cluster \
  --project $PROJECT \
  --network $NETWORK_NAME \
  --allow tcp,udp,icmp \
  --source-ranges 10.0.0.0/8

# Allow Calico VXLAN (if using VXLAN mode)
gcloud compute firewall-rules create allow-calico-vxlan \
  --project $PROJECT \
  --network $NETWORK_NAME \
  --allow udp:4789 \
  --source-ranges 10.0.0.0/8
```

## Step 2: Disable GCE Source/Destination Check (for BGP mode)

To use Calico without encapsulation (routing mode), disable IP forwarding checks.

```bash
# Get instance names
CONTROL_PLANE_INSTANCE="k8s-control-plane"
WORKER_INSTANCES=("k8s-worker-1" "k8s-worker-2")
ZONE="us-central1-a"

# GCE VMs have IP forwarding disabled by default - enable it for Kubernetes
# This is done when creating the instance (--can-ip-forward flag)
# Or can be enabled on existing instances via:
gcloud compute instances describe $CONTROL_PLANE_INSTANCE \
  --zone $ZONE \
  --format="get(canIpForward)"

# Create new instances with IP forwarding enabled:
gcloud compute instances create k8s-control-plane \
  --project $PROJECT \
  --zone $ZONE \
  --machine-type n2-standard-2 \
  --image-family ubuntu-2204-lts \
  --image-project ubuntu-os-cloud \
  --can-ip-forward
```

## Step 3: Initialize Kubernetes

Bootstrap the control plane with kubeadm.

```bash
# On the control plane VM - initialize with pod CIDR
INTERNAL_IP=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip" \
  -H "Metadata-Flavor: Google")

sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=$INTERNAL_IP

# Configure kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 4: Install Calico with GCE-Appropriate Configuration

Deploy Calico with VXLAN encapsulation for simplicity, or without for performance.

```yaml
# calico-gce-installation.yaml
# Calico for self-managed GCE - using VXLAN for simplicity
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      # Match the kubeadm pod CIDR
      cidr: 192.168.0.0/16
      # VXLAN works without GCE custom routes
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Apply the GCE-configured installation
kubectl apply -f calico-gce-installation.yaml

# Wait for Calico to be ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=10m
```

## Step 5: (Optional) Configure Non-Encapsulated Routing with GCE Routes

For production clusters, configure Calico to use GCE's native routing without encapsulation.

```bash
# If using BGP with GCE routes (no encapsulation):
# 1. Each node must have a GCE static route for its pod CIDR
# 2. Update Calico installation to use no encapsulation

# After nodes join, create GCE routes for each node's pod CIDR
# Get the pod CIDR assigned to each node
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Create a GCE route for each node's pod CIDR
gcloud compute routes create pod-route-worker-1 \
  --project $PROJECT \
  --network $NETWORK_NAME \
  --destination-range "192.168.1.0/24" \
  --next-hop-instance "k8s-worker-1" \
  --next-hop-instance-zone $ZONE
```

## Best Practices

- Enable IP forwarding (`--can-ip-forward`) on all GCE instances at creation time - it cannot be changed later
- Use VXLAN for simpler deployments and GCE static routes for latency-sensitive workloads
- Apply GCE firewall rules before initializing the cluster to ensure node join succeeds
- Tag your GCE instances with a cluster tag and use it in firewall rules for maintainability
- Use Google Cloud Monitoring to track network metrics and detect Calico issues early

## Conclusion

Self-managed Kubernetes on GCE with Calico offers a powerful and flexible networking stack. Whether you use VXLAN encapsulation for simplicity or native GCE routing for performance, Calico provides the policy engine and IPAM capabilities needed for production workloads. The combination of GCE's reliable infrastructure with Calico's full feature set gives you a networking foundation that scales confidently.
